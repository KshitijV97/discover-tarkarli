import { z } from "zod";
import { AUDIENCES, CHANNELS, NOTIFICATION_EVENTS } from "./types";

/**
 * Notification settings (settings row key "notifications"). Everything that
 * is not a secret is configurable at runtime; secrets (API tokens) stay in env.
 *
 * routes:     event → audience → channels to use
 * recipients: staff numbers / Telegram chat ids per audience
 * templates:  override message text per "event.audience" (see templates.ts)
 * whatsappTemplates / smsTemplates: provider-approved template mappings
 */
const channel = z.enum(CHANNELS);
const audienceRoutes = z.object(Object.fromEntries(AUDIENCES.map((a) => [a, z.array(channel).optional()])) as Record<(typeof AUDIENCES)[number], z.ZodOptional<z.ZodArray<typeof channel>>>);
const recipientList = z.object({
  whatsapp: z.array(z.string()).default([]),
  sms: z.array(z.string()).default([]),
  telegram: z.array(z.string()).default([]),
});

export const notificationsSchema = z.object({
  enabled: z.boolean().default(true),
  channels: z.object({
    whatsapp: z.boolean().default(true),
    sms: z.boolean().default(false),
    telegram: z.boolean().default(true),
  }).default({}),
  routes: z.record(z.enum(NOTIFICATION_EVENTS), audienceRoutes).default({
    "booking.pending": { operator: ["telegram"] },
    "booking.confirmed": { guest: ["whatsapp"], operator: ["whatsapp", "telegram"] },
    "booking.meals_updated": { guest: ["whatsapp"], operator: ["whatsapp", "telegram"] },
    "booking.cancelled": { guest: ["whatsapp"], operator: ["whatsapp", "telegram"] },
    "booking.balance_reminder": { guest: ["whatsapp"] },
    "booking.fully_paid": { guest: ["whatsapp"] },
    "payment.conflict": { operator: ["whatsapp", "telegram", "sms"] },
    "order.placed": { kitchen: ["whatsapp", "telegram"] },
    "order.updated": { kitchen: ["whatsapp", "telegram"] },
    "kitchen.daily_summary": { kitchen: ["whatsapp", "telegram"] },
  }),
  recipients: z.object({
    operator: recipientList.default({}),
    kitchen: recipientList.default({}),
  }).default({}),
  /** Free-text overrides, key "event.audience". */
  templates: z.record(z.string()).default({}),
  /**
   * WhatsApp Cloud API: business-initiated messages outside the 24h service
   * window MUST use a Meta-approved template. Map "event.audience" → template;
   * `params` lists template variables (in order) to fill the body placeholders.
   * Without a mapping, a plain text message is sent (works only inside the 24h window).
   */
  whatsappTemplates: z.record(z.object({
    name: z.string(),
    language: z.string().default("en"),
    params: z.array(z.string()).default([]),
  })).default({}),
  /** SMS (India DLT): "event.audience" → provider template id + ordered variables. */
  smsTemplates: z.record(z.object({
    templateId: z.string(),
    params: z.array(z.string()).default([]),
  })).default({}),
  /** Days before check-out to send balance reminders (0 = on check-out morning). */
  balanceReminderDaysBefore: z.array(z.number().int().min(0)).default([1, 0]),
});

export type NotificationSettings = z.infer<typeof notificationsSchema>;
