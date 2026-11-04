import { settingsSchema, type AppSettings, type SettingsKey } from "@/lib/settings";

/**
 * Pure mapping between the admin settings forms and the typed `settings`
 * groups (pure: no I/O, so it is unit-tested and shared by client and server).
 *
 * Every settings group in `lib/settings.ts` is flat, so a group is described
 * by its list of fields. The server action validates the result with the
 * group's zod schema, so the form can never write an invalid value.
 */

export type FieldDef =
  | { name: string; label: string; kind: "number"; step?: number; hint?: string }
  | { name: string; label: string; kind: "text"; hint?: string }
  | { name: string; label: string; kind: "time"; hint?: string }
  | { name: string; label: string; kind: "boolean"; hint?: string }
  | { name: string; label: string; kind: "select"; options: { value: string; label: string }[]; hint?: string };

export interface SettingsGroupDef {
  key: Exclude<SettingsKey, "notifications">;
  title: string;
  description: string;
  fields: FieldDef[];
}

export const SETTINGS_GROUPS: SettingsGroupDef[] = [
  {
    key: "property",
    title: "Property",
    description: "Shown on the site footer, in messages and on invoices.",
    fields: [
      { name: "name", label: "Name", kind: "text" },
      { name: "timezone", label: "Timezone", kind: "text", hint: "IANA name, e.g. Asia/Kolkata" },
      { name: "phone", label: "Phone", kind: "text" },
      { name: "email", label: "Email", kind: "text" },
      { name: "address", label: "Address", kind: "text" },
      { name: "gstin", label: "GSTIN", kind: "text" },
    ],
  },
  {
    key: "deposit",
    title: "Deposit",
    description: "The advance guests pay online. Fixed once paid.",
    fields: [
      {
        name: "type", label: "Type", kind: "select",
        options: [{ value: "percent", label: "Percent of total" }, { value: "fixed", label: "Fixed amount (₹)" }],
      },
      { name: "value", label: "Value", kind: "number", step: 0.01, hint: "% of the GST-inclusive total, or ₹ when fixed" },
    ],
  },
  {
    key: "meals",
    title: "Meals",
    description: "Meal prices and when guests can no longer change their meals.",
    fields: [
      { name: "breakfastIncluded", label: "Breakfast included in room rate", kind: "boolean" },
      { name: "breakfastPrice", label: "Breakfast price (₹ per person)", kind: "number", step: 1, hint: "Used only when breakfast is not included" },
      { name: "lunchPrice", label: "Lunch price (₹ per person)", kind: "number", step: 1 },
      { name: "dinnerPrice", label: "Dinner price (₹ per person)", kind: "number", step: 1 },
      { name: "cutoffTime", label: "Meal edit cutoff time", kind: "time" },
      { name: "cutoffDaysBefore", label: "Cutoff days before the meal", kind: "number", step: 1 },
    ],
  },
  {
    key: "tax",
    title: "Tax (GST)",
    description: "Prices exclude GST. Rates are applied per line.",
    fields: [
      { name: "roomRateLow", label: "Room GST below threshold (%)", kind: "number", step: 0.01 },
      { name: "roomRateHigh", label: "Room GST above threshold (%)", kind: "number", step: 0.01 },
      { name: "roomThreshold", label: "Threshold (₹ per room per night)", kind: "number", step: 1 },
      { name: "foodRate", label: "Food GST (%)", kind: "number", step: 0.01 },
      {
        name: "intraState", label: "Supply is within the state", kind: "boolean",
        hint: "On: CGST + SGST. Off: IGST.",
      },
    ],
  },
  {
    key: "booking",
    title: "Booking rules",
    description: "Stay length, hold time and check-in/out times.",
    fields: [
      { name: "minNights", label: "Minimum nights", kind: "number", step: 1 },
      { name: "maxNights", label: "Maximum nights", kind: "number", step: 1 },
      { name: "maxAdvanceDays", label: "Bookable up to (days ahead)", kind: "number", step: 1 },
      { name: "holdMinutes", label: "Pending hold (minutes)", kind: "number", step: 1, hint: "How long a room is held before payment" },
      { name: "paymentsEnabled", label: "Collect deposit online", kind: "boolean", hint: "Needs a payment provider configured" },
      { name: "checkInTime", label: "Check-in time", kind: "time" },
      { name: "checkOutTime", label: "Check-out time", kind: "time" },
    ],
  },
];

export type FormValues = Record<string, string>;

/** Current group values as strings, ready to prefill inputs. */
export function groupToFormValues(settings: AppSettings, key: SettingsGroupDef["key"]): FormValues {
  const values: FormValues = {};
  for (const [field, value] of Object.entries(settings[key] as unknown as Record<string, unknown>)) {
    values[field] = typeof value === "boolean" ? (value ? "on" : "") : String(value);
  }
  return values;
}

export type ParseResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; errors: Record<string, string> };

/**
 * Turn raw form values into a validated group value. Checkboxes are absent
 * from a form post when unticked, so a missing boolean means false.
 */
export function parseGroupForm(group: SettingsGroupDef, raw: FormValues): ParseResult {
  const input: Record<string, unknown> = {};
  for (const field of group.fields) {
    const value = (raw[field.name] ?? "").trim();
    switch (field.kind) {
      case "boolean":
        input[field.name] = value === "on" || value === "true";
        break;
      case "number":
        input[field.name] = value === "" ? Number.NaN : Number(value);
        break;
      default:
        input[field.name] = value;
    }
  }

  const schema = settingsSchema.shape[group.key];
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data as Record<string, unknown> };

  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !errors[field]) errors[field] = issue.message === "Required" || issue.code === "invalid_type" ? "Enter a valid value" : issue.message;
  }
  return { ok: false, errors };
}
