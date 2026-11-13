import crypto from "node:crypto";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { setupTestDb } from "@/test/integration/harness";
import { makeRoom, setSetting, NOW, guest, withFakePaymentKeys, withoutPaymentKeys } from "@/test/integration/factories";
import { createBooking } from "./bookings";
import { recordPayment } from "./payments";
import { POST as razorpayWebhook } from "@/app/api/webhooks/razorpay/route";

const t = setupTestDb();
beforeAll(() => withFakePaymentKeys()); // bookings start as pending holds (Mode B)
afterAll(() => withoutPaymentKeys());

/** A pending booking with an unpaid deposit order, as startDepositCheckout would leave it. */
async function pendingWithOrder(roomId: string, checkIn = "2027-02-01", checkOut = "2027-02-03") {
  const { reference } = await createBooking({ checkIn, checkOut, rooms: [{ roomId, guests: 2 }], meals: [], guest }, NOW);
  const [b] = await t.sql<{ id: string; deposit_amount: string; status: string }[]>`
    select id, deposit_amount, status from bookings where reference = ${reference}`;
  const orderId = `order_${crypto.randomBytes(6).toString("hex")}`;
  await t.sql`insert into payments (booking_id, kind, provider, amount, currency, status, provider_order_id)
              values (${b.id}, 'deposit', 'razorpay', ${b.deposit_amount}, 'INR', 'created', ${orderId})`;
  return { bookingId: b.id, orderId, status: b.status };
}

const count = async (q: Promise<{ n: number }[]>) => (await q)[0].n;

describe("payments are idempotent", () => {
  it("[smoke] TC-PAY-04 recording the same payment twice confirms once", async () => {
    const room = await makeRoom(t.sql);
    const { bookingId, orderId, status } = await pendingWithOrder(room);
    expect(status).toBe("pending");

    const first = await recordPayment({ provider: "razorpay", orderId, paymentId: "pay_1" });
    const second = await recordPayment({ provider: "razorpay", orderId, paymentId: "pay_1" });
    expect(first.outcome).toBe("confirmed");
    expect(second.outcome).toBe("already_paid");

    const [b] = await t.sql<{ status: string; deposit_paid: boolean; expires_at: Date | null }[]>`
      select status, deposit_paid, expires_at from bookings where id = ${bookingId}`;
    expect(b).toEqual({ status: "confirmed", deposit_paid: true, expires_at: null });
    expect(await count(t.sql`select count(*)::int as n from payments where status = 'paid'`)).toBe(1);
  });

  it("[sanity] TC-PAY-06 TC-NTF-02 browser callback and webhook at the same moment: one payment, one confirmation per recipient", async () => {
    const room = await makeRoom(t.sql);
    const { orderId } = await pendingWithOrder(room);
    const outcomes = await Promise.all([
      recordPayment({ provider: "razorpay", orderId, paymentId: "pay_2" }),
      recordPayment({ provider: "razorpay", orderId, paymentId: "pay_2" }),
    ]);
    expect(outcomes.map((o) => o.outcome).sort()).toEqual(["already_paid", "confirmed"]);

    const rows = await t.sql<{ audience: string; channel: string; n: number }[]>`
      select audience, channel, count(*)::int as n from notifications
      where event = 'booking.confirmed' group by audience, channel`;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.n === 1)).toBe(true);
  });

  it("an unknown order is reported, not invented", async () => {
    expect((await recordPayment({ provider: "razorpay", orderId: "order_nope", paymentId: "pay_x" })).outcome).toBe("unknown_order");
  });
});

describe("late payments", () => {
  const expire = (id: string) =>
    t.sql`update bookings set expires_at = now() - interval '1 minute' where id = ${id}`.then(() => t.sql`select expire_stale_bookings()`);

  it("[sanity] TC-PAY-07 paid after the hold expired, room still free: booking is confirmed", async () => {
    const room = await makeRoom(t.sql);
    const { bookingId, orderId } = await pendingWithOrder(room);
    await expire(bookingId);
    expect((await recordPayment({ provider: "razorpay", orderId, paymentId: "pay_3" })).outcome).toBe("confirmed");
    const [b] = await t.sql<{ status: string }[]>`select status from bookings where id = ${bookingId}`;
    expect(b.status).toBe("confirmed");
  });

  it("[sanity] TC-PAY-08 paid after the hold expired, room taken: conflict, no double-booking", async () => {
    // payment.conflict goes to the operator only, so give the operator a number.
    await setSetting(t.sql, "notifications", { recipients: { operator: { whatsapp: ["+919800000000"] } } });
    const room = await makeRoom(t.sql);
    const late = await pendingWithOrder(room);
    await expire(late.bookingId);
    const other = await pendingWithOrder(room); // another guest takes the room
    await recordPayment({ provider: "razorpay", orderId: other.orderId, paymentId: "pay_other" });

    const res = await recordPayment({ provider: "razorpay", orderId: late.orderId, paymentId: "pay_late" });
    expect(res.outcome).toBe("conflict");

    const [p] = await t.sql<{ status: string }[]>`select status from payments where provider_order_id = ${late.orderId}`;
    expect(p.status).toBe("conflict");
    const [b] = await t.sql<{ status: string; deposit_paid: boolean }[]>`select status, deposit_paid from bookings where id = ${late.bookingId}`;
    expect(b).toEqual({ status: "expired", deposit_paid: true });
    expect(await count(t.sql`
      select count(*)::int as n from booking_rooms where room_id = ${room} and blocks_inventory`)).toBe(1);
    expect(await count(t.sql`
      select count(*)::int as n from notifications where event = 'payment.conflict' and audience = 'operator'`)).toBeGreaterThan(0);
  });
});

describe("Razorpay webhook", () => {
  const post = (body: string, signature: string | null) =>
    razorpayWebhook(new NextRequest("http://localhost/api/webhooks/razorpay", {
      method: "POST", body, headers: signature ? { "x-razorpay-signature": signature } : {},
    }));
  const sign = (body: string) => crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!).update(body).digest("hex");

  const capturedEvent = (orderId: string, paymentId: string) => JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: paymentId, order_id: orderId, method: "upi", status: "captured" } } },
  });

  it("[smoke] TC-PAY-05 a bad signature is rejected and nothing is recorded", async () => {
    const room = await makeRoom(t.sql);
    const { orderId } = await pendingWithOrder(room);
    const body = capturedEvent(orderId, "pay_forged");
    expect((await post(body, "bad-signature")).status).toBe(400);
    expect((await post(body, null)).status).toBe(400);
    expect(await count(t.sql`select count(*)::int as n from payments where status = 'paid'`)).toBe(0);
  });

  it("[sanity] a correctly signed payment.captured confirms the booking", async () => {
    const room = await makeRoom(t.sql);
    const { bookingId, orderId } = await pendingWithOrder(room);
    const body = capturedEvent(orderId, "pay_ok");
    const res = await post(body, sign(body));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, outcome: "confirmed" });
    const [b] = await t.sql<{ status: string }[]>`select status from bookings where id = ${bookingId}`;
    expect(b.status).toBe("confirmed");
  });
});
