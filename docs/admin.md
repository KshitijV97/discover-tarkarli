# Admin dashboard

Staff and admins manage the property at `/admin`. Sign-in is the same Google sign-in as guests (see [auth.md](auth.md)). Access comes only from the `STAFF_EMAILS` and `ADMIN_EMAILS` environment variables.

## Who can do what

| Page | Staff | Admin |
|---|---|---|
| `/admin` overview (arrivals, in-house, holds) | ✅ | ✅ |
| `/admin/bookings` (list, filter by date) | ✅ | ✅ |
| `/admin/settings` (view and change settings) | redirected to `/account` | ✅ |

Settings are admin-only because they change prices, tax and the deposit.

## Built (first slice)
- **Overview:** arrivals today, guests in house, arrivals in the next 7 days, pending holds. Times use `settings.property.timezone`.
- **Bookings:** every stay that overlaps a date range (default: today + 30 days). Shows reference, guest, stay, rooms, status, total, deposit and balance status.
- **Settings editor:** one form per group (property, deposit, meals, tax, booking rules). Each form saves on its own.
  - The form is driven by field descriptions in `src/lib/admin/settings-form.ts`.
  - The server re-validates every value with the group's zod schema from `src/lib/settings.ts`. The form is never trusted.
  - Saving revalidates the whole site, so the footer, prices and booking rules update at once.
  - Every save is logged to the server console with the admin's email.

## Code map

| File | Role |
|---|---|
| `src/app/admin/layout.tsx` | Staff gate (`requireStaff()`) and navigation |
| `src/app/admin/page.tsx` | Overview |
| `src/app/admin/bookings/page.tsx` | Bookings list |
| `src/app/admin/settings/page.tsx` | Settings page (admin gate) |
| `src/app/admin/settings/actions.ts` | `saveSettingsGroupAction`: admin-only server action |
| `src/app/admin/settings/SettingsGroupForm.tsx` | Client form for one group |
| `src/lib/admin/settings-form.ts` | Pure: field definitions, form ↔ settings mapping, validation |
| `src/lib/admin/settings-form.test.ts` | Unit tests |
| `src/lib/server/admin-repo.ts` | Admin queries and the settings upsert |
| `src/lib/server/session.ts` | `requireStaff()`, `requireAdmin()` |

## Adding a setting to the form
1. Add the field with a default in `src/lib/settings.ts` (zod schema). This is the source of truth.
2. Add the matching `FieldDef` to the right group in `SETTINGS_GROUPS` (`src/lib/admin/settings-form.ts`). Every field in the group must appear here, or saving drops it.
3. Run `npm test`. The round-trip test fails if a default cannot be shown or saved.
4. Update [configuration.md](configuration.md) if the setting is user-facing.

## Not built yet (see [roadmap.md](roadmap.md))
- Booking detail: meal selections, edit rooms and dates (cutoff bypass), cancel, check-in and check-out
- Recording balance payments (`provider = 'manual'`)
- Rooms and photos, menu items
- Notification settings and notification log with resend
- Theme editor
- An audit table for settings changes (today: server log only)
