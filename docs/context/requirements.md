# Requirements

## 1. The product today: Golden Tide Retreat
A six-room beachfront homestay on the Konkan coast of India, with a kitchen. Owner: Kshitij Vengurlekar (family-run property).

**Guests** must be able to:
- See live availability per room and per night, and book one or several rooms for the same dates. Sold-out nights are visible. Double-booking is impossible.
- Plan meals: breakfast is included every morning. Lunch and dinner are headcounts per night, editable until a cutoff (18:00, the day before the meal).
- Pay a **deposit** online (Razorpay). The balance is paid at the property. A room is held while the guest pays.
- Manage a booking from a private link, and optionally sign in with Google to see all their bookings (`/account`).
- Get confirmations and reminders on WhatsApp, SMS or Telegram.
- Browse the site: rooms, experiences, kitchen, local food, dog-friendly information, gallery.

**Staff and owner** must be able to:
- Sign in with Google. Staff and admin roles come only from email allow-lists in env.
- See bookings and today's arrivals, in-house guests and pending holds (`/admin`).
- Change business settings (deposit, meal prices, GST, booking rules, property details) without a code change. Admins only.
- Receive kitchen summaries and balance reminders through the notification channels.

**Business rules** that must hold (details in [../booking-rules.md](../booking-rules.md)):
- A stay covers nights `[check_in, check_out)`. Same-day turnover is allowed.
- Prices exclude GST. Rooms are taxed at 5% up to ₹7,500 per night and 18% above. Food at 5%. Tax is per line.
- The deposit is a percentage (or fixed amount) of the GST-inclusive total, rounded up to the rupee, and fixed once paid.
- Status flow: `pending` (hold), `confirmed`, `checked_in`, `checked_out`; plus `cancelled` and `expired`.

## 2. Hard constraints
- **Portable.** Plain Postgres, Node and Next.js. Vercel and Supabase are today's hosts, not dependencies. No supabase-js, no Vercel-only APIs.
- **Cheap and fast.** Free or near-free tiers for now. Serverless. Runs on a small database.
- **Configurable.** Business values are runtime settings. Integrations sit behind interfaces, so providers can be swapped with little impact.
- **Testable.** Pure domain logic is unit-tested. Invariants that live in the database must be tested against real Postgres (planned, see quality gates).
- **Mobile first.** Touch targets of at least 44px. Reduced-motion respected.
- **Indian context.** INR, GST, IST, WhatsApp and SMS (MSG91/Twilio), UPI via Razorpay. DLT rules for SMS templates.

## 3. Owner's later requirements (captured 2026-11-04)
The owner asked for these, in one session, as **planned TODOs**. None is built yet. Details and order are in the linked docs.

1. **Third-party activities**: parasailing, banana boat, scuba, kayaking and similar. Offered by independent operators, not by the retreat. Fully configurable. Bookable as add-ons. See [../future-services.md](../future-services.md).
2. **Multi-tenant white-label SaaS**: the same platform for many properties, each on its own domain, with a different UI but the same configurable features. The largest change. See [../multi-tenancy.md](../multi-tenancy.md).
3. **Admin where everything is configured.** Partly built (overview, bookings, settings). Remaining items in [../admin.md](../admin.md).
4. **Quality gates**: everything tested, linted and checked before push, in phases. See [../quality-gates.md](../quality-gates.md).
5. **Billing**: the owner sells this as SaaS. Every tenant action should be billable; billing must be cheap and fast to run. See [../saas-billing.md](../saas-billing.md).
6. **Easy integrations**: every integration should be one or a few clicks for the end user, and the system should be easy to rewrite part by part with little impact.
7. **Branding**: the property is dog friendly, air-conditioned, and serves local Konkan food (modak, ghavne, shirwale, patholi, solkadhi, Malvani curries) made to order. Marketing photos are kept in a private `photos/` folder, gitignored for now. See [../marketing.md](../marketing.md).
8. **Licensing**: copyright Kshitij Vengurlekar 2026, under a restricted licence (view only for evaluation; no business use, copying or hosting without written permission). See [../../LICENSE](../../LICENSE).
9. **Portability across AI tools (this document set).** The owner must be able to keep working when one AI tool's usage limit is reached, using another tool (Codex, OpenCode, Z.ai GLM, or others). That is why the context is in the repo, in tool-neutral form.

## 3a. Vision change (captured 2026-11-23)
The repository goes public and the product becomes **discovertarkarli.com**: a destination platform for Tarkarli and the Malvan coast where stays, food and activities are booked together. Golden Tide Retreat becomes a tenant / partner on it. This drives future technical change (tenancy, marketplace layer, split payouts). See [../vision.md](../vision.md).

## 4. Non-goals (for now)
- Native mobile apps.
- Full accounting. GST invoice PDF is planned, not built.
- Online payment for the balance; it is settled at the property.
- Channel sync with Airbnb, MakeMyTrip or Booking.com. Planned after room types ([../channel-sync.md](../channel-sync.md)).
