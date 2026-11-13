import "server-only";
import { db } from "./db";
import { getSettings } from "./settings-repo";
import { BookingError, getBookingById, type BookingDetail } from "./bookings";
import { notify } from "./notify";
import { listAudit, writeAudit, type AuditEntry } from "./audit-repo";
import {
  NEXT_STATUS, paidFlags, paymentSummary, staffActions, validateManualPayment,
  type BookingStatus, type LedgerEntry, type ManualMethod, type PaymentSummary, type StaffAction,
} from "@/lib/admin/booking-ops";
import { todayInTz } from "@/lib/dates";
import { formatINR, paiseToRupeesString, rupeesToPaise, type Paise } from "@/lib/money";

export interface PaymentRow {
  id: string;
  kind: string;
  provider: string;
  method: string | null;
  amount: Paise;
  status: LedgerEntry["status"];
  note: string | null;
  recordedBy: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

export interface NotificationRow {
  id: string;
  event: string;
  audience: string;
  channel: string;
  recipient: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
}

export interface AdminBooking {
  booking: BookingDetail;
  notes: string | null;
  payments: PaymentRow[];
  summary: PaymentSummary;
  notifications: NotificationRow[];
  audit: AuditEntry[];
  today: string;
}

async function loadLedger(bookingId: string): Promise<PaymentRow[]> {
  const rows = await db()<{
    id: string; kind: string; provider: string; method: string | null; amount: string; status: LedgerEntry["status"];
    raw: { note?: string; recordedBy?: string } | null; paid_at: Date | null; created_at: Date;
  }[]>`select id, kind, provider, method, amount, status, raw, paid_at, created_at
       from payments where booking_id = ${bookingId} order by created_at`;
  return rows.map((r) => ({
    id: r.id, kind: r.kind, provider: r.provider, method: r.method, amount: rupeesToPaise(r.amount), status: r.status,
    note: r.provider === "manual" ? r.raw?.note ?? null : null, recordedBy: r.provider === "manual" ? r.raw?.recordedBy ?? null : null,
    paidAt: r.paid_at, createdAt: r.created_at,
  }));
}

export async function getAdminBooking(id: string): Promise<AdminBooking | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const booking = await getBookingById(id);
  if (!booking) return null;
  const [settings, payments, [n], notifications, audit] = await Promise.all([
    getSettings(),
    loadLedger(id),
    db()<{ notes: string | null }[]>`select notes from bookings where id = ${id}`,
    db()<{ id: string; event: string; audience: string; channel: string; recipient: string; status: string; attempts: number; last_error: string | null; created_at: Date }[]>`
      select id, event, audience, channel, recipient, status, attempts, last_error, created_at
      from notifications where booking_id = ${id} order by created_at desc limit 50`,
    listAudit({ entity: "booking", entityId: id, limit: 50 }),
  ]);
  return {
    booking, notes: n?.notes ?? null, payments, summary: paymentSummary(booking.stored.total, payments),
    notifications: notifications.map((r) => ({
      id: r.id, event: r.event, audience: r.audience, channel: r.channel, recipient: r.recipient, status: r.status,
      attempts: r.attempts, lastError: r.last_error, createdAt: r.created_at,
    })),
    audit, today: todayInTz(settings.property.timezone),
  };
}

/** Check in, check out or cancel. Rules live in lib/admin/booking-ops.ts; this enforces them under a row lock. */
export async function applyStaffAction(id: string, action: StaffAction, actorEmail: string, now = new Date()): Promise<void> {
  const settings = await getSettings();
  const today = todayInTz(settings.property.timezone, now);
  const result = await db().begin(async (tx) => {
    const [b] = await tx<{ status: BookingStatus; check_in: string; check_out: string; deposit_paid: boolean }[]>`
      select status, check_in, check_out, deposit_paid from bookings where id = ${id} for update`;
    if (!b) throw new BookingError("NOT_FOUND", "Booking not found.");
    const option = staffActions({ status: b.status, checkIn: b.check_in, checkOut: b.check_out }, today).find((o) => o.action === action)!;
    if (!option.allowed) throw new BookingError("LOCKED", option.reason ?? "Not allowed.");

    const next = NEXT_STATUS[action];
    const refundNote = action === "cancel" && b.deposit_paid
      ? "Cancelled after the deposit was paid: refund to be handled manually."
      : null;
    await tx`update bookings set status = ${next}, expires_at = null,
             notes = case when ${refundNote}::text is null then notes else coalesce(notes || E'\n', '') || ${refundNote} end
             where id = ${id}`;
    await writeAudit({ actorEmail, action: `booking.${action}`, entity: "booking", entityId: id, detail: { from: b.status, to: next } }, tx);
    return { next };
  });

  if (result.next === "cancelled") {
    const booking = await getBookingById(id);
    if (booking) await notify("booking.cancelled", { booking, dedupeKey: `booking.cancelled:${id}` });
  }
}

