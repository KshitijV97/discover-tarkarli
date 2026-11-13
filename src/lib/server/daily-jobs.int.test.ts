import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { setupTestDb } from "@/test/integration/harness";
import { makeRoom, guest, withFakePaymentKeys, withoutPaymentKeys } from "@/test/integration/factories";
import { addDays, todayInTz } from "@/lib/dates";
import { createBooking } from "./bookings";
import { runDailyJobs } from "./daily-jobs";
import { getAvailableRoomIds } from "./rooms-repo";

const t = setupTestDb();
beforeAll(() => withFakePaymentKeys());
afterAll(() => withoutPaymentKeys());

// The daily job works on "today" in the property's timezone, so these tests use real dates.
const today = todayInTz("Asia/Kolkata");

describe("daily jobs", () => {
  it("[smoke] TC-BKG-11 TC-CRN-02 an unpaid hold past its expiry is expired by the cron and the room is free again", async () => {
    const room = await makeRoom(t.sql);
    const checkIn = addDays(today, 20), checkOut = addDays(today, 22);
    const { reference } = await createBooking({ checkIn, checkOut, rooms: [{ roomId: room, guests: 2 }], meals: [], guest });
    expect(await getAvailableRoomIds(checkIn, checkOut)).not.toContain(room);

    await t.sql`update bookings set expires_at = now() - interval '1 minute' where reference = ${reference}`;
    const res = await runDailyJobs();
    expect(res.expired).toBe(1);

    const [b] = await t.sql<{ status: string }[]>`select status from bookings where reference = ${reference}`;
    expect(b.status).toBe("expired");
    expect(await getAvailableRoomIds(checkIn, checkOut)).toContain(room);
  });

  it("[sanity] TC-NTF-07 TC-CRN-03 kitchen summary covers tomorrow's meals and isn't sent twice when the cron runs twice", async () => {
    withoutPaymentKeys(); // confirmed booking
    try {
      const room = await makeRoom(t.sql, { maxOccupancy: 3 });
      const { reference } = await createBooking({
        checkIn: addDays(today, 10), checkOut: addDays(today, 12), rooms: [{ roomId: room, guests: 3 }], meals: [], guest,
      });
      // Put a dinner on tomorrow's date directly, so the test doesn't depend on the time of day it runs.
      await t.sql`insert into booking_meals (booking_id, date, meal_type, quantity, price_at_booking, gst_rate)
                  select id, ${addDays(today, 1)}, 'dinner', 2, 650, 5 from bookings where reference = ${reference}`;

      const first = await runDailyJobs();
      expect(first.kitchenSummaryFor).toBe(addDays(today, 1));
      const countAfterFirst = (await t.sql<{ n: number }[]>`
        select count(*)::int as n from notifications where event = 'kitchen.daily_summary'`)[0].n;

      await runDailyJobs();
      const rows = await t.sql<{ vars: { dinner: string } }[]>`
        select vars from notifications where event = 'kitchen.daily_summary'`;
      expect(rows.length).toBe(countAfterFirst);
      for (const r of rows) expect(r.vars.dinner).toBe("2");
    } finally {
      withFakePaymentKeys();
    }
  });
});
