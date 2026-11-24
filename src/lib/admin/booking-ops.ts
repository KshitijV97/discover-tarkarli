/**
 * Pure rules for what staff can do to a booking: status actions and manual
 * payments. No I/O; the server service (lib/server/admin-bookings.ts) enforces
 * these inside a transaction.
 */
import { addDays, diffDays, formatDate, isISODate, type ISODate } from "@/lib/dates";
import { mealSlots, slotKey, type MealLine, type MealSelection } from "@/lib/booking/meals";
import type { AppSettings } from "@/lib/settings";
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

// ---------------------------------------------------------------------------
// Changing a stay (dates, rooms, guests) from the admin
// ---------------------------------------------------------------------------

const EDITABLE_STAY: BookingStatus[] = ["pending", "confirmed", "checked_in"];

/**
 * Returns an error message, or null when staff may move the booking to these dates.
 * In-house guests (checked in) can extend or shorten their stay, but the arrival date is fixed.
 */
export function validateStayChange(
  current: { status: BookingStatus; checkIn: ISODate },
  next: { checkIn: string; checkOut: string },
  today: ISODate,
  settings: AppSettings,
): string | null {
  if (!EDITABLE_STAY.includes(current.status)) return `A ${label(current.status)} booking can't be changed.`;
  if (!isISODate(next.checkIn) || !isISODate(next.checkOut)) return "Choose valid dates.";
  const nights = diffDays(next.checkIn, next.checkOut);
  if (nights < 1) return "Check-out must be after check-in.";
  if (nights > settings.booking.maxNights) return `Maximum stay is ${settings.booking.maxNights} nights.`;
  if (current.status === "checked_in") {
    if (next.checkIn !== current.checkIn) return "The guest has already arrived, so the check-in date can't change.";
    if (next.checkOut <= today) return "Check-out must be after today for a guest who is staying.";
    return null;
  }
  if (next.checkIn < today) return "Check-in can't be in the past.";
  if (next.checkIn > addDays(today, settings.booking.maxAdvanceDays)) return `Bookings open up to ${settings.booking.maxAdvanceDays} days ahead.`;
  return null;
}

/**
 * Carries paid meal choices over to new dates: keeps choices whose slot still exists,
 * caps headcounts at the new guest count, and drops the rest. Included breakfast is
 * regenerated by planMeals, so it is not a selection.
 */
export function carryOverMeals(existing: MealLine[], next: { checkIn: ISODate; checkOut: ISODate; numGuests: number }, settings: AppSettings): MealSelection[] {
  const valid = new Set(mealSlots(next.checkIn, next.checkOut, settings.meals.breakfastIncluded).map((s) => slotKey(s.date, s.mealType)));
  return existing
    .filter((m) => !m.includedFree && m.quantity > 0 && valid.has(slotKey(m.date, m.mealType)))
    .map((m) => ({ date: m.date, mealType: m.mealType, quantity: Math.min(m.quantity, next.numGuests) }));
}
