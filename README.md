# Golden Tide Retreat — Booking System

Next.js 14 (App Router) · TypeScript · Tailwind · PostgreSQL (Supabase in production).

**Status:** v1 core done — room booking with live availability + breakfast-included / lunch-dinner-optional meal planning, guest meal editing with cutoff.
**Next:** Razorpay deposit → WhatsApp (`lib/whatsapp.ts`) → admin dashboard → GST invoice PDF → à la carte ordering.

## Quick start (local)

```bash
cp .env.example .env.local   # already points at the local Docker DB
npm install
npm run db:up                # Postgres 16 in Docker on :54329
npm run db:migrate
npm run db:seed              # 6 sample rooms, menu, default settings
npm run dev                  # http://localhost:3000
npm test                     # pricing / meal / cutoff unit tests
```

## Deploying (Vercel + Supabase, free tier)

1. Create a Supabase project → **Project Settings → Database → Connection string → Transaction pooler** (port 6543).
2. Run migrations against it once: `DATABASE_URL="<pooler uri>" npm run db:migrate && npm run db:seed`
3. Import the repo in Vercel; set env vars `DATABASE_URL` (same URI), `DATABASE_POOL_MAX=1`, `NEXT_PUBLIC_SITE_URL`.

### Portability
The app only needs **a Postgres URL** and **a Node host**:
- DB access is plain SQL via `postgres.js` (`src/lib/server/db.ts`) — no supabase-js, no PostgREST, no RLS policies in app logic.
- Migrations are plain `.sql` files run by `scripts/migrate.mjs` (works with any Postgres 13+; uses only the standard `btree_gist` extension).
- RLS is *enabled with no policies* on every table purely so Supabase's public anon key can't touch the data; the server's DB role bypasses it. Harmless elsewhere.
- Nothing uses Vercel-specific APIs. `next start` on any Node host works.
- Supabase Auth (admin) and Storage (room photos) will sit behind `lib/auth.ts` / `lib/storage.ts` wrappers when added.

## Booking & pricing rules (as implemented)

| Rule | Behaviour | Where |
|---|---|---|
| Stay | Nights = check-in … check-out−1. Same-day turnover allowed. | `lib/booking/rules.ts` |
| Double-booking | Prevented **in the database** by an exclusion constraint on `(room_id, stay daterange)` — safe under concurrent requests. Cancelled/expired bookings release rooms automatically (trigger). | `0001_init.sql` |
| Multi-room | One booking can hold several rooms, all on the same dates; guests are allocated per room within `max_occupancy`. `num_guests` = sum. | `rules.ts`, `bookings.ts` |
| Room price | Flat `base_price` per room per night, **excl. GST**. | `pricing.ts` |
| Breakfast | Served the morning after each night (check-in+1 … check-out). If included: auto qty = guests, ₹0, `included_free = true`. If the setting is off: becomes a paid optional meal. | `meals.ts` |
| Lunch / dinner | Offered on each day with a booked night (check-in … check-out−1). Guest picks a headcount 0…guests per meal. | `meals.ts` |
| Meal cutoff | Each meal locks at `cutoffTime` (default 18:00 IST), `cutoffDaysBefore` days (default 1) before its date. Applies at booking time too. Admin edits can bypass. | `meals.ts` |
| Price snapshots | Rooms and meals store price + GST rate at booking; later setting changes only affect newly added items. | `booking_rooms`, `booking_meals` |
| GST | Room: 5% if tariff ≤ ₹7,500/night else 18%. Food: 5%. Per-line, shown as CGST+SGST (or IGST). All rates in settings — **confirm with your CA**. | `pricing.ts` |
| Deposit | % of total incl. GST (default 30%) or a fixed amount, rounded up to the rupee. Locked once paid; recalculates on meal edits only while unpaid. | `pricing.ts` |
| Holds | With `booking.paymentsEnabled = true`, new bookings are `pending` and hold rooms for `holdMinutes` (15). Currently `false` → bookings confirm immediately. | `bookings.ts` |

All of these live in the `settings` table (see `db/seed.sql`), with typed defaults in `src/lib/settings.ts`.

## Design system

- Tokens: `src/theme/theme.config.ts` (colours, fonts, radius, spacing, shadows).
- Emitted as CSS variables in `app/layout.tsx`; Tailwind utilities (`bg-primary`, `rounded-card`, `font-heading`, `px-gutter`) map to those variables — components never hardcode colours.
- Runtime override: insert a partial theme into `settings` (key `theme`), e.g.
  `insert into settings values ('theme', '{"colors":{"primary":"#145C7A"}}')` — no redeploy needed (admin theme editor to follow).

## Project layout

```
db/migrations/        plain SQL migrations
db/seed.sql           sample rooms, menu, settings
scripts/              migrate / seed runners
src/theme/            design tokens
src/lib/              pure, shared logic (dates, money, settings, booking/{meals,pricing,rules})
src/lib/server/       DB access + booking service (server-only)
src/app/api/          availability, bookings, manage/[token]/meals
src/app/book          booking flow (dates → rooms → meals → details)
src/app/booking/[token]  guest's private manage page (meal edits)
src/components/       UI primitives + booking components
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/availability?checkIn&checkOut` | Free room ids for a stay |
| GET | `/api/availability/calendar?from&to` | Free rooms per night (calendar sold-out marks) |
| POST | `/api/bookings` | Create booking; server recomputes all prices |
| PUT | `/api/manage/:token/meals` | Guest meal edit (cutoff enforced) |
