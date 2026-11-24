/**
 * Notification vocabulary. Add an event here, give it default templates in
 * templates.ts and default routes in config.ts — the dispatcher does the rest.
 */
export const NOTIFICATION_EVENTS = [
  "booking.pending",          // booking created, awaiting deposit
  "booking.confirmed",        // deposit paid (or payments off) — confirmation + receipt
  "booking.meals_updated",    // meal selection changed
  "booking.cancelled",
  "booking.updated",          // staff changed dates, rooms or guests
  "booking.balance_reminder", // before/at checkout
  "booking.fully_paid",       // balance settled — final receipt
  "payment.conflict",         // paid but couldn't confirm (refund needed)
  "order.placed",             // à la carte order → kitchen
  "order.updated",
  "kitchen.daily_summary",    // tomorrow's meal counts
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export const AUDIENCES = ["guest", "operator", "kitchen"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const CHANNELS = ["whatsapp", "sms", "telegram"] as const;
export type ChannelName = (typeof CHANNELS)[number];

/** Flat string variables available to templates, e.g. {{guestName}}. */
export type TemplateVars = Record<string, string>;

export interface OutboundMessage {
  channel: ChannelName;
  event: NotificationEvent;
  audience: Audience;
  to: string;        // E.164 phone, or Telegram chat id
  text: string;      // rendered free-text body
  vars: TemplateVars;
}

export interface SendResult {
  providerMessageId?: string;
}

export interface NotificationChannel {
  name: ChannelName;
  /** True when credentials are present (env). Unconfigured channels are logged as "skipped". */
  isConfigured(): boolean;
  send(msg: OutboundMessage, ctx: { settings: import("@/lib/settings").AppSettings }): Promise<SendResult>;
}
