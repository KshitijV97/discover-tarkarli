# Roadmap

## ✅ Done
- Project scaffold, schema, migrations, seed, theme system
- Room booking: calendar with sold-out nights, live availability, multi-room, occupancy, DB-level no-double-booking
- Meals: breakfast included, lunch/dinner headcounts, per-meal cutoff, price snapshots, guest meal editing
- GST-exclusive pricing, configurable deposit
- Notification framework: WhatsApp Cloud API, Telegram, SMS (MSG91/Twilio); outbox, dedupe, retries; daily balance reminders + kitchen summary
- Razorpay deposit payments: orders, checkout, signature verification, webhook, holds, late-payment handling
- Redesigned animated site (hero carousel, room carousels, bento, marquees, parallax, reveal-on-scroll)
- Optional guest accounts + staff roles via Auth.js (Google); `/account` booking history; staff-gated `/admin`
- Admin dashboard, first slice: overview counts, bookings list filtered by date, and a settings editor for deposit, meals, GST, booking rules and property (admin-only, validated on the server). See [admin.md](admin.md).

## 📝 TODO (owner)
- **Razorpay onboarding**: create an account, test keys, webhook, KYC, live keys. Step-by-step: [razorpay-onboarding.md](razorpay-onboarding.md). Until then bookings confirm without online payment.
- **Move hosting to India**: Vercel Montreal → Mumbai (`bom1`), Supabase Tokyo → Mumbai (`ap-south-1`). Easiest before go-live. Steps: [region-migration.md](region-migration.md).
- **Google sign-in setup**: create the OAuth client in Google Cloud and set env vars. Steps: [auth.md](auth.md#todo-set-up-google-sign-in).
- **Real photography**: replace the Unsplash placeholders in `src/content/site.ts` and `rooms.photos`.
- **Policy pages** (terms, cancellation/refund, privacy, contact), required for Razorpay activation.
- **Quality gates**: pre-push hook, CI, Postgres integration tests, then E2E. Phase 1 (hook + CI) is the first to build. See [quality-gates.md](quality-gates.md).
- **Third-party activities** (parasailing, banana boat, scuba, kayaking…): operator-owned, configurable, with commission. See [future-services.md](future-services.md).
- **Multi-tenant white-label SaaS**: one platform, many domains and UI packs, with per-tenant feature flags. The largest change; do `tenant_id` before the second property. See [multi-tenancy.md](multi-tenancy.md).
- **SaaS billing**: plans, usage metering, tenant invoices, cost tracking. See [saas-billing.md](saas-billing.md).

## ⏭ Next
- **Room types + channel sync (Airbnb, MakeMyTrip, Booking.com…)**: owner is defining room types first; plan in [channel-sync.md](channel-sync.md).
0. **Phone OTP sign-in (India)**: MSG91/Twilio Verify behind `OtpProvider`; plan in [auth.md](auth.md#phone-otp-india-planned).
1. **Admin dashboard, remaining** (see [admin.md](admin.md) for what exists)
   - Booking detail: meal selections, edit rooms/dates/meals (cutoff bypass), cancel, check-in/out
   - Record balance payments (`payments` with `provider='manual'`), mark fully paid → `booking.fully_paid`
   - Manage rooms (photos via `lib/server/storage.ts`) and menu items
   - Settings: notifications and theme editors (the other groups are done)
   - Notification log + resend

## Suggested build order (decided)
1. **Quality gates, phase 1** (pre-push hook + CI). Cheap, and it protects everything below.
2. **Finish the admin dashboard** (booking detail, rooms, menu, notifications). Owner-facing value first.
3. **Room types + channel sync** (already planned; the data model is the first step of multi-tenancy).
4. **Tenant-ready schema** (`tenant_id`, settings keyed by tenant, feature flags) before more tables are added.
5. **Integration tests against Postgres** (quality gates, phase 2).
6. **Third-party activities**, then **billing**, then **multi-tenant deployment and UI packs**.

Phone OTP and the GST invoice PDF can slot in wherever they are needed; they do not block the list above.
2. **GST invoice PDF** — template-based, behind an `InvoiceProvider` interface (Frappe Books later). Invoice numbering series, GSTIN, SAC codes (996311 rooms, 996331 food).
3. **À la carte ordering** — menu, in-stay orders tied to booking/room, editable until `in_preparation`, kitchen notifications.
4. **Refunds** — Razorpay refund API for cancellations/conflicts.

## Later / ideas
- Seasonal & weekend rates, extra-guest charges, child policy
- Promo codes
- Email channel
- Channel manager / OTA sync (iCal export per room)
- Reviews & guest feedback after checkout
