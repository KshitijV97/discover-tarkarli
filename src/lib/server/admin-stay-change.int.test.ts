import { describe, expect, it, beforeEach } from "vitest";
import { setupTestDb } from "@/test/integration/harness";
import { makeRoom, setSetting, NOW, guest, withoutPaymentKeys } from "@/test/integration/factories";
import { addDays, todayInTz } from "@/lib/dates";
import { createBooking, getBookingById, updateBookingMeals } from "./bookings";
import { applyStaffAction, changeBookingStay, recordManualPayment, staffUpdateMeals } from "./admin-bookings";

const t = setupTestDb();
const STAFF = "staff@example.com";
beforeEach(() => withoutPaymentKeys());

async function book(roomId: string, checkIn = "2027-02-01", checkOut = "2027-02-03", meals: Parameters<typeof createBooking>[0]["meals"] = []) {
  const { reference } = await createBooking({ checkIn, checkOut, rooms: [{ roomId, guests: 2 }], meals, guest }, NOW);
  return (await t.sql<{ id: string }[]>`select id from bookings where reference = ${reference}`)[0].id;
}

describe("staff changes dates and rooms", () => {
  it("[smoke] TC-ADM2-19 moving dates keeps the booked room price and carries meals that still fit", async () => {
    await setSetting(t.sql, "notifications", { recipients: { operator: { telegram: ["123456"] } } });
    const room = await makeRoom(t.sql, { priceRupees: 6500 });
    const id = await book(room, "2027-02-01", "2027-02-03", [
      { date: "2027-02-01", mealType: "dinner", quantity: 2 }, { date: "2027-02-02", mealType: "dinner", quantity: 2 },
    ]);
    await t.sql`update rooms set base_price = 9000 where id = ${room}`;

    const d = await changeBookingStay(id, { checkIn: "2027-02-02", checkOut: "2027-02-05", rooms: [{ roomId: room, guests: 2 }] }, STAFF, NOW);
    expect(d.checkIn).toBe("2027-02-02");
    expect(d.rooms[0].pricePerNight).toBe(650000); // snapshot kept
    expect(d.meals.filter((m) => m.mealType === "dinner").map((m) => m.date)).toEqual(["2027-02-02"]); // 1 Feb dinner dropped
    expect(d.meals.filter((m) => m.includedFree)).toHaveLength(3); // breakfast for 3 nights
    expect(d.quote.roomSubtotal).toBe(3 * 650000);
    const sent = await t.sql`select 1 from notifications where event = 'booking.updated'`;
    expect(sent.length).toBeGreaterThan(0);
    const [a] = await t.sql<{ action: string }[]>`select action from admin_audit_log where action = 'booking.change'`;
    expect(a).toBeTruthy();
  });

  it("[sanity] TC-ADM2-20 adding a room prices it today; a room that's taken is refused and nothing changes", async () => {
    const a = await makeRoom(t.sql, { priceRupees: 6500 });
    const b = await makeRoom(t.sql, { priceRupees: 4000 });
    const id = await book(a);
    await book(b, "2027-02-02", "2027-02-04"); // someone else has room B on 2 Feb

    await expect(changeBookingStay(id, { checkIn: "2027-02-01", checkOut: "2027-02-03", rooms: [{ roomId: a, guests: 2 }, { roomId: b, guests: 1 }] }, STAFF, NOW))
      .rejects.toMatchObject({ code: "UNAVAILABLE" });
    const unchanged = await getBookingById(id);
    expect(unchanged!.rooms.map((r) => r.roomId)).toEqual([a]);
    expect((await t.sql`select 1 from booking_rooms where booking_id = ${id}`).length).toBe(1);

    const c = await makeRoom(t.sql, { priceRupees: 3000 });
    const d = await changeBookingStay(id, { checkIn: "2027-02-01", checkOut: "2027-02-03", rooms: [{ roomId: a, guests: 2 }, { roomId: c, guests: 1 }] }, STAFF, NOW);
    expect(d.rooms.map((r) => r.pricePerNight).sort()).toEqual([300000, 650000]);
    expect(d.numGuests).toBe(3);
  });

  it("[sanity] TC-ADM2-21 extending an in-house stay re-opens the balance if it was fully paid", async () => {
    const room = await makeRoom(t.sql, { priceRupees: 6500 });
    const id = await book(room, "2027-01-10", "2027-01-12");
    await applyStaffAction(id, "check_in", STAFF, NOW);
    await recordManualPayment(id, { amount: 1365000, method: "upi" }, STAFF);
    expect((await t.sql<{ balance_paid: boolean }[]>`select balance_paid from bookings where id = ${id}`)[0].balance_paid).toBe(true);

    await changeBookingStay(id, { checkIn: "2027-01-10", checkOut: "2027-01-13", rooms: [{ roomId: room, guests: 2 }] }, STAFF, NOW);
    const [b] = await t.sql<{ balance_paid: boolean; status: string; total_amount: string }[]>`select balance_paid, status, total_amount from bookings where id = ${id}`;
    expect(b).toEqual({ balance_paid: false, status: "checked_in", total_amount: "20475.00" });
    await expect(changeBookingStay(id, { checkIn: "2027-01-11", checkOut: "2027-01-13", rooms: [{ roomId: room, guests: 2 }] }, STAFF, NOW))
      .rejects.toMatchObject({ code: "INVALID" });
  });

  it("refuses more guests than a room sleeps", async () => {
    const room = await makeRoom(t.sql, { maxOccupancy: 2 });
    const id = await book(room);
    await expect(changeBookingStay(id, { checkIn: "2027-02-01", checkOut: "2027-02-03", rooms: [{ roomId: room, guests: 3 }] }, STAFF, NOW))
      .rejects.toMatchObject({ code: "INVALID" });
  });
});

describe("staff meal edits", () => {
  it("[sanity] TC-ADM2-22 tonight's dinner is locked for the guest but staff can still change it", async () => {
    const today = todayInTz("Asia/Kolkata"); // real clock: today's dinner locked at 18:00 yesterday
    const room = await makeRoom(t.sql);
    const { reference, accessToken } = await createBooking({ checkIn: today, checkOut: addDays(today, 2), rooms: [{ roomId: room, guests: 2 }], meals: [], guest });
    const [{ id }] = await t.sql<{ id: string }[]>`select id from bookings where reference = ${reference}`;
    const dinner = [{ date: today, mealType: "dinner" as const, quantity: 2 }];

    await expect(updateBookingMeals({ token: accessToken }, dinner)).rejects.toMatchObject({ code: "INVALID" });
    const d = await staffUpdateMeals(id, dinner, STAFF);
    expect(d.meals.find((m) => m.mealType === "dinner")).toMatchObject({ date: today, quantity: 2 });
  });
});
