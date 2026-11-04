/**
 * Pricing (pure — shared by client preview and server). All prices are
 * EXCLUSIVE of GST; tax is computed per line and rounded to the paisa.
 */
import { diffDays, type ISODate } from "@/lib/dates";
import { rupeesToPaise, taxOn, type Paise } from "@/lib/money";
import type { AppSettings } from "@/lib/settings";
import type { MealLine } from "./meals";

/** GST slab for a room based on its nightly tariff. */
export function roomGstRate(pricePerNight: Paise, settings: AppSettings): number {
  const t = settings.tax;
  return pricePerNight <= rupeesToPaise(t.roomThreshold) ? t.roomRateLow : t.roomRateHigh;
}

export interface RoomPriceInput {
  roomId: string;
  name: string;
  guests: number;
  pricePerNight: Paise;
  gstRate: number;
}

export interface QuoteRoomLine extends RoomPriceInput {
  nights: number;
  amount: Paise; // excl. GST
  tax: Paise;
}

export interface QuoteMealLine extends MealLine {
  amount: Paise;
  tax: Paise;
}

export interface TaxBucket {
  rate: number;
  taxable: Paise;
  tax: Paise;
}

export interface Quote {
  nights: number;
  rooms: QuoteRoomLine[];
  meals: QuoteMealLine[];
  roomSubtotal: Paise;
  mealSubtotal: Paise;
  subtotal: Paise; // excl. GST
  tax: Paise;
  total: Paise; // incl. GST
  deposit: Paise;
  balance: Paise;
  taxBreakdown: TaxBucket[];
}

export function computeDeposit(total: Paise, settings: AppSettings): Paise {
  const d = settings.deposit;
  const raw = d.type === "percent" ? (total * d.value) / 100 : rupeesToPaise(d.value);
  // Round up to the whole rupee, never above the total.
  return Math.min(total, Math.ceil(raw / 100) * 100);
}

export function computeQuote(params: {
  checkIn: ISODate;
  checkOut: ISODate;
  rooms: RoomPriceInput[];
  meals: MealLine[];
  settings: AppSettings;
}): Quote {
  const nights = Math.max(0, diffDays(params.checkIn, params.checkOut));
  const buckets = new Map<number, TaxBucket>();
  const addTax = (rate: number, taxable: Paise, tax: Paise) => {
    if (taxable === 0) return;
    const b = buckets.get(rate) ?? { rate, taxable: 0, tax: 0 };
    b.taxable += taxable;
    b.tax += tax;
    buckets.set(rate, b);
  };

  const rooms = params.rooms.map((r) => {
    const amount = r.pricePerNight * nights;
    const tax = taxOn(amount, r.gstRate);
    addTax(r.gstRate, amount, tax);
    return { ...r, nights, amount, tax };
  });

  const meals = params.meals.map((m) => {
    const amount = m.includedFree ? 0 : m.unitPrice * m.quantity;
    const tax = taxOn(amount, m.gstRate);
    addTax(m.gstRate, amount, tax);
    return { ...m, amount, tax };
  });

  const roomSubtotal = rooms.reduce((s, r) => s + r.amount, 0);
  const mealSubtotal = meals.reduce((s, m) => s + m.amount, 0);
  const subtotal = roomSubtotal + mealSubtotal;
  const tax = rooms.reduce((s, r) => s + r.tax, 0) + meals.reduce((s, m) => s + m.tax, 0);
  const total = subtotal + tax;
  const deposit = computeDeposit(total, params.settings);

  return {
    nights, rooms, meals, roomSubtotal, mealSubtotal, subtotal, tax, total, deposit,
    balance: total - deposit,
    taxBreakdown: [...buckets.values()].sort((a, b) => a.rate - b.rate),
  };
}
