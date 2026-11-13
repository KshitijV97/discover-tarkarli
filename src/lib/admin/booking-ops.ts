/**
 * Pure rules for what staff can do to a booking: status actions and manual
 * payments. No I/O; the server service (lib/server/admin-bookings.ts) enforces
 * these inside a transaction.
 */
import { formatDate, type ISODate } from "@/lib/dates";
import { formatINR, type Paise } from "@/lib/money";

export type BookingStatus = "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "expired";
export type StaffAction = "check_in" | "check_out" | "cancel";

export const ACTION_LABEL: Record<StaffAction, string> = {
  check_in: "Check in",
  check_out: "Check out",
  cancel: "Cancel booking",
};

export interface ActionOption { action: StaffAction; allowed: boolean; reason?: string }

/** Every staff action with whether it is allowed now, and why not. `today` is the property's local date. */
export function staffActions(b: { status: BookingStatus; checkIn: ISODate; checkOut: ISODate }, today: ISODate): ActionOption[] {
  const checkIn: ActionOption =
    b.status !== "confirmed"
      ? { action: "check_in", allowed: false, reason: b.status === "pending" ? "Record the deposit first; the booking is still a hold." : `The booking is ${label(b.status)}.` }
      : today < b.checkIn
        ? { action: "check_in", allowed: false, reason: `Check-in opens on ${formatDate(b.checkIn)}.` }
        : today >= b.checkOut
          ? { action: "check_in", allowed: false, reason: "The stay has already ended." }
          : { action: "check_in", allowed: true };
  const checkOut: ActionOption =
    b.status === "checked_in" ? { action: "check_out", allowed: true } : { action: "check_out", allowed: false, reason: "Only checked-in guests can check out." };
  const cancel: ActionOption =
    b.status === "pending" || b.status === "confirmed"
      ? { action: "cancel", allowed: true }
      : { action: "cancel", allowed: false, reason: `A ${label(b.status)} booking can't be cancelled.` };
  return [checkIn, checkOut, cancel];
}

export const NEXT_STATUS: Record<StaffAction, BookingStatus> = { check_in: "checked_in", check_out: "checked_out", cancel: "cancelled" };

export interface LedgerEntry { amount: Paise; status: "created" | "paid" | "failed" | "conflict" | "refunded" }

export interface PaymentSummary {
  total: Paise;
  paid: Paise;
  balance: Paise;
  /** Money received that must go back to the guest (paid after a hold expired and the room was taken). */
  refundDue: Paise;
}

/** Derives what has been paid and what is due from the payments ledger. */
export function paymentSummary(total: Paise, ledger: LedgerEntry[]): PaymentSummary {
  const paid = ledger.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const refundDue = ledger.filter((p) => p.status === "conflict").reduce((s, p) => s + p.amount, 0);
  return { total, paid, balance: Math.max(0, total - paid), refundDue };
}

export const MANUAL_METHODS = ["cash", "upi", "card", "bank_transfer"] as const;
export type ManualMethod = (typeof MANUAL_METHODS)[number];
export const METHOD_LABEL: Record<ManualMethod, string> = { cash: "Cash", upi: "UPI", card: "Card", bank_transfer: "Bank transfer" };

const PAYABLE: BookingStatus[] = ["pending", "confirmed", "checked_in", "checked_out"];

/** Returns an error message, or null when the manual payment can be recorded. */
export function validateManualPayment(
  b: { status: BookingStatus },
  summary: PaymentSummary,
  input: { amount: Paise; method: string },
): string | null {
  if (!PAYABLE.includes(b.status)) return `Payments can't be recorded on a ${label(b.status)} booking.`;
  if (!(MANUAL_METHODS as readonly string[]).includes(input.method)) return "Choose how the guest paid.";
  if (!Number.isInteger(input.amount) || input.amount <= 0) return "Enter an amount above ₹0.";
  if (summary.balance <= 0) return "Nothing is due on this booking.";
  if (input.amount > summary.balance) return `That's more than the ${formatINR(summary.balance)} due.`;
  return null;
}

/** Parses a rupee amount typed by staff ("2,500" or "2500.50") into paise, or null. */
export function parseRupeesInput(s: string): Paise | null {
  const clean = s.replace(/[,\s₹]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

/** Flags to store after a payment: deposit and balance are "paid" once the ledger covers them. */
export function paidFlags(summary: PaymentSummary, deposit: Paise) {
  return { depositPaid: summary.paid >= deposit, fullyPaid: summary.paid >= summary.total };
}

const label = (s: BookingStatus) => s.replace("_", " ");
