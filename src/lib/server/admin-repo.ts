import "server-only";
import { db } from "./db";
import type { ISODate } from "@/lib/dates";
import { rupeesToPaise } from "@/lib/money";
import type { AppSettings, SettingsKey } from "@/lib/settings";

/** Queries and writes used by the admin dashboard. */

export interface AdminBookingRow {
  id: string;
  reference: string;
  guestName: string;
  guestPhone: string;
  numGuests: number;
  checkIn: ISODate;
  checkOut: ISODate;
  status: string;
  total: number; // paise, incl. GST
  deposit: number; // paise
  depositPaid: boolean;
  balancePaid: boolean;
  rooms: string;
}

/** Bookings whose stay overlaps [from, to), newest arrivals first. */
export async function listBookingsInRange(from: ISODate, to: ISODate, limit = 200): Promise<AdminBookingRow[]> {
  const rows = await db()<{
    id: string; reference: string; guest_name: string; guest_phone: string; num_guests: number;
    check_in: ISODate; check_out: ISODate; status: string; total_amount: string; deposit_amount: string;
    deposit_paid: boolean; balance_paid: boolean; rooms: string | null;
  }[]>`
    select b.id, b.reference, b.guest_name, b.guest_phone, b.num_guests, b.check_in, b.check_out, b.status,
           b.total_amount, b.deposit_amount, b.deposit_paid, b.balance_paid,
           (select string_agg(r.name, ', ' order by r.sort_order) from booking_rooms br join rooms r on r.id = br.room_id where br.booking_id = b.id) as rooms
    from bookings b
    where b.check_out > ${from} and b.check_in < ${to}
    order by b.check_in asc, b.created_at desc
    limit ${limit}`;
  return rows.map((r) => ({
    id: r.id, reference: r.reference, guestName: r.guest_name, guestPhone: r.guest_phone, numGuests: r.num_guests,
    checkIn: r.check_in, checkOut: r.check_out, status: r.status, total: rupeesToPaise(r.total_amount),
    deposit: rupeesToPaise(r.deposit_amount), depositPaid: r.deposit_paid, balancePaid: r.balance_paid, rooms: r.rooms ?? "",
  }));
}

export interface DashboardCounts {
  arrivalsToday: number;
  inHouse: number;
  pendingHolds: number;
  arrivalsNext7Days: number;
}

/** Headline numbers for the admin overview. `today` is the property's local date. */
export async function getDashboardCounts(today: ISODate, weekEnd: ISODate): Promise<DashboardCounts> {
  const [row] = await db()<{ arrivals_today: string; in_house: string; pending_holds: string; arrivals_next_7: string }[]>`
    select
      count(*) filter (where check_in = ${today} and status in ('pending', 'confirmed')) as arrivals_today,
      count(*) filter (where status = 'checked_in') as in_house,
      count(*) filter (where status = 'pending') as pending_holds,
      count(*) filter (where check_in > ${today} and check_in <= ${weekEnd} and status in ('pending', 'confirmed')) as arrivals_next_7
    from bookings`;
  return {
    arrivalsToday: Number(row?.arrivals_today ?? 0),
    inHouse: Number(row?.in_house ?? 0),
    pendingHolds: Number(row?.pending_holds ?? 0),
    arrivalsNext7Days: Number(row?.arrivals_next_7 ?? 0),
  };
}

/**
 * Upsert one settings group (one row per group). Callers must validate the
 * value first (`parseGroupForm`), so only typed values reach the table.
 */
export async function saveSettingsGroup<K extends Exclude<SettingsKey, "notifications">>(
  key: K,
  value: AppSettings[K],
): Promise<void> {
  await db()`
    insert into settings (key, value) values (${key}, ${JSON.stringify(value)}::jsonb)
    on conflict (key) do update set value = excluded.value`;
}
