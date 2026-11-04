import "server-only";
import { db } from "./db";
import { getSettings } from "./settings-repo";
import { getBookingById } from "./bookings";
import { notify, retryNotifications } from "./notify";
import { addDays, formatDate, todayInTz, type ISODate } from "@/lib/dates";

export async function runDailyJobs() {
  const settings = await getSettings();
  const sql = db();
  const today = todayInTz(settings.property.timezone);

  const [{ expired }] = await sql<{ expired: number }[]>`select expire_stale_bookings() as expired`;

  // Balance reminders N days before check-out.
  let reminders = 0;
  for (const days of settings.notifications.balanceReminderDaysBefore) {
    const checkout = addDays(today, days);
    const rows = await sql<{ id: string }[]>`
      select id from bookings
      where check_out = ${checkout} and status in ('confirmed', 'checked_in') and not balance_paid`;
    for (const r of rows) {
      const booking = await getBookingById(r.id);
      if (!booking || booking.quote.balance <= 0) continue;
      await notify("booking.balance_reminder", { booking, dedupeKey: `balance_reminder:${r.id}:${checkout}:${days}` });
      reminders++;
    }
  }

  // Kitchen: tomorrow's meal counts.
  const tomorrow: ISODate = addDays(today, 1);
  const meals = await sql<{ meal_type: string; reference: string; guest_name: string; rooms: string; quantity: number }[]>`
    select m.meal_type, b.reference, b.guest_name, m.quantity,
           (select string_agg(r.name, ', ') from booking_rooms br join rooms r on r.id = br.room_id where br.booking_id = b.id) as rooms
    from booking_meals m join bookings b on b.id = m.booking_id
    where m.date = ${tomorrow} and m.quantity > 0 and b.status in ('confirmed', 'checked_in', 'pending')
    order by m.meal_type, b.reference`;
  const total = (t: string) => String(meals.filter((m) => m.meal_type === t).reduce((s, m) => s + m.quantity, 0));
  if (meals.length) {
    await notify("kitchen.daily_summary", {
      dedupeKey: `kitchen.daily_summary:${tomorrow}`,
      vars: {
        date: formatDate(tomorrow),
        breakfast: total("breakfast"), lunch: total("lunch"), dinner: total("dinner"),
        detail: meals.map((m) => `${m.meal_type} × ${m.quantity} — ${m.rooms} (${m.guest_name})`).join("\n"),
      },
    });
  }

  const { retried } = await retryNotifications();
  return { today, expired, reminders, kitchenSummaryFor: meals.length ? tomorrow : null, retried };
}
