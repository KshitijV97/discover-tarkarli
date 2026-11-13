import "server-only";
import { db } from "./db";
import { writeAudit } from "./audit-repo";
import { paiseToRupeesString, rupeesToPaise } from "@/lib/money";
import type { MenuInput, RoomInput } from "@/lib/admin/catalog-forms";

/** Admin reads and writes for rooms and menu items (inactive ones included). */

export interface AdminRoom extends RoomInput { id: string; upcomingBookings: number }
export interface AdminMenuItem extends MenuInput { id: string }

export class CatalogError extends Error {
  constructor(public field: string, message: string) { super(message); }
}

export async function listAllRooms(today: string): Promise<AdminRoom[]> {
  const rows = await db()<{ id: string; name: string; slug: string; description: string; base_price: string; max_occupancy: number; photos: string[]; amenities: string[]; sort_order: number; active: boolean; upcoming: number }[]>`
    select r.id, r.name, r.slug, r.description, r.base_price, r.max_occupancy, r.photos, r.amenities, r.sort_order, r.active,
           (select count(*)::int from booking_rooms br join bookings b on b.id = br.booking_id
             where br.room_id = r.id and br.blocks_inventory and b.check_out > ${today}) as upcoming
    from rooms r order by r.sort_order, r.name`;
  return rows.map((r) => ({
    id: r.id, name: r.name, slug: r.slug, description: r.description, basePrice: rupeesToPaise(r.base_price) / 100,
    maxOccupancy: r.max_occupancy, photos: r.photos, amenities: r.amenities, sortOrder: r.sort_order, active: r.active, upcomingBookings: r.upcoming,
  }));
}

export async function getRoomForEdit(id: string, today: string): Promise<AdminRoom | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return (await listAllRooms(today)).find((r) => r.id === id) ?? null;
}

/** Creates (id = null) or updates a room. Returns the id. */
export async function saveRoom(id: string | null, v: RoomInput, actorEmail: string): Promise<string> {
  try {
    return await db().begin(async (tx) => {
      const price = paiseToRupeesString(Math.round(v.basePrice * 100));
      const [row] = id
        ? await tx<{ id: string }[]>`
            update rooms set name = ${v.name}, slug = ${v.slug}, description = ${v.description}, base_price = ${price},
              max_occupancy = ${v.maxOccupancy}, photos = ${v.photos}, amenities = ${v.amenities}, sort_order = ${v.sortOrder}, active = ${v.active}
            where id = ${id} returning id`
        : await tx<{ id: string }[]>`
            insert into rooms (name, slug, description, base_price, max_occupancy, photos, amenities, sort_order, active)
            values (${v.name}, ${v.slug}, ${v.description}, ${price}, ${v.maxOccupancy}, ${v.photos}, ${v.amenities}, ${v.sortOrder}, ${v.active})
            returning id`;
      if (!row) throw new CatalogError("form", "This room no longer exists.");
      await writeAudit({ actorEmail, action: id ? "room.update" : "room.create", entity: "room", entityId: row.id, detail: { name: v.name, basePrice: v.basePrice, active: v.active } }, tx);
      return row.id;
    });
  } catch (err) {
    if ((err as { code?: string }).code === "23505") throw new CatalogError("slug", "Another room already uses this web address.");
    throw err;
  }
}

export async function listAllMenuItems(): Promise<AdminMenuItem[]> {
  const rows = await db()<{ id: string; name: string; category: string; description: string; price: string; veg: boolean; sort_order: number; active: boolean }[]>`
    select id, name, category, description, price, veg, sort_order, active from menu_items order by category, sort_order, name`;
  return rows.map((r) => ({ id: r.id, name: r.name, category: r.category, description: r.description, price: rupeesToPaise(r.price) / 100, veg: r.veg, sortOrder: r.sort_order, active: r.active }));
}

export async function getMenuItemForEdit(id: string): Promise<AdminMenuItem | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return (await listAllMenuItems()).find((m) => m.id === id) ?? null;
}

export async function saveMenuItem(id: string | null, v: MenuInput, actorEmail: string): Promise<string> {
  return db().begin(async (tx) => {
    const price = paiseToRupeesString(Math.round(v.price * 100));
    const [row] = id
      ? await tx<{ id: string }[]>`
          update menu_items set name = ${v.name}, category = ${v.category}, description = ${v.description}, price = ${price},
            veg = ${v.veg}, sort_order = ${v.sortOrder}, active = ${v.active}
          where id = ${id} returning id`
      : await tx<{ id: string }[]>`
          insert into menu_items (name, category, description, price, veg, sort_order, active)
          values (${v.name}, ${v.category}, ${v.description}, ${price}, ${v.veg}, ${v.sortOrder}, ${v.active}) returning id`;
    if (!row) throw new CatalogError("form", "This dish no longer exists.");
    await writeAudit({ actorEmail, action: id ? "menu_item.update" : "menu_item.create", entity: "menu_item", entityId: row.id, detail: { name: v.name, price: v.price, active: v.active } }, tx);
    return row.id;
  });
}
