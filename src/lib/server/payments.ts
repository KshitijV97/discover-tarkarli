import "server-only";
import { db } from "./db";
import { getSettings } from "./settings-repo";
import { BookingError, getBookingById } from "./bookings";
import { notify } from "./notify";
import { getPaymentProvider, getProviderByName } from "@/lib/payments";
import type { CheckoutResult, CheckoutSession } from "@/lib/payments/types";
import { rupeesToPaise, formatINR } from "@/lib/money";

export interface DepositCheckout extends CheckoutSession {
  bookingReference: string;
  prefill: { name: string; email: string; contact: string };
  /** Seconds left on the room hold (checkout should close before then). */
  holdSecondsLeft: number | null;
  propertyName: string;
}

/**
 * Starts (or resumes) the online deposit payment for a booking.
 * Re-uses an unpaid order for the same amount so retries don't pile up orders,
 * and extends a pending hold so the guest isn't expired mid-checkout.
 */
export async function startDepositCheckout(token: string): Promise<DepositCheckout> {
  const provider = getPaymentProvider();
  if (!provider) throw new BookingError("LOCKED", "Online payment isn't available right now. Our team will contact you.");
  const settings = await getSettings();
  const sql = db();

  const b = await sql.begin(async (tx) => {
    await tx`select expire_stale_bookings()`;
    const [row] = await tx<{
      id: string; reference: string; status: string; deposit_paid: boolean; deposit_amount: string;
      guest_name: string; guest_email: string; guest_phone: string; expires_at: Date | null;
    }[]>`select id, reference, status, deposit_paid, deposit_amount, guest_name, guest_email, guest_phone, expires_at
         from bookings where access_token = ${token} for update`;
    if (!row) throw new BookingError("NOT_FOUND", "Booking not found.");
    if (row.deposit_paid) throw new BookingError("LOCKED", "The deposit for this booking is already paid.");
    if (row.status === "expired") throw new BookingError("LOCKED", "Your room hold expired before payment. Please make a new booking.");
    if (!["pending", "confirmed"].includes(row.status)) throw new BookingError("LOCKED", `This booking is ${row.status} and can't be paid online.`);
    if (row.status === "pending") {
      const [u] = await tx<{ expires_at: Date }[]>`
        update bookings set expires_at = greatest(expires_at, now() + make_interval(mins => ${settings.booking.holdMinutes}))
        where id = ${row.id} returning expires_at`;
      row.expires_at = u.expires_at;
    }
    return row;
  });

  const amount = rupeesToPaise(b.deposit_amount);
  const [existing] = await sql<{ provider_order_id: string }[]>`
    select provider_order_id from payments
    where booking_id = ${b.id} and kind = 'deposit' and provider = ${provider.name}
      and status = 'created' and amount = ${b.deposit_amount}
    order by created_at desc limit 1`;

  let orderId = existing?.provider_order_id;
  if (!orderId) {
    const order = await provider
      .createOrder({ amount, currency: "INR", receipt: `${b.reference}-dep`, notes: { booking_reference: b.reference, kind: "deposit" } })
      .catch((cause) => {
        throw Object.assign(new BookingError("PROVIDER", "The payment service is unavailable right now. Please try again in a minute."), { cause });
      });
    orderId = order.orderId;
    await sql`insert into payments (booking_id, kind, provider, amount, currency, status, provider_order_id)
              values (${b.id}, 'deposit', ${provider.name}, ${b.deposit_amount}, 'INR', 'created', ${orderId})`;
  }

  return {
    provider: provider.name, keyId: provider.publicKey(), orderId, amount, currency: "INR",
    bookingReference: b.reference,
    prefill: { name: b.guest_name, email: b.guest_email, contact: b.guest_phone },
    holdSecondsLeft: b.status === "pending" && b.expires_at ? Math.max(60, Math.floor((b.expires_at.getTime() - Date.now()) / 1000)) : null,
    propertyName: settings.property.name,
  };
}

export type PaidOutcome = "confirmed" | "already_paid" | "conflict" | "unknown_order";

