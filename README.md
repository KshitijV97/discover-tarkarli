# Discover Tarkarli

**Book the Malvan coast the local way.** Stays, food and sea adventures in Tarkarli, on one site, run by the people who live there.

> 🌊 Coming to **[discovertarkarli.com](https://discovertarkarli.com)**. First partner: **Golden Tide Retreat**, a dog-friendly beachfront homestay on the Konkan coast.

---

## Why this exists
Tarkarli has some of the clearest water in India: scuba and snorkelling over coral, dolphins at dawn, the backwaters of the Karli river, Sindhudurg Fort, and Malvani food you can't get anywhere else.

Planning a trip there still means ten phone calls. Homestays take bookings on WhatsApp, deposits arrive as UPI screenshots, and dive slots are sold on the beach. The national travel sites list a few hotels, miss the family-run places, and take a big cut from small owners.

**Discover Tarkarli fixes both sides.**

| Travellers get | Local partners get |
|---|---|
| 🗓 Live availability across homestays and resorts | 🏠 A booking engine and website, ready on day one |
| 🧺 Room, meals and experiences in one checkout | 💳 Online deposits via Razorpay (UPI, cards), GST handled |
| 🤿 Scuba, snorkelling, parasailing and backwater tours from trusted operators | 📲 Instant WhatsApp, Telegram or SMS alerts for staff and the kitchen |
| 🍛 Real Malvani kitchens and meal plans | 🧾 Check-in, payments and bookings run from a phone |
| 💬 WhatsApp confirmations and reminders | 🤝 A fair plan instead of an OTA commission |

## The vision
```
discovertarkarli.com          the destination marketplace
 ├── Stays        homestays and resorts     ← Golden Tide Retreat, partner #1
 ├── Experiences  scuba, boats, backwaters, water sports
 ├── Food         Malvani kitchens and meal plans
 └── Guides       beaches, the fort, seasons, getting there
        │
        ▼
 One multi-tenant platform: rooms, bookings, payments, notifications, admin
```

Every partner is a tenant on one platform. A partner can keep its own branded site and domain, and still appear on the marketplace, with one shared calendar so nothing is ever double-booked. Start with Tarkarli; repeat for the next destination on the Konkan coast.

Read the full vision: **[docs/vision.md](docs/vision.md)**.

## What's already built
This is not a pitch deck. The core of the platform runs today for its first property.

- **Booking engine.** Calendar with sold-out nights, live per-room availability and multi-room stays. Double-booking is impossible: a Postgres exclusion constraint enforces it, and a race test proves it.
- **Meal planning.** Breakfast included every morning; lunch and dinner booked as headcounts, editable until a configurable cutoff. Prices are snapshotted per line.
- **Indian payments and tax.** Razorpay deposits with room holds, signature-verified callbacks and idempotent webhooks. GST slabs per line, deposit rounded to the rupee.
- **Messaging.** One event system over WhatsApp Cloud API, Telegram and SMS (MSG91 / Twilio), with routing, templates, an outbox, dedupe and retries. Daily kitchen summaries and balance reminders.
- **Admin for small teams.** Arrivals and in-house guests, check-in and check-out, desk payments (cash, UPI, card, bank), staff notes, rooms and menu editors, message log with resend, and an audit log.
- **Accounts.** Optional Google sign-in for guests; staff and admin roles. Phone OTP is planned.
- **A beautiful guest site.** Animated, mobile-first, and it respects reduced motion.
- **Engineered to grow.** Pure, unit-tested domain logic; integration tests on real Postgres 16; CI on every push; providers behind interfaces; no vendor lock-in.

## Roadmap
| Next | What it unlocks |
|---|---|
| **Multi-tenancy** (tenants, `tenant_id`, row-level security, per-partner settings) | Partner #2 onboards without a code change |
| **Experiences module** (operator-owned activities, slots, waivers) | Scuba, boats and water sports bookable with a stay |
| **Marketplace layer** (cross-partner search, listings, trip basket) | discovertarkarli.com as a single front door |
| **Split payouts** (Razorpay Route) | One checkout, money routed to each partner |
| **GST invoices, refunds, room types, OTA sync** | Ready for larger partners |
| **Guided tours and an AI trip assistant** | Plan a trip in a chat, on the web or WhatsApp |

Full phased plan: [docs/roadmap.md](docs/roadmap.md).

## Want to partner?
Run a homestay, a dive centre, a boat tour or a Malvani kitchen in Tarkarli, Malvan or Devbag? Open an issue on this repository and say hello. Early partners help shape the platform.

## Tech
Next.js 14 (App Router) · TypeScript (strict) · Tailwind · PostgreSQL (`postgres.js`) · Auth.js · Razorpay · WhatsApp / Telegram / SMS · Vitest

Portable by design: plain Node and plain Postgres. It runs on any host; Vercel and Supabase are today's choice, not a dependency.

### Run it locally
```bash
cp .env.example .env.local
npm install
npm run db:up && npm run db:migrate && npm run db:seed
npm run dev        # http://localhost:3000
npm test
```
Without payment or messaging credentials, bookings confirm instantly and messages are logged as skipped, so the whole flow works on a laptop.

### Documentation
Everything is in **[docs/](docs/README.md)**: vision, architecture, booking rules, data model, payments, notifications, configuration, API, deployment, testing, decision log and roadmap.

## Copyright and license
Copyright (c) 2026 Kshitij Vengurlekar. All rights reserved.

This repository is **source-available, not open source**. You may read the code to evaluate and learn from it. Running it for a business, copying, modifying, redistributing or offering it as a hosted service needs prior written permission. See [LICENSE](LICENSE).
