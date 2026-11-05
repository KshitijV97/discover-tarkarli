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

## 📝 TODO (owner, not code)
- **Razorpay onboarding**: create an account, test keys, webhook, KYC, live keys. Step-by-step: [razorpay-onboarding.md](razorpay-onboarding.md). Until then bookings confirm without online payment.
- **Move hosting to India**: Vercel Montreal → Mumbai (`bom1`), Supabase Tokyo → Mumbai (`ap-south-1`). Easiest before go-live. Steps: [region-migration.md](region-migration.md).
- **Google sign-in setup**: create the OAuth client in Google Cloud and set env vars. Steps: [auth.md](auth.md#todo-set-up-google-sign-in).
- **Real photography**: replace the Unsplash placeholders in `src/content/site.ts` and `rooms.photos`.
- **Policy pages** (terms, cancellation/refund, privacy, contact), required for Razorpay activation.

## 🗺 Phased plan (decided 2026-11-05)

Goal: sell the product to other buyers, each on their own domain, with a small blast radius, admin-configurable features, a full test catalog, built-in tours and an AI assistant. Sizes are relative effort for one developer working with an AI assistant: **S** ≈ 1–2 days, **M** ≈ 3–7 days, **L** ≈ 1–3 weeks.

| Phase | Name | Size | Depends on | Result |
|---|---|---|---|---|
| **P0** | Quality foundation | S | – | Pre-push hook and CI; test ID convention, `[smoke]/[sanity]` tags, `test:smoke`; smoke script. [quality-gates.md](quality-gates.md) phase 1, [testing/README.md](testing/README.md) |
| **P1** | Integration tests + feature matrix | M | P0 | Postgres harness (schema per file), first 8 invariants, `test:integration:bg`, `test:status`, `test:matrix`, CI job summary. You see the feature catalog as results without waiting |
| **P2** | Finish admin | L | P0 | Booking detail/edit/cancel, check-in/out, manual balance payments, rooms and menu management, notification and theme editors, notification log + resend, settings audit table |
| **P3** | Refunds + GST invoice PDF | M | P2 | Razorpay refund API on cancel; `InvoiceProvider`, numbering series, SAC codes |
| **P4** | Tenant-ready core (M0–M2 in [multi-tenancy.md](multi-tenancy.md)) | L | P0, P1 | `tenants`, `domains`, `tenant_id` + RLS, host resolution, per-tenant settings, roles in a table, branding/copy/photos in tenant config (kills the "one branch per buyer" caveat), **F-TEN isolation tests** |
| **P5** | Feature flags (entitlements + preferences) | M | P4, P2 | Module registry, `isFeatureOn()`, `/admin/features` for tenants, platform console for you |
| **P6** | Guided walkthroughs | M | P2 (admin tour), P5 | Guest tour and admin tour. [guided-experience.md](guided-experience.md) |
| **P7** | AI assistant v1 | M | P4, P2 | FAQ, availability, quote, booking lookup, owner handoff, enquiries inbox, per-tenant token budget |
| **P8** | Cells, onboarding wizard, platform console | L | P4, P5 | Tenant created in < 15 min, domain + TLS steps, cell assignment, canary release order, tenant health view |
| **P9** | E2E (Playwright) journeys | M | P1 | 5–10 journeys in CI; visual checks per UI pack later |
| **P10** | Room types + channel sync (iCal first, then OTAs) | L | P4 | [channel-sync.md](channel-sync.md) |
| **P11** | Third-party activities, then SaaS billing | L | P4, P5 | [future-services.md](future-services.md), [saas-billing.md](saas-billing.md) |
| **P12** | Phone OTP, à la carte ordering, UI packs | M each | P4 | Slot in wherever needed; none blocks the rest |

### Why this order
1. **Tests first (P0–P1)**, because P4 rewrites the data model. Without the integration suite there is no safety net for that change.
2. **Admin before tenancy (P2 before P4)**: every admin page written after P4 is tenant-aware by default, and finishing it first gives the owner day-to-day value. Rule until P4 lands: *new tables must include `tenant_id` from the start* (`enquiries`, `assistant_usage`, anything new), even if it defaults to a single value.
3. **Refunds and invoices (P3)** follow because real money and tax compliance matter before more buyers do.
4. **Flags (P5) before tours and assistant (P6, P7)**, so both ship as switchable modules.
5. **Assistant after tenancy**, so conversations, enquiries and token budgets are tenant-scoped from day one.
6. **Onboarding and cells (P8)** only pay off once at least two tenants exist; build them against a real second tenant (a pilot buyer).

### Selling before everything is done
- **Fastest path to a first paying buyer** (after P0 and the owner TODOs): deploy a second **silo** (separate Vercel project and database, own env vars). It works today with no code change, at the cost of editing `src/content/site.ts` for their branding. Fine for one pilot; don't do it for a third. P4 removes the editing.
- **Minimum sellable SaaS**: P0, P1, P2, P4, P5. Tours, assistant, billing and channel sync are upsells.

### Test plan milestone
Within P0 and P1, the manual plan ([testing/manual-test-plan.md](testing/manual-test-plan.md)) is already usable today. Each later phase adds its feature rows to the [feature catalog](testing/feature-catalog.md) and its cases **before** coding.

## Later / ideas
- Seasonal and weekend rates, extra-guest charges, child policy
- Promo codes
- Email channel
- Reviews and guest feedback after checkout
- Assistant on WhatsApp, Hindi and Marathi
