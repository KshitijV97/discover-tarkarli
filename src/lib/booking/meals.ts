/**
 * Meal rules (pure — shared by client and server):
 *
 * - A stay of check_in → check_out covers nights check_in … check_out-1.
 * - Breakfast is served the MORNING AFTER each night: check_in+1 … check_out.
 *   When `breakfastIncluded`, it is automatic: quantity = guests, price 0,
 *   included_free = true (rows still exist so the kitchen has counts).
 *   Otherwise it becomes a paid, optional meal like lunch/dinner.
 * - Lunch and dinner are offered on each day that has a booked night:
 *   check_in … check_out-1. The guest picks a headcount (0…guests) per meal.
 * - Each meal can be changed until `cutoffTime` (property timezone),
 *   `cutoffDaysBefore` days before the meal's date (default 18:00 the day before).
 *   The same cutoff applies when the booking is first made.
 * - Existing rows keep their price_at_booking; newly added meals use current prices.
 */
import { addDays, eachDate, zonedTimeToUtc, type ISODate } from "@/lib/dates";
import { rupeesToPaise, type Paise } from "@/lib/money";
import type { AppSettings } from "@/lib/settings";

export type MealType = "breakfast" | "lunch" | "dinner";
export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

export interface MealSlot {
  date: ISODate;
  mealType: MealType;
  /** Breakfast included in the room rate — not selectable by the guest. */
  included: boolean;
}

export interface MealLine {
  date: ISODate;
  mealType: MealType;
  quantity: number;
  unitPrice: Paise; // per person, excl. GST
  gstRate: number;
  includedFree: boolean;
}

export interface MealSelection {
  date: ISODate;
  mealType: MealType;
  quantity: number;
}

export const slotKey = (date: ISODate, mealType: MealType) => `${date}|${mealType}`;

export function mealSlots(checkIn: ISODate, checkOut: ISODate, breakfastIncluded: boolean): MealSlot[] {
  const nights = eachDate(checkIn, checkOut);
  const slots: MealSlot[] = [];
  for (const night of nights) {
    slots.push({ date: night, mealType: "lunch", included: false });
    slots.push({ date: night, mealType: "dinner", included: false });
    slots.push({ date: addDays(night, 1), mealType: "breakfast", included: breakfastIncluded });
  }
  const order: Record<MealType, number> = { breakfast: 0, lunch: 1, dinner: 2 };
  return slots.sort((a, b) => (a.date === b.date ? order[a.mealType] - order[b.mealType] : a.date < b.date ? -1 : 1));
}

/** The instant after which a meal on `date` can no longer be changed. */
export function mealCutoff(date: ISODate, settings: AppSettings): Date {
  const { cutoffTime, cutoffDaysBefore } = settings.meals;
  return zonedTimeToUtc(addDays(date, -cutoffDaysBefore), cutoffTime, settings.property.timezone);
}

export function isMealLocked(date: ISODate, settings: AppSettings, now: Date): boolean {
  return now.getTime() >= mealCutoff(date, settings).getTime();
}

export function currentMealPrice(mealType: MealType, settings: AppSettings): Paise {
  const m = settings.meals;
  return rupeesToPaise(mealType === "lunch" ? m.lunchPrice : mealType === "dinner" ? m.dinnerPrice : m.breakfastPrice);
}

const label: Record<MealType, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };
export const mealLabel = (t: MealType) => label[t];

export interface PlanMealsInput {
  checkIn: ISODate;
  checkOut: ISODate;
  numGuests: number;
  selections: MealSelection[];
  settings: AppSettings;
  now: Date;
  /** Current rows when editing an existing booking. */
  existing?: MealLine[];
  /** Admins may bypass the cutoff. */
  enforceCutoff?: boolean;
}

export interface PlanMealsResult {
  lines: MealLine[];
  errors: string[];
}

/**
 * Turns a guest's selections into the full set of meal rows for a booking,
 * applying inclusion, quantity limits, cutoff locks and price snapshots.
 * Slots without a selection keep their existing quantity (or 0 when new).
 */
export function planMeals(input: PlanMealsInput): PlanMealsResult {
  const { checkIn, checkOut, numGuests, settings, now, enforceCutoff = true } = input;
  const existing = new Map((input.existing ?? []).map((l) => [slotKey(l.date, l.mealType), l]));
  const requested = new Map<string, number>();
  const errors: string[] = [];

  const slots = mealSlots(checkIn, checkOut, settings.meals.breakfastIncluded);
  const validKeys = new Set(slots.map((s) => slotKey(s.date, s.mealType)));

  for (const sel of input.selections) {
    const key = slotKey(sel.date, sel.mealType);
    if (!validKeys.has(key)) {
      errors.push(`${mealLabel(sel.mealType)} is not available on ${sel.date} for this stay.`);
      continue;
    }
    requested.set(key, sel.quantity);
  }

  const lines: MealLine[] = [];
  for (const slot of slots) {
    const key = slotKey(slot.date, slot.mealType);
    const prev = existing.get(key);
    // An existing included-breakfast row stays included even if the setting later changes.
    const included = slot.mealType === "breakfast" && (prev ? prev.includedFree : slot.included);

    if (included) {
      lines.push({ date: slot.date, mealType: slot.mealType, quantity: numGuests, unitPrice: 0, gstRate: 0, includedFree: true });
      continue;
    }

    const prevQty = prev?.quantity ?? 0;
    let qty = requested.has(key) ? requested.get(key)! : prevQty;

    if (!Number.isInteger(qty) || qty < 0 || qty > numGuests) {
      errors.push(`${mealLabel(slot.mealType)} on ${slot.date}: choose between 0 and ${numGuests}.`);
      qty = prevQty;
    }
    if (qty !== prevQty && enforceCutoff && isMealLocked(slot.date, settings, now)) {
      errors.push(`${mealLabel(slot.mealType)} on ${slot.date} is past the meal cutoff and can no longer be added or changed.`);
      qty = prevQty;
    }
    if (qty === 0) continue;

    lines.push({
      date: slot.date,
      mealType: slot.mealType,
      quantity: qty,
      unitPrice: prev?.unitPrice ?? currentMealPrice(slot.mealType, settings),
      gstRate: prev?.gstRate ?? settings.tax.foodRate,
      includedFree: false,
    });
  }

  return { lines, errors };
}