/**
 * Records a successful payment. Idempotent — safe to call from both the
 * browser callback and the provider webhook, in any order, any number of times.
 */
export async function recordPayment(input: {
  provider: string; orderId: string; paymentId: string; method?: string; raw?: unknown;
}): Promise<{ outcome: PaidOutcome; bookingId?: string }> {
  const sql = db();
  const result = await sql.begin(async (tx) => {
    const [p] = await tx<{ id: string; booking_id: string; kind: string; status: string; amount: string }[]>`
      select id, booking_id, kind, status, amount from payments
      where provider = ${input.provider} and provider_order_id = ${input.orderId} for update`;
    if (!p) return { outcome: "unknown_order" as const };
    if (p.status === "paid" || p.status === "conflict" || p.status === "refunded") {
      return { outcome: "already_paid" as const, bookingId: p.booking_id };
    }

    await tx`update payments set status = 'paid', provider_payment_id = ${input.paymentId}, method = ${input.method ?? null},
             paid_at = now(), raw = ${input.raw ? tx.json(input.raw as never) : null}, failure_reason = null
             where id = ${p.id}`;

    const [b] = await tx<{ status: string }[]>`select status from bookings where id = ${p.booking_id} for update`;

    if (p.kind === "deposit") {
      if (b.status === "expired" || b.status === "cancelled") {
        // Paid after the hold lapsed: re-confirm if the rooms are still free.
        try {
          await tx.savepoint(async (sp) => {
            await sp`update bookings set status = 'confirmed', expires_at = null, deposit_paid = true, deposit_paid_at = now()
                     where id = ${p.booking_id}`;
          });
        } catch (err) {
          if ((err as { code?: string }).code !== "23P01") throw err;
          await tx`update payments set status = 'conflict', failure_reason = 'Room taken after hold expired — refund required'
                   where id = ${p.id}`;
          await tx`update bookings set deposit_paid = true, deposit_paid_at = now(),
                   notes = coalesce(notes || E'\n', '') || 'Deposit received after hold expired; room unavailable — refund required.'
                   where id = ${p.booking_id}`;
          return { outcome: "conflict" as const, bookingId: p.booking_id };
        }
      } else {
        await tx`update bookings set deposit_paid = true, deposit_paid_at = now(), expires_at = null,
                 status = case when status = 'pending' then 'confirmed'::booking_status else status end
                 where id = ${p.booking_id}`;
      }
    }
    return { outcome: "confirmed" as const, bookingId: p.booking_id };
  });

  // Notifications after commit (never throw).
  if (result.bookingId && (result.outcome === "confirmed" || result.outcome === "conflict")) {
    const booking = await getBookingById(result.bookingId);
    if (booking) {
      if (result.outcome === "confirmed") {
        await notify("booking.confirmed", { booking, dedupeKey: `booking.confirmed:${booking.id}` });
      } else {
        await notify("payment.conflict", {
          booking, dedupeKey: `payment.conflict:${input.paymentId}`,
          vars: { amount: formatINR(booking.stored.deposit), paymentId: input.paymentId },
        });
      }
    }
  }
  return result;
}

/** Browser callback after checkout: verify signature, then record. */
export async function confirmCheckout(providerName: string, result: CheckoutResult) {
  const provider = getProviderByName(providerName);
  if (!provider || !provider.verifyCheckout(result)) {
    throw new BookingError("INVALID", "We couldn't verify this payment. If money was deducted, it will be confirmed automatically or refunded.");
  }
  return recordPayment({ provider: provider.name, orderId: result.orderId, paymentId: result.paymentId });
}

export async function recordPaymentFailure(providerName: string, orderId: string, reason: string, raw?: unknown) {
  // Order stays "created" — the guest can retry on the same order.
  await db()`update payments set failure_reason = ${reason.slice(0, 500)}, raw = ${raw ? db().json(raw as never) : null}
             where provider = ${providerName} and provider_order_id = ${orderId} and status = 'created'`;
}

