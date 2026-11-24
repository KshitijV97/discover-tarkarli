# Notifications (WhatsApp · SMS · Telegram)

Every guest/staff update goes through one dispatcher, so any event can be sent over any channel, and routing, recipients and wording are configurable without code changes.

## How it works
```
notify(event, { booking?, vars?, dedupeKey? })          src/lib/server/notify.ts
  → planDeliveries()   routes × recipients × templates   src/lib/notifications/plan.ts (pure)
  → insert into notifications (queued | skipped)          outbox + log, deduped
  → channel.send()     WhatsApp / SMS / Telegram          src/lib/notifications/channels/*
  → row → sent | failed  (failed rows retried by cron)
```
- `notify()` **never throws** — a messaging outage can't break a booking or payment.
- A channel is used only if (a) enabled in `settings.notifications.channels` and (b) its env credentials exist. Otherwise the row is logged as `skipped` with the reason (and printed to the console in development).
- `dedupe_key` stops duplicates (e.g. payment confirmed by both browser callback and webhook).
- Failed sends are retried by `/api/cron/notifications` and the daily cron, up to 5 attempts.

## Events

| Event | Fired when | Default routes |
|---|---|---|
| `booking.pending` | booking created, awaiting deposit | operator: Telegram |
| `booking.confirmed` | deposit paid, or booking created with online payment off | guest: WhatsApp · operator: WhatsApp, Telegram |
| `booking.meals_updated` | guest edits meals | guest: WhatsApp · operator: WhatsApp, Telegram |
| `booking.cancelled` | staff cancel in the admin | guest: WhatsApp · operator: WhatsApp, Telegram |
| `booking.updated` | staff change dates, rooms or guests in the admin | guest: WhatsApp · operator: Telegram |
| `booking.balance_reminder` | daily cron, N days before check-out (`balanceReminderDaysBefore`, default `[1, 0]`) | guest: WhatsApp |
| `booking.fully_paid` | desk payments cover the total (admin) | guest: WhatsApp |
| `payment.conflict` | paid after hold expired and room taken | operator: WhatsApp, Telegram, SMS |
| `order.placed` / `order.updated` | *(à la carte, upcoming)* | kitchen: WhatsApp, Telegram |
| `kitchen.daily_summary` | daily cron — tomorrow's meal counts | kitchen: WhatsApp, Telegram |

Audiences: **guest** (booking phone — WhatsApp/SMS only), **operator**, **kitchen** (recipient lists in settings).

## Configuration
**Edit it at `/admin/settings/notifications`** (admin only): master switch, channels on/off (with whether each channel's keys are set), staff and kitchen recipients (phones normalised to E.164, Telegram chat ids or @channel), a matrix of which message goes to whom on which channel (Telegram is never offered for guests), message wording per event and audience (only edited wording is stored; **Reset to default** restores it), and balance reminder days. Provider template mappings (`whatsappTemplates`, `smsTemplates`) are kept as they are and still set by SQL. Every save is in the audit log.

All of it lives in the `settings` row with key `notifications` (schema: `src/lib/notifications/config.ts`). Example:

```sql
insert into settings (key, value) values ('notifications', '{
  "enabled": true,
  "channels": { "whatsapp": true, "sms": false, "telegram": true },
  "recipients": {
    "operator": { "whatsapp": ["+919800000000"], "telegram": ["-1001234567890"], "sms": [] },
    "kitchen":  { "whatsapp": [], "telegram": ["-1009876543210"], "sms": [] }
  },
  "routes": {
    "booking.confirmed": { "guest": ["whatsapp", "sms"], "operator": ["telegram"] }
  },
  "templates": {
    "booking.confirmed.guest": "Namaste {{guestFirstName}}! Booking {{reference}} confirmed for {{checkIn}}."
  },
  "whatsappTemplates": {
    "booking.confirmed.guest": { "name": "booking_confirmed", "language": "en",
      "params": ["guestFirstName", "reference", "checkIn", "checkOut", "depositPaid", "balance", "manageUrl"] }
  },
  "smsTemplates": {
    "booking.confirmed.guest": { "templateId": "6650...", "params": ["reference", "checkIn"] }
  },
  "balanceReminderDaysBefore": [1, 0]
}')
on conflict (key) do update set value = excluded.value;
```
> `routes` replaces the whole default routes map when set — include every event you want.

### Template variables (booking events)
`reference, guestName, guestFirstName, guestPhone, numGuests, checkIn, checkOut, nights, rooms, total, deposit, depositPaid, balance, mealSummary, mealDetail, mealCutoff, manageUrl, propertyName, propertyPhone`
Extra per event: `payment.conflict` → `amount, paymentId`; `kitchen.daily_summary` → `date, breakfast, lunch, dinner, detail`.

Default wording: `src/lib/notifications/templates.ts`. Override any `event.audience` in `templates`.

## Channels

### WhatsApp (Meta WhatsApp Cloud API)
Env: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, optional `WHATSAPP_API_VERSION`.
1. Meta Business account → developers.facebook.com → create app → add **WhatsApp** product.
2. Add and verify the business phone number; note the **Phone number ID**.
3. Create a **System User** with a permanent token (`whatsapp_business_messaging` permission).
4. **Message templates**: business-initiated messages (confirmations, reminders) sent outside a 24-hour customer-service window **must** use Meta-approved templates. Create them in WhatsApp Manager (category *Utility*), with body placeholders `{{1}}…{{n}}`, then map them in `whatsappTemplates` with `params` in placeholder order. Without a mapping the app sends free text, which only works inside the 24h window (fine for staff numbers that message the business daily).

### Telegram (recommended for staff — free, instant)
Env: `TELEGRAM_BOT_TOKEN`.
1. Talk to **@BotFather** → `/newbot` → copy token.
2. Create an "Operator" and/or "Kitchen" group, add the bot.
3. Send any message in the group, then open `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy the `chat.id` (negative for groups).
4. Put chat ids in `recipients.operator.telegram` / `recipients.kitchen.telegram`.

### SMS
Env: `SMS_PROVIDER=msg91` + `MSG91_AUTH_KEY`, **or** `SMS_PROVIDER=twilio` + `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`.
- India requires **DLT registration** (entity + sender id + each template) for all commercial SMS. With MSG91, map each `event.audience` to its DLT template id in `smsTemplates`; `params` fill `var1…varN`.
- SMS is disabled by default (`channels.sms: false`).

## Adding a channel (e.g. email)
1. Add `"email"` to `CHANNELS` in `src/lib/notifications/types.ts`.
2. Implement `NotificationChannel` in `src/lib/notifications/channels/email.ts` (`isConfigured()` from env, `send()`).
3. Register it in `channels/index.ts`; add `email` to the `channels` and `recipients` schema in `config.ts`.
4. Guest recipient resolution lives in `plan.ts` (use `booking.guestEmail`).

## Adding an event
1. Add it to `NOTIFICATION_EVENTS` (`types.ts`).
2. Add default text in `templates.ts` and default routes in `config.ts`.
3. Call `notify("your.event", { booking, dedupeKey })` where it happens.
4. Document it in the table above.

## Inspecting delivery
```sql
select created_at, event, audience, channel, recipient, status, last_error
from notifications order by created_at desc limit 50;
```
