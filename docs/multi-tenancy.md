# Future: multi-tenant white-label SaaS (TODO, major)

> **Status: planned, not started.** This is the largest structural change on the roadmap. It changes the data model, so it must be planned before more tables are added. Every new feature should be written as if a second property will use it.

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

**Recommendation:** model B (shared deployment, `tenant_id` everywhere) for the SaaS, with the option of model A for a tenant that needs its own database. Model A is the fallback for enterprise customers and needs no code change if the tenant code path stays clean.

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
