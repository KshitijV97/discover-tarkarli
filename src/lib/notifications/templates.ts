import type { Audience, NotificationEvent, TemplateVars } from "./types";

/**
 * Default message text per "event.audience". Override any of them at runtime
 * via settings.notifications.templates. Placeholders: {{varName}} — see
 * bookingVars() in context.ts for the available variables.
 * WhatsApp/Telegram support *bold* and _italic_.
 */
export const DEFAULT_TEMPLATES: Partial<Record<`${NotificationEvent}.${Audience}`, string>> = {
  "booking.pending.operator":
    "🕒 New booking {{reference}} awaiting deposit\n{{guestName}} ({{guestPhone}})\n{{checkIn}} → {{checkOut}} · {{rooms}} · {{numGuests}} guests\nTotal {{total}}",

  "booking.confirmed.guest":
    "Hi {{guestFirstName}}, your stay at *{{propertyName}}* is confirmed! 🌊\n\n*Booking:* {{reference}}\n*Dates:* {{checkIn}} → {{checkOut}} ({{nights}} nights)\n*Rooms:* {{rooms}}\n*Guests:* {{numGuests}}\n\n*Total:* {{total}}\n*Deposit received:* {{depositPaid}}\n*Balance due at property:* {{balance}}\n\nMeals: {{mealSummary}}\nChange meals until {{mealCutoff}} the day before: {{manageUrl}}",
  "booking.confirmed.operator":
    "✅ Booking confirmed {{reference}}\n{{guestName}} ({{guestPhone}})\n{{checkIn}} → {{checkOut}} · {{rooms}} · {{numGuests}} guests\nTotal {{total}} · Deposit {{depositPaid}} · Balance {{balance}}\nMeals: {{mealSummary}}",

  "booking.meals_updated.guest":
    "Hi {{guestFirstName}}, your meals for booking {{reference}} are updated.\n\n{{mealDetail}}\n\nNew total: {{total}} · Balance due: {{balance}}\nManage: {{manageUrl}}",
  "booking.meals_updated.operator":
    "🍽️ Meals updated · {{reference}} ({{guestName}})\n{{mealDetail}}\nNew total {{total}}",

  "booking.cancelled.guest":
    "Hi {{guestFirstName}}, your booking {{reference}} ({{checkIn}} → {{checkOut}}) has been cancelled. Questions? Call {{propertyPhone}}.",
  "booking.cancelled.operator": "❌ Booking cancelled {{reference}} · {{guestName}} · {{checkIn}} → {{checkOut}}",

  "booking.balance_reminder.guest":
    "Hi {{guestFirstName}}, a reminder that the balance of *{{balance}}* for booking {{reference}} is due at check-out on {{checkOut}}. We accept UPI, card and cash. Thank you for staying with us!",

  "booking.fully_paid.guest":
    "Thank you, {{guestFirstName}}! We've received full payment of {{total}} for booking {{reference}}. Hope to see you again at {{propertyName}} 🌅",

  "payment.conflict.operator":
    "⚠️ PAYMENT NEEDS ATTENTION · {{reference}}\n{{guestName}} ({{guestPhone}}) paid {{amount}} after their hold expired and the room was taken. Refund or rebook manually. Payment id: {{paymentId}}",

  "order.placed.kitchen": "🧾 New order · Room {{room}} · {{guestName}}\n{{orderItems}}\nTotal {{orderTotal}}",
  "order.updated.kitchen": "✏️ Order updated · Room {{room}} · {{guestName}}\n{{orderItems}}",

  "kitchen.daily_summary.kitchen": "📋 Meals for {{date}}\nBreakfast: {{breakfast}}\nLunch: {{lunch}}\nDinner: {{dinner}}\n\n{{detail}}",
};

export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => vars[k] ?? "");
}

export function resolveTemplate(event: NotificationEvent, audience: Audience, overrides: Record<string, string>): string | null {
  const key = `${event}.${audience}` as const;
  return overrides[key] ?? DEFAULT_TEMPLATES[key] ?? null;
}
