import { describe, expect, it } from "vitest";
import { setupTestDb } from "@/test/integration/harness";
import { NOW, guest, withoutPaymentKeys } from "@/test/integration/factories";
import { listAllMenuItems, listAllRooms, saveMenuItem, saveRoom } from "./catalog-repo";
import { createBooking, getBookingById } from "./bookings";
import { listActiveRooms } from "./rooms-repo";

const t = setupTestDb();
const ADMIN = "admin@example.com";
const room = { name: "Sea Breeze", slug: "sea-breeze", description: "", basePrice: 6500, maxOccupancy: 4, photos: [], amenities: ["AC"], sortOrder: 1, active: true };

describe("rooms editor", () => {
  it("[sanity] TC-ADM2-14 create and edit a room; price edits don't touch existing bookings", async () => {
    withoutPaymentKeys();
    const id = await saveRoom(null, room, ADMIN);
    const { reference } = await createBooking({ checkIn: "2027-02-01", checkOut: "2027-02-03", rooms: [{ roomId: id, guests: 2 }], meals: [], guest }, NOW);
    await saveRoom(id, { ...room, basePrice: 9000 }, ADMIN);

    const [b] = await t.sql<{ id: string }[]>`select id from bookings where reference = ${reference}`;
    expect((await getBookingById(b.id))!.rooms[0].pricePerNight).toBe(650000);
    const [listed] = await listAllRooms("2027-01-10");
    expect(listed).toMatchObject({ basePrice: 9000, upcomingBookings: 1 });
    const audit = await t.sql<{ action: string }[]>`select action from admin_audit_log order by created_at`;
    expect(audit.map((a) => a.action)).toEqual(["room.create", "room.update"]);
  });

  it("[sanity] TC-ADM2-15 a hidden room leaves the public list; a duplicate web address is refused", async () => {
    const id = await saveRoom(null, room, ADMIN);
    await saveRoom(id, { ...room, active: false }, ADMIN);
    expect(await listActiveRooms()).toHaveLength(0);
    await expect(saveRoom(null, { ...room, name: "Copy" }, ADMIN)).rejects.toMatchObject({ field: "slug" });
  });
});

describe("menu editor", () => {
  it("creates and updates a dish with the price stored in rupees", async () => {
    const id = await saveMenuItem(null, { name: "Solkadhi", category: "Drinks", description: "", price: 120, veg: true, sortOrder: 0, active: true }, ADMIN);
    await saveMenuItem(id, { name: "Solkadhi", category: "Drinks", description: "Kokum and coconut", price: 140, veg: true, sortOrder: 0, active: true }, ADMIN);
    const [item] = await listAllMenuItems();
    expect(item).toMatchObject({ name: "Solkadhi", price: 140, description: "Kokum and coconut" });
    const [{ price }] = await t.sql<{ price: string }[]>`select price from menu_items where id = ${id}`;
    expect(price).toBe("140.00");
  });
});
