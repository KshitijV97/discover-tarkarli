# Admin dashboard

Staff and admins manage the property at `/admin`. Sign-in is the same Google sign-in as guests (see [auth.md](auth.md)). Access comes only from the `STAFF_EMAILS` and `ADMIN_EMAILS` environment variables.

## Who can do what

| Page | Staff | Admin |
|---|---|---|
| `/admin` overview (arrivals, in-house, holds) | ✅ | ✅ |
| `/admin/bookings` list, filter by date | ✅ | ✅ |
| `/admin/bookings/[id]` detail: check in/out, cancel, record payments, notes, messages | ✅ | ✅ |
| `/admin/notifications` message log with resend | ✅ | ✅ |
| `/admin/rooms`, `/admin/menu` (prices, photos, availability) | redirected to `/account` | ✅ |
| `/admin/settings` (view and change settings, recent changes) | redirected to `/account` | ✅ |

Prices, tax and the deposit are admin-only. Day-to-day work (arrivals, payments at the desk, messages) is open to staff.

## Built
- **Overview:** arrivals today, guests in house, arrivals in the next 7 days, pending holds. Times use `settings.property.timezone`.
- **Bookings list:** every stay that overlaps a date range (default: today + 30 days). The reference links to the detail page.
- **Booking detail** (`/admin/bookings/[id]`):
  - **Actions:** check in (confirmed bookings, from the arrival date until check-out day), check out (checked-in bookings), cancel (pending or confirmed, with a confirm step). Rules are pure functions in `src/lib/admin/booking-ops.ts` and are re-checked under a row lock on the server.
  - **Cancelling** frees the rooms (the trigger clears `blocks_inventory`), sends `booking.cancelled` once, and adds a "refund to be handled manually" note when the deposit was paid. Automatic refunds come with P3.
  - **Payments:** total, paid and due come from the `payments` ledger (paid rows only; `conflict` rows show as a refund due). Staff record money taken at the property as `provider = 'manual'` with method cash, UPI, card or bank transfer, an optional note, and who recorded it. Amounts above the balance are refused. A hold paid at the desk becomes `confirmed`; a fully paid booking sends `booking.fully_paid` once. Two staff recording at the same moment can't double-count (row lock).
  - **Staff notes** (guests never see them), **messages** for the booking with resend, and a **history** of staff changes.
- **Messages** (`/admin/notifications`): the latest 100 notifications, filter by status, resend any of them. Resending on a channel that isn't set up reports that and sends nothing.
- **Rooms** and **menu** editors: add and edit, hide instead of delete (bookings and orders refer to them). Room price changes apply to new bookings only (price snapshots). Photo links must be `https://`. Duplicate room web addresses are refused.
- **Settings editor:** one form per group (property, deposit, meals, tax, booking rules), driven by `src/lib/admin/settings-form.ts` and re-validated with the zod schema on the server. Every save writes the changed fields to the audit log (for example `deposit.value: 30 → 25`) and shows under **Recent changes**.
- **Audit log:** `admin_audit_log` records every staff action above with the actor's email.

## Code map

| File | Role |
|---|---|
| `src/app/admin/layout.tsx` | Staff gate (`requireStaff()`) and navigation |
| `src/app/admin/page.tsx` | Overview |
| `src/app/admin/bookings/page.tsx` | Bookings list |
| `src/app/admin/bookings/[id]/page.tsx` | Booking detail |
| `src/app/admin/bookings/[id]/actions.ts` | Staff server actions: status, payment, notes, resend |
| `src/app/admin/bookings/[id]/BookingControls.tsx` | Client controls for the detail page |
| `src/app/admin/notifications/page.tsx` | Message log |
| `src/app/admin/rooms/*`, `src/app/admin/menu/*` | Rooms and menu editors (admin-only) |
| `src/app/admin/catalog-actions.ts` | Admin-only save actions for rooms and menu |
| `src/app/admin/settings/*` | Settings page, form and save action |
| `src/components/admin/*` | `StatusBadge`, `CatalogForm` |
| `src/lib/admin/booking-ops.ts` | Pure: allowed actions, ledger summary, manual payment validation |
| `src/lib/admin/catalog-forms.ts` | Pure: room and menu fields, parsing and validation |
| `src/lib/admin/settings-form.ts`, `diff.ts` | Pure: settings form mapping; changed-field diff for the audit log |
| `src/lib/server/admin-bookings.ts` | Booking detail, status actions, manual payments, notes |
| `src/lib/server/catalog-repo.ts` | Rooms and menu reads and writes |
| `src/lib/server/audit-repo.ts` | `writeAudit()`, `listAudit()` |
| `src/lib/server/notify.ts` | `resendNotification()`, `listNotifications()` |
| `src/lib/server/admin-repo.ts` | Overview counts, bookings list, settings upsert |
| `src/lib/server/session.ts` | `requireStaff()`, `requireAdmin()` |

## Adding a setting to the form
1. Add the field with a default in `src/lib/settings.ts` (zod schema). This is the source of truth.
2. Add the matching `FieldDef` to the right group in `SETTINGS_GROUPS` (`src/lib/admin/settings-form.ts`). Every field in the group must appear here, or saving drops it.
3. Run `npm test`. The round-trip test fails if a default cannot be shown or saved.
4. Update [configuration.md](configuration.md) if the setting is user-facing.

## Not built yet (rest of P2, see [roadmap.md](roadmap.md))
- Editing a booking's rooms and dates, and staff meal edits past the cutoff (the service already supports `bypassCutoff`)
- Notification routing and recipients editor
- Theme editor
- Photo upload (today: paste https links)
