# CLAUDE.md

> **Harness-neutral context lives in [AGENTS.md](AGENTS.md) and [docs/context/](docs/context/README.md).** Read those first. They work with any AI coding tool (Codex, OpenCode, Z.ai GLM and others). This file adds Claude Code specifics.

Booking system for **Golden Tide Retreat**: a 6-room beachfront homestay in India with a restaurant. Guests book rooms, plan meals and pay a deposit online. Staff get WhatsApp/Telegram/SMS updates.

Stack: Next.js 14 App Router · TypeScript (strict) · Tailwind · PostgreSQL via `postgres.js` · Razorpay · Vitest. Hosted on Vercel + Supabase, but **portability is a hard requirement**: no supabase-js, no Vercel-only APIs.

Full docs: `docs/` (start at `docs/README.md`). **Update the relevant doc in the same change** whenever behaviour, schema, settings, env vars or endpoints change.

## Commands
```bash
npm run dev            # http://localhost:3000
npm run typecheck      # tsc --noEmit
npm run lint
npm test               # vitest (src/**/*.test.ts)
npm run build
npm run db:up          # local Postgres 16 in Docker (port 54329)
npm run db:migrate     # apply db/migrations/*.sql to $DATABASE_URL
npm run db:seed        # idempotent sample data + default settings
```
Before committing: `npm run typecheck && npm run lint && npm test`.

## Architecture (see docs/architecture.md)
- `src/lib/booking/*`, `src/lib/dates.ts`, `src/lib/money.ts`, `src/lib/settings.ts`, `src/lib/notifications/{types,config,templates,plan,context}.ts`: **pure** domain logic. They do no I/O and are imported by both client and server. Unit-test changes here.
- `src/lib/server/*`: DB access and side effects only (`import "server-only"`). Services: `bookings.ts`, `payments.ts`, `notify.ts`, `daily-jobs.ts`. Repos: `rooms-repo.ts`, `settings-repo.ts`. Client: `db.ts`.
- `src/auth.ts` + `src/lib/server/{users-repo,session}.ts` + `src/lib/auth/*`: sign-in via Auth.js (Google; phone OTP planned). Gate pages with `requireUser()` / `requireStaff()`. Roles come only from `ADMIN_EMAILS`/`STAFF_EMAILS`. See docs/auth.md.
- `src/components/fx/*`: animation primitives (framer-motion, Embla); `src/content/site.ts`: marketing copy and photos. See docs/design-system.md.
- `src/lib/payments/*`: the `PaymentProvider` interface and the Razorpay REST adapter. Register providers in `index.ts`.
- `src/lib/notifications/channels/*`: WhatsApp, Telegram and SMS (MSG91/Twilio) adapters implementing `NotificationChannel`.
- `src/app/api/**`: thin route handlers. Each one parses input with zod (`lib/booking/schemas.ts`), calls a service, and returns errors via `errorResponse()` (`lib/server/http.ts`).
- `db/migrations/NNNN_*.sql`: **append-only**. Never edit an applied migration; add a new file.

## Invariants: don't break these
- **No double-booking** is enforced by the `booking_rooms_no_overlap` exclusion constraint. `stay` and `blocks_inventory` are maintained by triggers from `bookings`, so don't set them by hand. Postgres error `23P01` maps to HTTP 409.
- **Money is integer paise in code** and `numeric(12,2)` rupees in the DB. Convert with `rupeesToPaise` / `paiseToRupeesString`, display with `formatINR`.
- **Dates are `YYYY-MM-DD` strings** (`ISODate`). Use the `lib/dates.ts` helpers. Wall-clock times go through `zonedTimeToUtc` with `settings.property.timezone`.
- **The server recomputes every price**. Never trust client totals.
- **Price snapshots**: `booking_rooms.price_per_night`/`gst_rate` and `booking_meals.price_at_booking`/`gst_rate` are fixed when the row is created. Edits keep existing prices.
- **Payments are idempotent**. `recordPayment()` is called by both the browser callback and the webhook. Keep it safe to call repeatedly.
- **`notify()` never throws** and is called after the DB commit. Pass a `dedupeKey` for anything that may fire twice.
- **Business values belong in `settings`** (add a zod field with a default in `lib/settings.ts`), not in hardcoded constants. Secrets go in env.
- **Motion respects reduced-motion**: use the `components/fx` primitives, not ad-hoc animation libraries.
- **Styling uses theme tokens only** (`bg-primary`, `text-muted`, `rounded-card`, …), defined in `src/theme/theme.config.ts`. No raw hex values or Tailwind palette colours in components.

## Domain rules (details: docs/booking-rules.md)
- A stay covers the nights `[check_in, check_out)`. Same-day turnover is allowed. A booking can hold several rooms on the same dates.
- Breakfast falls on the morning after each night, is included free (`included_free`), and has quantity = guests. Lunch and dinner are offered on each night's date, with a headcount from 0 to the guest count.
- Meals lock at `meals.cutoffTime` (18:00), `cutoffDaysBefore` (1) days before the meal's date. This also applies at booking time.
- Prices exclude GST. Rooms are taxed at 5% (≤ ₹7,500/night) or 18% above that; food at 5%. Tax is rounded per line.
- The deposit is a % or fixed amount of the total including GST, rounded up to the rupee. It is fixed once paid.
- Status flow: `pending` (hold) → `confirmed` → `checked_in` → `checked_out`. The other two statuses are `cancelled` and `expired`.

## Environment
- Copy `.env.example` to `.env.local`. Channels and payments activate only when their credentials are present. Without them, bookings confirm instantly and notifications are logged as `skipped`.
- Local DB: `postgres://postgres:postgres@localhost:54329/golden_tide`.

## Conventions
- Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`). Branch off `main` for features.
- Path alias `@/` = `src/`.
- Server components load data; client components (`"use client"`) handle interaction. Mobile-first, with touch targets of at least 44px.
- New external integrations go behind an interface (see the extension points in docs/architecture.md).

## Status
Planned: room types + OTA channel sync (docs/channel-sync.md). Keep availability logic room-type-ready.
Hosting TODO: move Vercel (`yul1`) and Supabase (Tokyo) to Mumbai; see `docs/region-migration.md`.
Done: booking flow, meals, pricing, notifications framework, Razorpay deposits, animated redesign, Auth.js sign-in (Google; needs OAuth setup), admin dashboard first slice (`/admin`, see docs/admin.md). Next: finish admin, phone OTP, GST invoice PDF, à la carte ordering. Planned TODOs with docs: quality gates and test catalog (`docs/testing/`), third-party activities, multi-tenant SaaS (0% built; cell model), SaaS billing, guided tours and AI assistant (`docs/guided-experience.md`). See the phased plan in `docs/roadmap.md`. Until tenancy lands, **any new table includes `tenant_id`**, and every new feature adds its cases to `docs/testing/` with `TC-<FEATURE>-<NN>` ids.
