/** Small data builders for integration tests. They never rely on seed data. */
import type postgres from "postgres";
import { zonedTimeToUtc, type ISODate } from "@/lib/dates";

type Sql = ReturnType<typeof postgres>;

export async function makeRoom(sql: Sql, o: { name?: string; priceRupees?: number; maxOccupancy?: number } = {}) {
  const name = o.name ?? `Room ${Math.random().toString(36).slice(2, 7)}`;
  const [r] = await sql<{ id: string }[]>`
    insert into rooms (name, slug, max_occupancy, base_price)
    values (${name}, ${name.toLowerCase().replace(/\W+/g, "-")}, ${o.maxOccupancy ?? 2}, ${o.priceRupees ?? 5000})
    returning id`;
  return r.id;
}

export async function setSetting(sql: Sql, key: string, value: unknown) {
  await sql`insert into settings (key, value) values (${key}, ${sql.json(value as never)})
            on conflict (key) do update set value = excluded.value`;
}

/** A fixed "now" (10 Jan 2027, 09:00 IST) so dates and cutoffs are deterministic. */
export const NOW = zonedTimeToUtc("2027-01-10", "09:00", "Asia/Kolkata");
export const istTime = (date: ISODate, time: string) => zonedTimeToUtc(date, time, "Asia/Kolkata");

export const guest = { name: "Test Guest", phone: "9876543210", email: "guest@example.com" };

/** Turn on online payments with fake keys (no network: createBooking never calls the provider). */
export function withFakePaymentKeys() {
  process.env.RAZORPAY_KEY_ID = "rzp_test_fake";
  process.env.RAZORPAY_KEY_SECRET = "fake_secret";
  process.env.RAZORPAY_WEBHOOK_SECRET = "fake_webhook_secret";
}
export function withoutPaymentKeys() {
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
}
