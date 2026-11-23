# Vision: Discover Tarkarli

> **Status: direction set (2026-11-23).** This repository started as the booking system for one homestay, Golden Tide Retreat. It is becoming **discovertarkarli.com**: one place to plan, book and pay for a whole trip to Tarkarli and the Malvan coast. Golden Tide Retreat becomes the **first partner (tenant)** on that platform.
>
> This doc sets the direction. It does not change any code yet. Technical changes follow in phases (see [roadmap.md](roadmap.md)).

## The problem
Tarkarli, on the Sindhudurg coast of Maharashtra, has some of India's clearest water, scuba and snorkelling, backwaters, Sindhudurg Fort and real Malvani food. Planning a trip there is still hard:

- Most homestays take bookings by phone and WhatsApp. Availability is a guess, and deposits move by UPI screenshot.
- Scuba, parasailing, boat and backwater operators sell on the beach or by word of mouth. Prices and slots are not visible in advance.
- Big travel sites list a handful of hotels and miss the family-run places that make the coast worth visiting. Their commissions are high for small owners.

Travellers can't see or book the whole trip in one place, and local owners have no affordable software built for how they work.

## The idea
**Discover Tarkarli is the local, trusted way to book the Malvan coast.** Stays, food and experiences on one site, run on software built for small Indian hospitality businesses.

| For travellers | For local partners |
|---|---|
| Live availability for homestays and resorts | A booking engine, payments and staff alerts, without building a website |
| Book a room, meals and activities in one checkout | Online deposits with Razorpay (UPI, cards), GST handled |
| Honest local guides: beaches, the fort, food, the best season for scuba | Bookings, check-in and payments run from a phone |
| WhatsApp confirmations and reminders | Their own branded page, or their own domain |
| One trip plan, not ten phone calls | A fair commission or a flat plan, not an OTA cut |

## How it fits together
```
discovertarkarli.com  (the destination marketplace)
 ├── Stays       partner homestays and resorts       ← Golden Tide Retreat is partner #1
 ├── Experiences scuba, snorkelling, parasailing, boat and backwater tours (independent operators)
 ├── Food        Malvani kitchens and meal plans
 └── Guides      where to go, when to go, how to get there

One platform underneath: tenants, rooms, bookings, payments, notifications, admin.
```

- **The marketplace** (discovertarkarli.com) is the front door: search, compare, plan, and book across partners.
- **A partner** (tenant) is one business: a homestay, a resort, an activity operator or a kitchen. It owns its rooms or offers, prices, staff, policies and payouts.
- **Partner sites stay possible.** A partner like Golden Tide Retreat can keep its own branded site on its own domain, powered by the same platform and the same inventory. A booking made on either site lands in the same calendar, so no double-booking.

## What already exists
The hard parts of a hospitality platform are built and tested for one property:

- **Booking engine** with live availability, multi-room stays and no double-booking, enforced by the database and tested against real Postgres, including a race test.
- **Meal planning** with per-meal cutoffs and price snapshots.
- **Indian payments and tax**: Razorpay deposits, idempotent webhooks, GST slabs per line.
- **Notifications** over WhatsApp, Telegram and SMS, with routing, templates, dedupe and retries.
- **Admin**: arrivals, check-in and check-out, desk payments, rooms and menu editors, audit log.
- **Portable, tested core**: pure domain logic, provider interfaces, CI, integration tests, a feature catalog.

## What changes (technical direction)
These turn the single-property app into the platform. Most are already planned in [multi-tenancy.md](multi-tenancy.md); the vision changes their priority and adds a marketplace layer.

1. **Tenancy first.** `tenants`, `tenant_id` on every owned table, row-level security, per-tenant settings and credentials. Golden Tide Retreat is tenant #1 and the canary. ([multi-tenancy.md](multi-tenancy.md))
2. **Partner types.** A tenant can be a stay, an activity operator or a kitchen. Each type turns on a set of modules (rooms, meals, activities, à la carte).
3. **Marketplace layer.** Cross-tenant search and availability (by dates, guests, area, price), partner listing pages, reviews, and a trip basket that can hold items from several partners.
4. **Multi-partner checkout and payouts.** One payment, split to partners with Razorpay Route (linked accounts), with the platform's commission recorded per line. ([future-services.md](future-services.md))
5. **Experiences.** Operator-owned activities with slots, capacity, waivers and weather cancellation. ([future-services.md](future-services.md))
6. **Destination content.** Guides, seasons, maps and travel info for Tarkarli, Malvan, Devbag and Sindhudurg, managed as content, not code.
7. **Partner onboarding.** A partner goes live in under 15 minutes from a phone: details, rooms, photos, payout KYC, done. ([saas-billing.md](saas-billing.md) for plans)
8. **Room types and channel sync**, so partners already on OTAs keep one calendar. ([channel-sync.md](channel-sync.md))

**Design rule from today:** write every new feature as if many partners and a marketplace will use it. New tables include `tenant_id`. Nothing new assumes a single property.

## Why start in Tarkarli
- **Local and specific beats generic.** A destination site that knows the tides, the scuba season and which kitchens make the best solkadhi earns trust a national OTA can't.
- **Proven on a real property.** Golden Tide Retreat runs on this software, so every feature is tested against real guests, real staff and real money.
- **Repeatable.** Once the model works for one coastal destination, the same platform can launch the next one (Devbag, Vengurla, Ganpatipule and beyond) as a new destination on the same core.

## Open decisions (owner)
- Commission, flat plan or both for partners.
- Whether Golden Tide Retreat keeps its own domain or lives only under discovertarkarli.com.
- The first non-Golden-Tide partners (a scuba operator is the strongest second partner).
- Brand and visual identity for Discover Tarkarli.
