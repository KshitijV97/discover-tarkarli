import { describe, expect, it, beforeEach } from "vitest";
import { setupTestDb } from "@/test/integration/harness";
import { makeRoom, setSetting, NOW, istTime, guest, withoutPaymentKeys } from "@/test/integration/factories";
import { createBooking, getBookingById, updateBookingMeals, BookingError } from "./bookings";
import { getAvailableRoomIds } from "./rooms-repo";
import { getSettings } from "./settings-repo";

const t = setupTestDb();
beforeEach(() => withoutPaymentKeys()); // bookings confirm instantly (Mode A)

const book = (roomId: string, checkIn: string, checkOut: string, extra: Partial<Parameters<typeof createBooking>[0]> = {}, now = NOW) =>
  createBooking({ checkIn, checkOut, rooms: [{ roomId, guests: 2 }], meals: [], guest, ...extra }, now);

const idOf = async (reference: string) =>
  (await t.sql<{ id: string }[]>`select id from bookings where reference = ${reference}`)[0].id;

describe("no double-booking", () => {
  it("[smoke] TC-BKG-07 second booking of the same room and nights is rejected as unavailable", async () => {
    const room = await makeRoom(t.sql);
    await book(room, "2027-02-01", "2027-02-03");
    await expect(book(room, "2027-02-02", "2027-02-04")).rejects.toMatchObject({ code: "UNAVAILABLE" });
    const [{ n }] = await t.sql<{ n: number }[]>`select count(*)::int as n from bookings`;
    expect(n).toBe(1);
  });

  it("[sanity] TC-BKG-07 two simultaneous requests for one room: exactly one wins", async () => {
    const room = await makeRoom(t.sql);
    const results = await Promise.allSettled([
      book(room, "2027-02-01", "2027-02-03"),
      book(room, "2027-02-01", "2027-02-03"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(BookingError);
    expect(rejected.reason.code).toBe("UNAVAILABLE");
  });

  it("[sanity] TC-AVL-03 same-day turnover is allowed (check-out day = next check-in day)", async () => {
    const room = await makeRoom(t.sql);
    await book(room, "2027-02-01", "2027-02-03");
    await expect(book(room, "2027-02-03", "2027-02-05")).resolves.toMatchObject({ paymentRequired: false });
  });

  it("the database itself rejects an overlapping row (23P01), whatever the app does", async () => {
    const room = await makeRoom(t.sql);
    const a = await idOf((await book(room, "2027-02-01", "2027-02-03")).reference);
    const [b] = await t.sql<{ id: string }[]>`
      insert into bookings (reference, access_token, guest_name, guest_phone, guest_email, num_guests, check_in, check_out, status)
      values ('GT-RAW001', 'raw-token', 'Raw', '+919876543210', 'raw@example.com', 2, '2027-02-02', '2027-02-04', 'confirmed')
      returning id`;
    await expect(
      t.sql`insert into booking_rooms (booking_id, room_id, guests, price_per_night, gst_rate, stay)
            values (${b.id}, ${room}, 2, 5000, 5, '[2027-02-02,2027-02-04)')`,
    ).rejects.toMatchObject({ code: "23P01" });
    expect(a).toBeTruthy();
  });
});

describe("triggers keep booking_rooms in sync", () => {
  it("[sanity] TC-AVL-02 stay mirrors the booking dates, the booked room leaves search, and cancelling frees it", async () => {
    const room = await makeRoom(t.sql);
    const id = await idOf((await book(room, "2027-03-01", "2027-03-04")).reference);

    const [br] = await t.sql<{ stay: string; blocks_inventory: boolean }[]>`
      select stay::text, blocks_inventory from booking_rooms where booking_id = ${id}`;
    expect(br).toEqual({ stay: "[2027-03-01,2027-03-04)", blocks_inventory: true });
    expect(await getAvailableRoomIds("2027-03-02", "2027-03-03")).not.toContain(room);

    await t.sql`update bookings set status = 'cancelled' where id = ${id}`;
    const [after] = await t.sql<{ blocks_inventory: boolean }[]>`select blocks_inventory from booking_rooms where booking_id = ${id}`;
    expect(after.blocks_inventory).toBe(false);
    expect(await getAvailableRoomIds("2027-03-02", "2027-03-03")).toContain(room);
    await expect(book(room, "2027-03-01", "2027-03-04")).resolves.toBeTruthy();
  });

  it("changing booking dates moves the stay range", async () => {
    const room = await makeRoom(t.sql);
    const id = await idOf((await book(room, "2027-03-01", "2027-03-04")).reference);
    await t.sql`update bookings set check_in = '2027-03-10', check_out = '2027-03-12' where id = ${id}`;
    const [br] = await t.sql<{ stay: string }[]>`select stay::text from booking_rooms where booking_id = ${id}`;
    expect(br.stay).toBe("[2027-03-10,2027-03-12)");
  });
});

describe("price snapshots", () => {
  it("[sanity] TC-PRC-06 changing the room price later doesn't change an existing booking", async () => {
    const room = await makeRoom(t.sql, { priceRupees: 6500 });
    const first = await idOf((await book(room, "2027-04-01", "2027-04-03")).reference);
    await t.sql`update rooms set base_price = 9000 where id = ${room}`;

    const old = await getBookingById(first);
    expect(old!.rooms[0].pricePerNight).toBe(650000);
    expect(old!.quote.total).toBe(1365000); // ₹13,000 + 5% GST

    const second = await idOf((await book(room, "2027-04-10", "2027-04-12")).reference);
    expect((await getBookingById(second))!.rooms[0].pricePerNight).toBe(900000);
  });

  it("[sanity] TC-MEAL-07 changing the dinner price keeps booked dinners at the old price", async () => {
    const room = await makeRoom(t.sql);
    const { reference } = await book(room, "2027-04-01", "2027-04-03", {
      meals: [{ date: "2027-04-01", mealType: "dinner", quantity: 2 }],
    });
    const id = await idOf(reference);
    await setSetting(t.sql, "meals", { dinnerPrice: 700 });

    const detail = await updateBookingMeals({ id }, [
      { date: "2027-04-01", mealType: "dinner", quantity: 2 },
      { date: "2027-04-02", mealType: "dinner", quantity: 2 },
    ], { now: NOW });
    const dinners = detail.meals.filter((m) => m.mealType === "dinner");
    expect(dinners.find((m) => m.date === "2027-04-01")!.unitPrice).toBe(65000); // kept
    expect(dinners.find((m) => m.date === "2027-04-02")!.unitPrice).toBe(70000); // new line, new price
  });
});

describe("meal cutoff at booking time", () => {
  it("[sanity] TC-MEAL-06 can't add tomorrow's dinner after 18:00 today", async () => {
    const room = await makeRoom(t.sql);
    const evening = istTime("2027-01-10", "19:00");
    await expect(
      book(room, "2027-01-11", "2027-01-13", { meals: [{ date: "2027-01-11", mealType: "dinner", quantity: 2 }] }, evening),
    ).rejects.toMatchObject({ code: "INVALID" });
    // The day after tomorrow is still open.
    await expect(
      book(room, "2027-01-11", "2027-01-13", { meals: [{ date: "2027-01-12", mealType: "dinner", quantity: 2 }] }, evening),
    ).resolves.toBeTruthy();
  });
});

describe("settings round-trip", () => {
  it("[smoke] TC-SET-01 a saved deposit % is used for the next booking", async () => {
    await setSetting(t.sql, "deposit", { type: "percent", value: 25 });
    expect((await getSettings()).deposit.value).toBe(25);
    const room = await makeRoom(t.sql, { priceRupees: 6500 });
    const id = await idOf((await book(room, "2027-05-01", "2027-05-03")).reference);
    expect((await getBookingById(id))!.stored.deposit).toBe(341300); // 25% of ₹13,650 = ₹3,412.50, rounded up to ₹3,413
  });

  it("TC-SET-06 an invalid stored group falls back to defaults instead of breaking the site", async () => {
    await setSetting(t.sql, "tax", { foodRate: "lots" });
    expect((await getSettings()).tax.foodRate).toBe(5);
  });
});
