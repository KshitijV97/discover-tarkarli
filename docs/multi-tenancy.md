# Future: multi-tenant white-label SaaS (TODO, major)

> **Status: planned, not started (0% built).** This is the largest structural change on the roadmap. It changes the data model, so it must be planned before more tables are added. Every new feature should be written as if a second property will use it.

## Current status (audit)

Nothing in `src/`, `db/` or `scripts/` mentions a tenant. The app is a single-property app. What that means in practice:

| Area | Today | Gap for selling to other buyers |
|---|---|---|
| Data | No `tenant_id` anywhere. `settings` is keyed by `key` only. | Add `tenants`, `tenant_id` on every owned table, per-tenant settings. |
| Tenant resolution | None. One site, one `NEXT_PUBLIC_SITE_URL`. | Resolve tenant from the `Host` header. |
| Roles | `ADMIN_EMAILS` / `STAFF_EMAILS` env vars, global. | Roles in a table, scoped per tenant, plus a platform-admin role for you. |
| Secrets | Razorpay, WhatsApp, SMS keys in env, global. | Per-tenant encrypted credentials (or per-deployment env in the silo model). |
| Branding and copy | `src/content/site.ts` and `src/theme/theme.config.ts` are **code**. Theme override exists in `settings` but has no editor. | Move content, photos and theme to tenant config editable from admin. |
| Feature flags | None. Every feature is always on. `booking.paymentsEnabled` is the only switch. | Module registry with entitlements (you set) and preferences (tenant admin sets). |
| Domains | One. | Domain table, DNS and TLS onboarding. |
| Isolation tests | None. | A suite that proves tenant A cannot read tenant B. |
| Good news | Pure domain core, provider interfaces (`PaymentProvider`, `NotificationChannel`), no Vercel-only APIs, no supabase-js. | Most of the code does not change. |

**You can sell today, with a caveat.** The repo can be deployed once per buyer (new Vercel project, new Postgres, own env vars) with **no code change**. That is the "silo" tier below. The caveat: each buyer's look, copy and photos are code, so every buyer would need their own branch. Stage M0 in the roadmap removes that caveat by moving branding and copy into tenant config, which makes the silo tier sellable from one codebase.

## Blast radius: the "cell" model (recommended)

You said you don't mind shared or separate infra, as long as blast radius stays small. The model that gives you both is **cells**:

- A **cell** is one deployment unit: one app deployment plus one Postgres database. Same codebase for every cell.
- A cell hosts **one or many tenants**. Small buyers share a cell. A buyer who pays for isolation gets a cell of their own.
- Every tenant-owned row carries `tenant_id` **in every cell, even a single-tenant one**. That is what lets you move a tenant between cells later with a data copy and a DNS change.
- A bad deploy, a runaway query or a corrupted table is limited to one cell. Roll releases out cell by cell, starting with a canary cell (your own retreat is a good canary).

| Tier | Cell contents | Blast radius | Cost per tenant | Use for |
|---|---|---|---|---|
| **Pool** | Many tenants in one cell, `tenant_id` + RLS | One cell's tenants | Lowest | Small homestays |
| **Silo** | One tenant in its own cell | One tenant | Highest (own Vercel project + database) | Larger or regulated buyers |
| **Capped pool** | Pool cell with a tenant cap (say 20) | At most 20 tenants | Low | Default once you pass the first few tenants |

The control plane (a small registry of tenants, domains, cells, plans and entitlements) can live in your own database. It is the only shared state.

## Goal
Run the same platform for many properties (tenants), each on its **own domain**, each with a **different UI** (look, layout, copy, photos), but using the **same configurable features**. The retreat we run today becomes tenant #1.

## What "tenant" means here
A tenant is one property (or one brand). It owns: its rooms, bookings, guests, staff, settings, payment and notification credentials, its domain, its theme and its enabled features.

## Two deployment models

| | A. One deployment per tenant | B. Shared deployment, many tenants |
|---|---|---|
| Isolation | Strongest. A bug or outage affects one tenant. | Logical (`tenant_id` plus row-level security). |
| Cost | High fixed cost per tenant (Vercel project, database). | Low. One app and one database serve many tenants. |
| Speed to onboard | Slow (new infra each time). | Fast (a row and a domain). |
| Fit | A few large or regulated customers. | Many small properties. |

