# 01 · Tenancy core

> **Status: Ready.** Depends on: nothing. Feature ids: **F-TEN**. Read first: [multi-tenancy.md](../multi-tenancy.md), [GLOSSARY.md](../../GLOSSARY.md), ADR 018.

## Problem
The code serves exactly one property. The marketplace needs many **Partners** in one database with **no data leakage**, so a bug in one query can't expose another Partner's guests. Golden Tide Retreat must become Partner #1 with no visible change.

## Users and stories
- As the **Owner**, I can have several Partners in one database, and none of them can ever read another's rows.
- As **Golden Tide Retreat's** guests and staff, everything works exactly as before.
- As a developer or agent, I can't accidentally write a query that leaks across Partners, because the database refuses it.

## Scope
- A `partners` table. Golden Tide Retreat is seeded as Partner #1 with a fixed, well-known id.
- `partner_id` on every partner-owned table: `rooms`, `bookings`, `booking_rooms`, `booking_meals`, `menu_items`, `ala_carte_orders`, `ala_carte_order_items`, `payments`, `notifications`, `admin_audit_log`, and partner-scoped `settings`.
- The double-booking exclusion constraint keeps its meaning, now scoped by Partner.
- Postgres **row-level security** on every partner-owned table, enforced for the app's database role.
- Every DB access to partner data runs inside a request-scoped context that sets the current Partner.
- An **isolation test suite** that stays green in CI from now on.

## Non-goals
Consoles and roles (plan 02), listing or marketplace pages (plan 03), domains and host resolution beyond Partner #1 (plan 03).

## Decisions (made)
- **Column name:** `partner_id`, not `tenant_id`. "Partner" is the glossary term. Docs that say `tenant_id` mean the same thing; update them as you touch them.
- **Partner-scoped settings:** the `settings` primary key becomes `(partner_id, key)`. Platform-wide settings use a separate `platform_settings` table (plan 02). Code defaults stay in `src/lib/settings.ts`.
- **RLS mechanics:**
  - Create a `app_partner` role with `NOBYPASSRLS` and `FORCE ROW LEVEL SECURITY` on every partner table.
  - Each partner-scoped transaction runs `select set_config('app.partner_id', $1, true)` and `set local role app_partner`.
  - The policy is `partner_id = current_setting('app.partner_id')::uuid`.
  - Both settings are transaction-local, so they're safe under the transaction pooler (Supavisor).
  - A `withPartner(partnerId, fn)` helper in `src/lib/server/db.ts` is the only way partner repos get a connection.
- **Platform-level reads** (cross-Partner search, Usage dashboards) use a separate, explicit `withPlatform(fn)` helper. It doesn't set the role, and it may only call functions in a `platform-*` repo. A lint rule or unit test fails the build if a non-platform module imports `withPlatform`.
- **Partner #1's id** is a constant in the seed and migrations, never hardcoded in app code. App code gets the Partner from the request context.

## Slices

### S1 · Partners table and partner_id columns — `todo`
- **Changes:**
  - Migration `0006_partners.sql`: create `partners` (`id uuid`, `slug unique`, `name`, `partner_type`, `status` [`applied`, `active`, `suspended`], `created_at`).
  - Insert Partner #1 (`golden-tide-retreat`, type `stay`, `active`).
  - Add `partner_id uuid not null default '<partner-1-id>' references partners`, then drop the default in the same migration, after the backfill.
  - Rebuild the exclusion constraint as `(partner_id WITH =, room_id WITH =, stay WITH &&)`. Room ids are unique anyway; this keeps the meaning and makes the scoping explicit.
- **Acceptance:**

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-TEN-07 | After migration, every existing row belongs to Partner #1, and every partner-owned table has a non-null `partner_id` | int | N |
| TC-TEN-03 | The same room name and dates can be booked under two Partners (no cross-Partner overlap) | int | N |
| TC-TEN-08 | Double-booking within one Partner still returns 409 (`23P01`) | int | S |

- **Docs:** [data-model.md](../data-model.md).

### S2 · Request-scoped Partner context and repos — `todo` (depends S1)
- **Changes:**
  - Add `withPartner(partnerId, fn)` and `withPlatform(fn)` in `db.ts`.
  - Every repo and service in `src/lib/server/*` takes the transaction from the context instead of calling `db()` directly. Services receive `partnerId` explicitly; nothing reads a global.
  - Public routes and the admin resolve the Partner as Partner #1 for now, through one function, `resolvePartner(request)`, so plan 03 can swap in path and domain resolution.
- **Acceptance:**

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-TEN-09 | A unit test fails if any file under `src/lib/server` (except `db.ts` and `platform-*`) calls `db()` directly | unit | N |
| TC-TEN-10 | All existing unit and integration tests pass unchanged in behaviour | int | S |

- **Docs:** [architecture.md](../architecture.md).

### S3 · Row-level security — `todo` (depends S2)
- **Changes:** Migration `0007_rls.sql` adds the `app_partner` role, policies, and `FORCE ROW LEVEL SECURITY` on every partner table. The integration harness creates the role too.
- **Acceptance:**

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-TEN-11 | Inside `withPartner(A)`, `select * from bookings` returns only A's rows, even though the query has no `where` | int | S |
| TC-TEN-12 | Inside `withPartner(A)`, inserting or updating a row with `partner_id = B` fails | int | S |
| TC-TEN-13 | With no Partner set, partner tables return zero rows (fail closed) | int | N |
| TC-TEN-14 | The settings for `key = 'deposit'` differ between A and B, and each sees only its own | int | N |

### S4 · Isolation suite as a standing regression group — `todo` (depends S3)
- **Changes:**
  - Add `src/test/integration/isolation.int.test.ts`. It seeds Partners A and B with a room, a booking, a payment, a notification and settings each. For **every** partner table, it asserts that A can't read, update or delete B's rows through the real repos and through raw SQL.
  - A meta-test reads `information_schema` and fails if a table with a `partner_id` column has no policy, or is missing from the suite.
- **Acceptance:**

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-TEN-01 | Partner A's staff can't see Partner B's bookings via repo, API route or direct id | int | S |
| TC-TEN-02 | A booking token from Partner A returns 404 when resolved under Partner B | int | N |
| TC-TEN-15 | Every table with `partner_id` has an RLS policy and appears in the isolation suite (meta-test) | int | S |

- **Docs:** [testing/README.md](../testing/README.md) (mark the isolation group as standing). Update [multi-tenancy.md](../multi-tenancy.md) to "P4 core built".

## Open questions
None that block. Defaults are stated above. Revisit in refinement only if you want different role names or a different column name.

## Done when
S1–S4 are `done`. F-TEN shows Built for core isolation in the catalog, CI runs the isolation suite, and Golden Tide's smoke suite passes in production.