/** Records cash/UPI/card/bank payment taken at the property, and updates the paid flags. */
export async function recordManualPayment(
  id: string,
  input: { amount: Paise; method: ManualMethod; note?: string },
  actorEmail: string,
): Promise<PaymentSummary> {
  const outcome = await db().begin(async (tx) => {
    const [b] = await tx<{ status: BookingStatus; total_amount: string; deposit_amount: string; deposit_paid: boolean }[]>`
      select status, total_amount, deposit_amount, deposit_paid from bookings where id = ${id} for update`;
    if (!b) throw new BookingError("NOT_FOUND", "Booking not found.");
    const ledger = await tx<{ amount: string; status: LedgerEntry["status"] }[]>`select amount, status from payments where booking_id = ${id}`;
    const before = paymentSummary(rupeesToPaise(b.total_amount), ledger.map((p) => ({ amount: rupeesToPaise(p.amount), status: p.status })));
    const error = validateManualPayment({ status: b.status }, before, input);
    if (error) throw new BookingError("INVALID", error);

    const kind = b.deposit_paid ? "balance" : "deposit";
    await tx`insert into payments (booking_id, kind, provider, method, amount, currency, status, paid_at, raw)
             values (${id}, ${kind}, 'manual', ${input.method}, ${paiseToRupeesString(input.amount)}, 'INR', 'paid', now(),
                     ${tx.json({ note: input.note?.slice(0, 500) || null, recordedBy: actorEmail } as never)})`;
    const after = { ...before, paid: before.paid + input.amount, balance: before.balance - input.amount };
    const flags = paidFlags(after, rupeesToPaise(b.deposit_amount));
    await tx`update bookings set
               deposit_paid = ${flags.depositPaid}, deposit_paid_at = case when ${flags.depositPaid} and not deposit_paid then now() else deposit_paid_at end,
               balance_paid = ${flags.fullyPaid}, balance_paid_at = case when ${flags.fullyPaid} and not balance_paid then now() else balance_paid_at end,
               status = case when status = 'pending' and ${flags.depositPaid} then 'confirmed'::booking_status else status end,
               expires_at = case when ${flags.depositPaid} then null else expires_at end
             where id = ${id}`;
    await writeAudit({
      actorEmail, action: "payment.manual", entity: "booking", entityId: id,
      detail: { amount: formatINR(input.amount), method: input.method, kind },
    }, tx);
    return { after, fullyPaid: flags.fullyPaid, confirmedNow: b.status === "pending" && flags.depositPaid };
  });

  const booking = await getBookingById(id);
  if (booking) {
    if (outcome.confirmedNow) await notify("booking.confirmed", { booking, dedupeKey: `booking.confirmed:${id}` });
    if (outcome.fullyPaid) await notify("booking.fully_paid", { booking, dedupeKey: `booking.fully_paid:${id}` });
  }
  return outcome.after;
}

export async function saveBookingNotes(id: string, notes: string, actorEmail: string): Promise<void> {
  await db().begin(async (tx) => {
    const [row] = await tx<{ id: string }[]>`update bookings set notes = ${notes.trim().slice(0, 4000) || null} where id = ${id} returning id`;
    if (!row) throw new BookingError("NOT_FOUND", "Booking not found.");
    await writeAudit({ actorEmail, action: "booking.notes", entity: "booking", entityId: id }, tx);
  });
}