**Recommendation:** replace this A/B choice with the **cell model** above. It is A and B in one codebase: `tenant_id` everywhere (model B), deployable as a single-tenant cell (model A) when a buyer needs it.

## Features configured from the admin portal

Two levels, so you stay in control of what each buyer gets:

| Level | Who sets it | Example |
|---|---|---|
| **Entitlement** | Platform admin (you), from a platform console | "Tenant X has meals, activities and invoices; no channel sync." Follows the plan. |
| **Preference** | Tenant admin, from `/admin/features` | "Show the meals step in booking: on/off." Only for features the tenant is entitled to. |

- A feature is a **module** with a key (`meals`, `activities`, `ala_carte`, `invoices`, `channel_sync`, `assistant`, `tours`, `online_payments`), a default and a list of dependencies. Disabled modules hide their routes, nav items, API handlers and notifications, and cost nothing.
- Effective flag = entitled **and** enabled. One pure function, `isFeatureOn(tenant, key)`, is the only place that decides. It is unit-tested for every combination.
- Roles: `platform_admin` (you), `tenant_admin`, `staff`, `guest`. Stored in a table, scoped by tenant.

## Required changes (in order)
1. **Tenant id on every tenant-owned table.** Add `tenant_id` to `rooms`, `bookings`, `payments`, `notifications`, `settings`, `users` (where the user belongs to one tenant), and so on. Add it to the exclusion constraint for double-booking, so overlaps are checked per room, not globally. Keep the constraint's meaning unchanged.
2. **Resolve the tenant per request** from the host name (`host` header → `tenants.domain`). A small, cached lookup. The result is passed to services explicitly, never read from a global.
3. **Settings scoped by tenant.** The `settings` primary key becomes `(tenant_id, key)`. Defaults stay in `src/lib/settings.ts`.
4. **Secrets per tenant.** Payment keys, WhatsApp and SMS credentials, and OAuth clients per tenant, stored encrypted (not in environment variables). Platform secrets stay in env. The notification and payment adapters already take credentials as input, so this is mostly a change of where they come from.
5. **Row-level security.** Enforce tenant isolation in Postgres as a second line of defence. This also works on plain Postgres with a `set_config('app.tenant_id', …)` per transaction.
6. **UI packs.** A tenant selects a UI pack (a set of layouts and components) plus a theme. The current `src/components/*` becomes the default pack. The pure domain code (`lib/booking`, `lib/notifications`, `lib/payments`) is shared by all packs and does not change.
7. **Feature flags.** Each feature (room booking, meals, activities, à la carte ordering, channel sync, invoices) is a module with an on/off switch per tenant. Disabled modules add no routes and no cost.
8. **Onboarding flow.** Admin creates a tenant, adds a domain (with DNS and TLS instructions), picks a pack, enters credentials, and goes live. Ideally a single wizard, under 15 minutes.

## Modularity rules (so parts can be rewritten in isolation)
- **Pure core, thin shell.** Domain rules stay pure and unit-tested. I/O sits behind interfaces: `PaymentProvider`, `NotificationChannel`, `OtpProvider`, the repos. Swap an implementation without touching the rules.
- **Explicit dependencies.** Services receive the tenant, the settings and the adapters as arguments. No module reads a global tenant or a global environment variable.
- **One module per feature.** A feature owns its tables, its routes and its tests. Cross-feature calls go through a small exported function, not a shared table.
- **Contract tests for adapters.** Each provider (Razorpay, WhatsApp, MSG91…) runs the same contract test suite, so replacing one is safe.

## Risks
- **Data leaks between tenants.** Mitigate with `tenant_id` in every query, RLS, and a test that tries to read another tenant's rows and must fail.
- **Migration pain.** Adding `tenant_id` to a live database is easy now and painful later. Do it before the second tenant, and while the data is small.
- **Domain and TLS.** Custom domains need certificate automation. Check the hosting platform's support before committing (Vercel supports domains per project; check limits for many domains).
- **Support load.** Each tenant's configuration is a support surface. The admin must show a "health" view (credentials valid, domain resolving, last notification sent).

## Dependencies
- The quality gates in [quality-gates.md](quality-gates.md) must be in place first, since this is a large refactor.
- Billing per tenant, see [saas-billing.md](saas-billing.md).
- The activity module ([future-services.md](future-services.md)) should be built as a tenant-aware feature from the start.
