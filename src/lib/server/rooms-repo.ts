import "server-only";
import { db } from "./db";
import { rupeesToPaise, type Paise } from "@/lib/money";
import type { ISODate } from "@/lib/dates";

export interface Room {
  id: string;
  name: string;
  slug: string;
  description: string;
  maxOccupancy: number;
  basePrice: Paise;
  photos: string[];
  amenities: string[];
}

interface RoomRow {
  id: string; name: string; slug: string; description: string;
  max_occupancy: number; base_price: string; photos: string[]; amenities: string[];
}

const toRoom = (r: RoomRow): Room => ({
  id: r.id, name: r.name, slug: r.slug, description: r.description,
  maxOccupancy: r.max_occupancy, basePrice: rupeesToPaise(r.base_price),
  photos: r.photos, amenities: r.amenities,
});

export async function listActiveRooms(): Promise<Room[]> {
  const rows = await db()<RoomRow[]>`
    select id, name, slug, description, max_occupancy, base_price, photos, amenities
    from rooms where active order by sort_order, name`;
  return rows.map(toRoom);
}

export async function getRoomsByIds(ids: string[]): Promise<Room[]> {
  if (ids.length === 0) return [];
  const rows = await db()<RoomRow[]>`
    select id, name, slug, description, max_occupancy, base_price, photos, amenities
    from rooms where active and id in ${db()(ids)}`;
  return rows.map(toRoom);
}

/** Room ids that are free for every night of [checkIn, checkOut). */
export async function getAvailableRoomIds(checkIn: ISODate, checkOut: ISODate): Promise<string[]> {
  const sql = db();
  await sql`select expire_stale_bookings()`;
  const rows = await sql<{ id: string }[]>`
    select r.id from rooms r
    where r.active and not exists (
      select 1 from booking_rooms br
      where br.room_id = r.id and br.blocks_inventory
        and br.stay && daterange(${checkIn}::date, ${checkOut}::date, '[)')
    )`;
  return rows.map((r) => r.id);
}

/** For each night in [from, to): how many active rooms are free. */
export async function getNightlyAvailability(from: ISODate, to: ISODate): Promise<{ total: number; free: Record<ISODate, number> }> {
  const sql = db();
  await sql`select expire_stale_bookings()`;
  const rows = await sql<{ night: ISODate; free: number }[]>`
    select d::date as night,
           (select count(*)::int from rooms r
             where r.active and not exists (
               select 1 from booking_rooms br
               where br.room_id = r.id and br.blocks_inventory and br.stay @> d::date)) as free
    from generate_series(${from}::date, ${to}::date - 1, interval '1 day') d`;
  const [{ total }] = await sql<{ total: number }[]>`select count(*)::int as total from rooms where active`;
  return { total, free: Object.fromEntries(rows.map((r) => [r.night, r.free])) };
}
