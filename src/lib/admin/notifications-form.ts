/**
 * Pure: the notifications editor. Turns the form into a validated
 * settings.notifications value, and back. Provider template mappings
 * (whatsappTemplates, smsTemplates) are advanced and kept as they are.
 */
import { notificationsSchema, type NotificationSettings } from "@/lib/notifications/config";
import { DEFAULT_TEMPLATES } from "@/lib/notifications/templates";
import { CHANNELS, type Audience, type ChannelName, type NotificationEvent } from "@/lib/notifications/types";
import { normalizePhone } from "@/lib/booking/rules";

/** Which audiences make sense for each event, in the order shown. */
export const EVENT_AUDIENCES: { event: NotificationEvent; label: string; audiences: Audience[] }[] = [
  { event: "booking.pending", label: "New booking, deposit not paid yet", audiences: ["guest", "operator"] },
  { event: "booking.confirmed", label: "Booking confirmed", audiences: ["guest", "operator"] },
  { event: "booking.updated", label: "Dates or rooms changed by staff", audiences: ["guest", "operator"] },
  { event: "booking.meals_updated", label: "Meals changed", audiences: ["guest", "operator"] },
  { event: "booking.cancelled", label: "Booking cancelled", audiences: ["guest", "operator"] },
  { event: "booking.balance_reminder", label: "Balance reminder before check-out", audiences: ["guest"] },
  { event: "booking.fully_paid", label: "Fully paid (receipt)", audiences: ["guest", "operator"] },
  { event: "payment.conflict", label: "Paid after the room was taken (refund needed)", audiences: ["operator"] },
  { event: "kitchen.daily_summary", label: "Tomorrow's meal counts", audiences: ["kitchen", "operator"] },
  { event: "order.placed", label: "In-stay food order", audiences: ["kitchen", "operator"] },
  { event: "order.updated", label: "Food order changed", audiences: ["kitchen", "operator"] },
];

export const AUDIENCE_LABEL: Record<Audience, string> = { guest: "Guest", operator: "Owner and staff", kitchen: "Kitchen" };
export const CHANNEL_LABEL: Record<ChannelName, string> = { whatsapp: "WhatsApp", sms: "SMS", telegram: "Telegram" };

/** Telegram can't reach guests (they never shared a chat id), so it isn't offered for them. */
export const channelsFor = (a: Audience): ChannelName[] => (a === "guest" ? CHANNELS.filter((c) => c !== "telegram") : [...CHANNELS]);

export const routeField = (e: string, a: string, c: string) => `route:${e}:${a}:${c}`;
export const templateField = (e: string, a: string) => `tpl:${e}.${a}`;
export const recipientField = (a: "operator" | "kitchen", c: ChannelName) => `to:${a}:${c}`;

/** The {{placeholders}} a default template uses, to show as help next to the editor. */
export function placeholders(text: string): string[] {
  return [...new Set([...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]))];
}

export type FormValues = Record<string, string>;
export type ParseResult = { ok: true; value: NotificationSettings } | { ok: false; errors: Record<string, string> };

const lines = (s: string | undefined) => (s ?? "").split(/[\n,]/).map((x) => x.trim()).filter(Boolean);

