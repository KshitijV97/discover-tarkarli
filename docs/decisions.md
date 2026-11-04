# Decision log

Short ADRs — why things are the way they are. Add new entries at the bottom.

### 001 · Plain Postgres + postgres.js, not supabase-js (2026-11-04)
Portability requirement. All data access is SQL over `DATABASE_URL`; migrations are plain `.sql`. Moving hosts = changing one env var. Trade-off: no auto-generated types; we map rows by hand in repos.

### 002 · Double-booking prevented by a DB exclusion constraint (2026-11-04)
Application-level checks race under concurrency. `EXCLUDE USING gist (room_id WITH =, stay WITH &&)` makes overlap impossible from any code path. `stay`/`blocks_inventory` are denormalised onto `booking_rooms` by triggers.

### 003 · Money in paise, dates as strings (2026-11-04)
Avoid float rounding and timezone drift. GST rounded per line.

### 004 · Breakfast = morning after each night; lunch/dinner on nights' days (2026-11-04)
Owner's choice (standard hotel convention). Breakfast rows stored even when free for kitchen counts.

### 005 · Prices exclusive of GST; deposit on total incl. GST, rounded up to the rupee (2026-11-04)
Owner's choice. GST slabs and rates are settings.

### 006 · Price snapshots on every line (2026-11-04)
`booking_rooms`, `booking_meals`, `ala_carte_order_items` store price + GST rate, so setting changes never alter existing bookings and invoices can be regenerated exactly (and later pushed to an external invoicing system).

### 007 · Settings table with typed code defaults (2026-11-04)
Business rules editable at runtime; app works on an empty table; zod validates each group and falls back on error.

### 008 · Notifications via outbox + channel adapters (2026-11-04)
One `notify()` for all events; routing/recipients/templates in settings; channels activate by env credentials. Outbox gives a delivery log, dedupe and retries without a queue service. Sends happen inline after commit (serverless-safe); a cron retries failures. WhatsApp supports Meta-approved templates because business-initiated messages require them.

### 009 · PaymentProvider interface, Razorpay via REST (2026-11-04)
No SDK dependency. Browser callback and webhook both call idempotent `recordPayment()`; webhook is the source of truth. Late payments after hold expiry re-confirm if possible, else flag a conflict for manual refund.

### 010 · Pending holds instead of payment-before-booking (2026-11-04)
The room is reserved (15 min, extended when checkout starts) while the guest pays, so a guest never pays for a room someone else just took.

### 011 · Cron as plain authenticated HTTP endpoints (2026-11-04)
`vercel.json` schedules them today; any scheduler can call them with `Authorization: Bearer $CRON_SECRET`.

### 012 · Migrations run in the Vercel production build (2026-11-04)
The owner's network blocks Postgres ports, and Vercel's build machines can always reach the database. Production builds apply pending migrations first, and preview builds skip them. This stays portable: other hosts run `npm run db:migrate` in their release step.

### 013 · Pool size of at least 3 with a transaction pooler (2026-11-04)
With `max: 1`, postgres.js pipelines concurrent queries on one connection. Supavisor in transaction mode doesn't handle this, so pages hung in production. The code now enforces a minimum of 3 connections and a 10s connect timeout.

### 014 · Auth.js with JWT sessions, users in our Postgres (2026-11-04)
The owner chose Auth.js over Supabase Auth to keep the portability rule. Sign-in is optional for guests (fewer drop-offs). Staff roles come only from env allow-lists. Identities sit in their own table, so Google and future phone OTP can link to one user. There is no edge middleware (the DB driver runs on Node only); pages gate themselves with `requireUser`/`requireStaff`.

### 015 · Animated redesign on framer-motion + Embla, original components (2026-11-04)
Effects inspired by modern animated UI kits, written from scratch in `components/fx` and driven by theme tokens. Simple effects (marquee, aurora, shimmer) are CSS-only. All motion respects `prefers-reduced-motion`. Placeholder Unsplash photos are kept in one content file.

### 016 · Direct-to-main fast mode (2026-11-04)
The owner chose speed over review gates: commit and push to `main`, plain-English messages, no PRs, approvals, tags or releases. Vercel deploys each push to production. Trade-off accepted by the owner: a bad push goes live, and rollback is by promoting a previous deployment or reverting a commit. Replaces the release process (PRs and tags) for new work; that process stays in `docs/release-process.md` for reference.

