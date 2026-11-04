/** All money is handled as integer paise in code; DB stores numeric(12,2) rupees. */
export type Paise = number;

export const rupeesToPaise = (r: number | string): Paise => Math.round(Number(r) * 100);
export const paiseToRupeesString = (p: Paise): string => (p / 100).toFixed(2);

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const inrWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function formatINR(p: Paise): string {
  return p % 100 === 0 ? inrWhole.format(p / 100) : inr.format(p / 100);
}

/** Tax on an amount at a % rate, rounded to the nearest paisa. */
export const taxOn = (amount: Paise, ratePct: number): Paise => Math.round((amount * ratePct) / 100);
