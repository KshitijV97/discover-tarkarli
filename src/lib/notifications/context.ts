import { formatDate } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import type { AppSettings } from "@/lib/settings";
import type { MealLine } from "@/lib/booking/meals";
import { mealLabel } from "@/lib/booking/meals";
import type { TemplateVars } from "./types";

/** Minimal booking shape needed for message variables (keeps this module pure). */
export interface BookingForMessage {
  reference: string;
  accessToken: string;
  guestName: string;
  guestPhone: string;
  numGuests: number;
  checkIn: string;
  checkOut: string;
  rooms: { name: string; guests: number }[];
  meals: MealLine[];
  depositPaid: boolean;
  quote: { nights: number; total: number; deposit: number; balance: number };
}

export function mealSummary(meals: MealLine[]): string {
  const count = (t: string, paid: boolean) =>
    meals.filter((m) => m.mealType === t && m.includedFree !== paid).reduce((s, m) => s + m.quantity, 0);
  const parts: string[] = [];
  if (meals.some((m) => m.mealType === "breakfast" && m.includedFree)) parts.push("breakfast included");
  const pb = count("breakfast", true), l = count("lunch", true), d = count("dinner", true);
  if (pb) parts.push(`${pb} breakfast${pb > 1 ? "s" : ""}`);
  if (l) parts.push(`${l} lunch${l > 1 ? "es" : ""}`);
  if (d) parts.push(`${d} dinner${d > 1 ? "s" : ""}`);
  return parts.length ? parts.join(", ") : "none";
}

export function mealDetail(meals: MealLine[]): string {
  const paid = meals.filter((m) => !m.includedFree && m.quantity > 0);
  if (paid.length === 0) return "No lunch/dinner booked (breakfast included).";
  return paid.map((m) => `• ${formatDate(m.date)} — ${mealLabel(m.mealType)} × ${m.quantity}`).join("\n");
}

function cutoffLabel(s: AppSettings) {
  const [h, m] = s.meals.cutoffTime.split(":").map(Number);
  return `${((h + 11) % 12) + 1}${m ? ":" + String(m).padStart(2, "0") : ""}${h < 12 ? "am" : "pm"}`;
}

export function bookingVars(b: BookingForMessage, settings: AppSettings, siteUrl: string): TemplateVars {
  return {
    reference: b.reference,
    guestName: b.guestName,
    guestFirstName: b.guestName.split(" ")[0],
    guestPhone: b.guestPhone,
    numGuests: String(b.numGuests),
    checkIn: formatDate(b.checkIn),
    checkOut: formatDate(b.checkOut),
    nights: String(b.quote.nights),
    rooms: b.rooms.map((r) => r.name).join(", "),
    total: formatINR(b.quote.total),
    deposit: formatINR(b.quote.deposit),
    depositPaid: b.depositPaid ? formatINR(b.quote.deposit) : formatINR(0),
    balance: formatINR(b.depositPaid ? b.quote.balance : b.quote.total),
    mealSummary: mealSummary(b.meals),
    mealDetail: mealDetail(b.meals),
    mealCutoff: cutoffLabel(settings),
    manageUrl: `${siteUrl.replace(/\/$/, "")}/booking/${b.accessToken}`,
    propertyName: settings.property.name,
    propertyPhone: settings.property.phone,
  };
}
