import { z } from "zod";

/**
 * Typed app settings. Each group is one row in the `settings` table
 * (key = group name, value = JSON). Missing rows/fields fall back to these
 * defaults, so the app works on an empty settings table.
 */
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm");

export const settingsSchema = z.object({
  deposit: z.object({
    type: z.enum(["percent", "fixed"]).default("percent"),
    value: z.number().min(0).default(30), // % of total, or fixed ₹ amount
  }).default({}),
  meals: z.object({
    breakfastIncluded: z.boolean().default(true),
    breakfastPrice: z.number().min(0).default(350), // ₹/person, used only when not included
    lunchPrice: z.number().min(0).default(550),
    dinnerPrice: z.number().min(0).default(650),
    cutoffTime: hhmm.default("18:00"),               // edits lock at this time…
    cutoffDaysBefore: z.number().int().min(0).default(1), // …this many days before the meal
  }).default({}),
  tax: z.object({
    roomRateLow: z.number().min(0).default(5),       // % when nightly tariff ≤ threshold
    roomRateHigh: z.number().min(0).default(18),     // % above threshold
    roomThreshold: z.number().min(0).default(7500),  // ₹ per room per night
    foodRate: z.number().min(0).default(5),
    intraState: z.boolean().default(true),           // true → CGST+SGST, false → IGST
  }).default({}),
  booking: z.object({
    minNights: z.number().int().min(1).default(1),
    maxNights: z.number().int().min(1).default(30),
    maxAdvanceDays: z.number().int().min(1).default(365),
    holdMinutes: z.number().int().min(1).default(15),
    paymentsEnabled: z.boolean().default(false),     // false → bookings confirm instantly (pre-Razorpay)
    checkInTime: hhmm.default("14:00"),
    checkOutTime: hhmm.default("11:00"),
  }).default({}),
  property: z.object({
    name: z.string().default("Golden Tide Retreat"),
    timezone: z.string().default("Asia/Kolkata"),
    phone: z.string().default(""),
    email: z.string().default(""),
    address: z.string().default(""),
    gstin: z.string().default(""),
  }).default({}),
});

export type AppSettings = z.infer<typeof settingsSchema>;
export type SettingsKey = keyof AppSettings;

export const defaultSettings: AppSettings = settingsSchema.parse({});

/** Merge raw DB rows over defaults; invalid groups fall back to defaults. */
export function parseSettings(rows: { key: string; value: unknown }[]): AppSettings {
  const raw: Record<string, unknown> = {};
  for (const r of rows) raw[r.key] = r.value;
  const out = { ...defaultSettings } as Record<string, unknown>;
  for (const key of Object.keys(settingsSchema.shape) as SettingsKey[]) {
    if (raw[key] === undefined) continue;
    const parsed = settingsSchema.shape[key].safeParse(raw[key]);
    if (parsed.success) out[key] = parsed.data;
    else console.warn(`[settings] invalid "${key}" in DB, using defaults`, parsed.error.issues);
  }
  return out as AppSettings;
}
