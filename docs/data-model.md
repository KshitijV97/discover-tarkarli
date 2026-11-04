# Data model

PostgreSQL 13+ (Supabase today). Schema lives in `db/migrations/*.sql`, applied in filename order by `npm run db:migrate` and tracked in `schema_migrations`. Migrations are **append-only**: never edit one that has been applied anywhere.

Only one extension is used: `btree_gist` (standard contrib, available on every managed Postgres).

## Tables

### `rooms`
| Column | Notes |
|---|---|
| `id` uuid | |
| `name`, `slug` (unique), `description` | |
| `max_occupancy` int | > 0 |
| `base_price` numeric | per room per night, **excl. GST** |
| `photos` text[] | public URLs (any storage host) |
| `amenities` text[] | |
| `sort_order`, `active` | inactive rooms are hidden and unbookable |

### `bookings`
| Column | Notes |
|---|---|
| `reference` | human code `GT-XXXXXX` (no 0/O/1/I) |
| `access_token` | secret for the guest's manage link `/booking/<token>` |
| `guest_name`, `guest_phone` (E.164), `guest_email` (lower-cased) | |
| `num_guests` | sum of `booking_rooms.guests` |
| `check_in`, `check_out` | date; `check_out > check_in` |
| `status` | `pending · confirmed · checked_in · checked_out · cancelled · expired` |
| `expires_at` | hold deadline while `pending` |
| `subtotal_amount`, `tax_amount`, `total_amount`, `deposit_amount` | stored totals, kept in sync on edits |
| `deposit_paid`, `deposit_paid_at`, `balance_paid`, `balance_paid_at` | |
| `notes` | staff notes (also used to flag payment conflicts) |

### `booking_rooms`
| Column | Notes |
|---|---|
| `booking_id`, `room_id` | PK |
| `guests` | per-room headcount |
| `price_per_night`, `gst_rate` | snapshot at booking |
| `stay` daterange | `[check_in, check_out)` — **maintained by trigger** |
| `blocks_inventory` bool | true for blocking statuses — **maintained by trigger** |

**Constraint `booking_rooms_no_overlap`**: `EXCLUDE USING gist (room_id WITH =, stay WITH &&) WHERE (blocks_inventory)`. This is the double-booking guarantee — it holds under concurrency and for any code path (including manual SQL).

**Triggers**
- `booking_rooms_before_insert` (insert/update on `booking_rooms`): copies `stay` and `blocks_inventory` from the parent booking.
- `bookings_after_update`: when a booking's dates or status change, updates its `booking_rooms` (so extending a stay into an occupied range fails, and cancelling frees the room).

### `booking_meals`
| Column | Notes |
|---|---|
| `booking_id`, `date`, `meal_type` | unique together |
| `quantity` | headcount |
| `price_at_booking`, `gst_rate` | unit price snapshot (₹0/0% when included) |
| `included_free` | breakfast included in room rate |

### `payments`
Ledger for online and manual payments.
| Column | Notes |
|---|---|
| `kind` | `deposit · balance · other` |
| `provider` | `razorpay · manual · …` |
| `method` | `upi · card · cash · …` |
| `amount`, `currency` | |
| `status` | `created · paid · failed · conflict · refunded` |
| `provider_order_id`, `provider_payment_id` | unique per provider |
| `failure_reason`, `raw` (jsonb) | audit |

### `notifications`
Outbox + delivery log.
| Column | Notes |
|---|---|
| `event`, `audience`, `channel`, `recipient` | |
| `booking_id` | optional link |
| `body`, `vars` | rendered text + variables (for template-based providers) |
| `status` | `queued · sent · failed · skipped` |
| `attempts`, `last_error`, `provider_message_id`, `sent_at` | |
| `dedupe_key` (unique) | prevents duplicate sends |

### `users`, `user_identities`
Accounts for optional guest sign-in and staff access. See [auth.md](auth.md).
| Column | Notes |
|---|---|
| `email` (unique, lower-case), `email_verified_at` | null for future phone-only users |
| `phone` (unique, E.164), `phone_verified_at` | future phone OTP |
| `name`, `image` | from Google profile |
| `role` | `guest · staff · admin`, set from env allow-lists at each sign-in |
`user_identities (provider, provider_account_id) → user_id` links several sign-in methods to one user.
`bookings.user_id` (nullable) links bookings made while signed in.

### `menu_items`, `ala_carte_orders`, `ala_carte_order_items`
Created for the upcoming à la carte feature. Order items snapshot `price_at_order` and `gst_rate`.

### `settings`
`key text PK, value jsonb`. One row per settings group (`deposit`, `meals`, `tax`, `booking`, `property`, `notifications`, `theme`). Missing rows/fields fall back to code defaults. See [configuration.md](configuration.md).

## Functions
- `expire_stale_bookings()` → marks lapsed `pending` bookings `expired` (releasing rooms via trigger). Returns count.
- `booking_status_blocks(status)` → whether a status holds inventory.

## Security
The app connects with a privileged role and does all authorization in server code. **RLS is enabled with no policies** on every table so Supabase's public `anon`/`authenticated` API keys cannot read or write anything. On plain Postgres this is a no-op.

## Conventions
- Money: `numeric(12,2)` rupees in DB ↔ integer paise in code (`rupeesToPaise` / `paiseToRupeesString`).
- Dates: `date` columns are returned as `YYYY-MM-DD` strings (configured in `lib/server/db.ts`).
- Every table has `created_at`/`updated_at` (trigger-maintained) where rows change.
