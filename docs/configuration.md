# Configuration

Two places:
- **Environment variables** — secrets and infrastructure. Never in the DB or git.
- **`settings` table** — business rules, editable at runtime from `/admin/settings` (admin only; deposit, meals, GST, booking rules and property are editable, notifications and theme are not yet). Typed with defaults in `src/lib/settings.ts`; a missing or invalid row falls back to defaults (invalid rows log a warning).

## Environment variables
See `.env.example` (copy to `.env.local` for development).

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string. Supabase: **Transaction pooler** URI (port 6543). |
| `DATABASE_POOL_MAX` | | Connections per instance (default 5, minimum 3). **Don't use 1** with a transaction pooler: concurrent queries get pipelined on one connection and hang. |
| `NEXT_PUBLIC_SITE_URL` | ✅ prod | Absolute base URL for links in messages. |
| `CRON_SECRET` | ✅ prod | Bearer token for `/api/cron/*`. Vercel Cron sends it automatically when set. |
| `AUTH_SECRET` | ✅ prod | Signs session cookies. `openssl rand -base64 32`. |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | for Google sign-in | OAuth client; see [auth.md](auth.md). |
| `ADMIN_EMAILS`, `STAFF_EMAILS` | | Comma-separated allow-lists for staff/admin roles. |
| `PAYMENT_PROVIDER` | | `razorpay` (default). |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | for payments | Enables online deposits. |
| `RAZORPAY_WEBHOOK_SECRET` | for payments | Verifies webhooks. |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION` | for WhatsApp | Meta Cloud API. |
| `TELEGRAM_BOT_TOKEN` | for Telegram | |
| `SMS_PROVIDER` | for SMS | `msg91` or `twilio`. |
| `MSG91_AUTH_KEY` | msg91 | |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | twilio | |

## Settings (`settings` table)
Each group is one row: `key` = group name, `value` = JSON (partial is fine — missing fields use defaults).

### `deposit`
| Field | Default | |
|---|---|---|
| `type` | `"percent"` | `percent` or `fixed` |
| `value` | `30` | % of total incl. GST, or ₹ amount |

### `meals`
| Field | Default | |
|---|---|---|
| `breakfastIncluded` | `true` | |
| `breakfastPrice` | `350` | ₹/person when not included |
| `lunchPrice` | `550` | ₹/person excl. GST |
| `dinnerPrice` | `650` | ₹/person excl. GST |
| `cutoffTime` | `"18:00"` | HH:mm property time |
| `cutoffDaysBefore` | `1` | days before the meal's date |

### `tax`
| Field | Default | |
|---|---|---|
| `roomRateLow` / `roomRateHigh` | `5` / `18` | % |
| `roomThreshold` | `7500` | ₹ per room-night |
| `foodRate` | `5` | % |
| `intraState` | `true` | CGST+SGST vs IGST display |

### `booking`
| Field | Default | |
|---|---|---|
| `minNights` / `maxNights` | `1` / `30` | |
| `maxAdvanceDays` | `365` | |
| `holdMinutes` | `15` | pending hold length |
| `paymentsEnabled` | `true` | online deposit (only if a provider is configured) |
| `checkInTime` / `checkOutTime` | `"14:00"` / `"11:00"` | |

### `property`
`name`, `timezone` (`Asia/Kolkata`), `phone`, `email`, `address`, `gstin`.

### `notifications`
See [notifications.md](notifications.md).

### `theme`
Partial override of `src/theme/theme.config.ts`. See [design-system.md](design-system.md).

## Changing a setting (until the admin page exists)
```sql
update settings set value = value || '{"value": 25}' where key = 'deposit';
update settings set value = value || '{"dinnerPrice": 700}' where key = 'meals';
```
Changes apply on the next request (no cache).