export function parseNotificationsForm(v: FormValues, current: NotificationSettings): ParseResult {
  const errors: Record<string, string> = {};

  const recipients = { operator: { whatsapp: [] as string[], sms: [] as string[], telegram: [] as string[] }, kitchen: { whatsapp: [] as string[], sms: [] as string[], telegram: [] as string[] } };
  for (const a of ["operator", "kitchen"] as const) {
    for (const c of CHANNELS) {
      const field = recipientField(a, c);
      for (const raw of lines(v[field])) {
        if (c === "telegram") {
          if (/^-?\d{4,20}$/.test(raw) || /^@[A-Za-z0-9_]{5,32}$/.test(raw)) recipients[a][c].push(raw);
          else errors[field] ??= `"${raw}" isn't a Telegram chat id (a number like 123456789, or @channelname).`;
        } else {
          const phone = normalizePhone(raw);
          if (phone) recipients[a][c].push(phone);
          else errors[field] ??= `"${raw}" isn't a phone number. Use +91 98xxxxxxxx or a 10-digit Indian mobile.`;
        }
      }
      recipients[a][c] = [...new Set(recipients[a][c])];
    }
  }

  const routes: Record<string, Partial<Record<Audience, ChannelName[]>>> = {};
  for (const { event, audiences } of EVENT_AUDIENCES) {
    routes[event] = {};
    for (const a of audiences) {
      const chosen = channelsFor(a).filter((c) => v[routeField(event, a, c)] === "on");
      if (chosen.length) routes[event][a] = chosen;
    }
  }

  const templates: Record<string, string> = {};
  for (const { event, audiences } of EVENT_AUDIENCES) {
    for (const a of audiences) {
      const key = `${event}.${a}`;
      const text = (v[templateField(event, a)] ?? "").replace(/\r\n/g, "\n").trim();
      const fallback = DEFAULT_TEMPLATES[key as keyof typeof DEFAULT_TEMPLATES] ?? "";
      if (text.length > 1500) errors[templateField(event, a)] = "Keep the message under 1,500 characters.";
      else if (text && text !== fallback.trim()) templates[key] = text;
    }
  }

  const days = lines(v.balanceReminderDaysBefore).map(Number);
  if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 30)) errors.balanceReminderDaysBefore = "Use whole numbers from 0 to 30, separated by commas (0 = check-out morning).";

  if (Object.keys(errors).length) return { ok: false, errors };
  const parsed = notificationsSchema.safeParse({
    ...current,
    enabled: v.enabled === "on",
    channels: { whatsapp: v["channel:whatsapp"] === "on", sms: v["channel:sms"] === "on", telegram: v["channel:telegram"] === "on" },
    routes, recipients, templates,
    balanceReminderDaysBefore: [...new Set(days)].sort((x, y) => y - x),
  });
  if (!parsed.success) return { ok: false, errors: { form: parsed.error.issues[0]?.message ?? "Invalid settings." } };
  return { ok: true, value: parsed.data };
}

export function notificationsToForm(n: NotificationSettings): FormValues {
  const v: FormValues = {
    enabled: n.enabled ? "on" : "",
    "channel:whatsapp": n.channels.whatsapp ? "on" : "", "channel:sms": n.channels.sms ? "on" : "", "channel:telegram": n.channels.telegram ? "on" : "",
    balanceReminderDaysBefore: n.balanceReminderDaysBefore.join(", "),
  };
  for (const a of ["operator", "kitchen"] as const) for (const c of CHANNELS) v[recipientField(a, c)] = n.recipients[a][c].join("\n");
  for (const { event, audiences } of EVENT_AUDIENCES) {
    for (const a of audiences) {
      for (const c of channelsFor(a)) if (n.routes[event]?.[a]?.includes(c)) v[routeField(event, a, c)] = "on";
      const key = `${event}.${a}`;
      v[templateField(event, a)] = n.templates[key] ?? DEFAULT_TEMPLATES[key as keyof typeof DEFAULT_TEMPLATES] ?? "";
    }
  }
  return v;
}

/** One line for the audit log: which parts changed. */
export function describeNotificationChanges(before: NotificationSettings, after: NotificationSettings): string {
  const parts = (["enabled", "channels", "routes", "recipients", "templates", "balanceReminderDaysBefore"] as const)
    .filter((k) => stable(before[k]) !== stable(after[k]));
  return parts.length ? `notifications: ${parts.join(", ")} changed` : "notifications: saved with no changes";
}

/** JSON with sorted keys, sorted string lists and empty route objects dropped, so order doesn't count as a change. */
function stable(v: unknown): string {
  const norm = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.every((i) => typeof i === "string") ? [...x].sort() : x.map(norm);
    if (x && typeof x === "object") {
      return Object.fromEntries(Object.entries(x as Record<string, unknown>)
        .filter(([, val]) => !(val && typeof val === "object" && !Array.isArray(val) && Object.keys(val).length === 0))
        .sort(([a], [b]) => a.localeCompare(b)).map(([k, val]) => [k, norm(val)]));
    }
    return x;
  };
  return JSON.stringify(norm(v));
}
