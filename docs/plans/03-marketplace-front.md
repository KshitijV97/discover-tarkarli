# 03 · Marketplace front

> **Status: Draft.** Depends on: 01, 02. Feature ids: **F-LST**, **F-USE**, **F-FEAT**, plus TC-TEN-05. Glossary: Listing, Partner site, Partner type, Enquiry, Trip plan, Featured, Usage, Verified. ADRs 018, 019.

## Problem
discovertarkarli.com needs a front door where travellers browse Stays, Food, Shops and Experiences, contact them on WhatsApp, and book Stays on each Partner's own **Partner site**. The Platform must measure **Usage** from day one, so it can charge later, and sell **Featured** slots.

## Users and stories
- As a traveller, I browse by category, open a Listing, and tap WhatsApp or call to enquire. The WhatsApp message is pre-filled.
- As a traveller, I tap "Book" on a Stay and land on that Partner's site, where the Partner is clearly the seller. I book as I do today.
- As a traveller, I save Listings and Places into a **Trip plan** without signing in, and keep it if I do sign in later.
- As a Partner manager, I edit my Listing (photos, description, hours, prices, menu or catalogue) from my phone, and see my own Usage.
- As the **Owner**, I see Usage across Partners and switch Featured slots on and off.

## Scope
- Partner types on day 1:
  - **Stay**: bookable on its Partner site.
  - **Food**, **Shop** and **Experience**: Listing with contact buttons only.
  - **Rental**: not on day 1.
- Listing editor in the Partner console, and public Listing pages.
- Category browse pages and a home page that shows Featured items.
- Partner sites at paths, e.g. `/stays/golden-tide-retreat`, with the Partner's own branding block and "Sold and fulfilled by <Partner>" wording.
- Tenant resolution from path, and from a custom domain for Golden Tide Retreat.
- Click-to-chat WhatsApp and call buttons.
- Usage events and dashboards.
- Featured slots.
- Trip plan.

## Non-goals
Cross-Partner checkout, online ordering for Food and Shop, Experience slot booking, reviews, search by availability across Stays (later), translations (plan 04, but all strings must already go through the i18n helper; see below).

## Decisions (made)
- **Partner resolution:** `resolvePartner()` from plan 01 learns three rules.
  1. A path prefix `/<type-plural>/<slug>` gives the Partner.
  2. Host `goldentideretreat.com` gives Partner #1.
  3. Any other host is neutral Platform pages.

  A `partner_domains(partner_id, host)` table allows subdomains or custom domains later without a migration. Unknown hosts get a neutral "site not found" page.
- **Usage meters** (append-only `usage_events(partner_id, meter, quantity, occurred_at, source_id, dedupe_key)`, see [saas-billing.md](../saas-billing.md)):
  - `listing_view` (deduped per visitor per day, no personal data stored)
  - `enquiry_click` (whatsapp | call)
  - `booking_created`
  - `booking_value_paise`
  - `message_sent` (per channel)

  Writes happen in the same place as the action, and never block or fail the action.
- **Click-to-chat** uses `https://wa.me/<partner-number>?text=<prefilled, url-encoded>`. The pre-filled text is a template in platform settings, per language. Clicks go through a tiny redirect route that records `enquiry_click` and then redirects. No personal data goes in the URL beyond the message text.
- **Featured:**
  - A `featured_slots(placement, partner_id, starts_on, ends_on, price_paise, paid_ref)` table, managed in the Platform console.
  - Placements and slot counts live in `platform_settings` (default: home Stays 3, home Food 2, each category top 2, each Guide page 1).
  - Slots are sold by hand: the Owner records a payment-link reference. No automation.
- **Trip plan** is stored in localStorage until sign-in, then in a `trip_plans` table (user-owned, not partner-owned).
- **Verified** is a boolean plus a note on `partners`, set in the Platform console.
- **i18n-ready now:** all new UI strings go through a `t()` helper with English messages, so plan 04 only adds translations.

## Slices

### S1 · Listing model and editor — `todo`
- **Changes:**
  - Migration `listings(partner_id, partner_type, title, summary, body, area, address, lat, lng, phone_whatsapp, phone_call, hours jsonb, price_from_paise, status)` and `listing_items(partner_id, listing_id, name, description, price_paise, photo, sort)` for menu or catalogue entries.
  - Add both tables to the isolation suite.
  - Partner console editor, mobile-first.

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-LST-01 | A manager creates and publishes a Food listing with 3 menu items from a 375 px screen | e2e/manual | S |
| TC-LST-02 | Draft listings never appear publicly | int | N |
| TC-LST-03 | `listings` and `listing_items` are covered by the isolation meta-test | int | S |

### S2 · Public browse and Listing pages — `todo` (depends S1)
- **Changes:** Home page, `/stays`, `/food`, `/shops`, `/experiences`, and Listing detail pages. Public listings and Places come in plan 04; leave a slot for them. Pages are server-rendered and cached.

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-LST-04 | Each category page lists only `active` Partners' published listings of that type | int | S |
| TC-LST-05 | A suspended Partner's listing returns 404 | int | N |
| TC-LST-06 | Listing pages pass the existing performance and a11y budgets at 375 px | manual | N |

### S3 · Partner sites at paths, resolution, domains — `todo` (depends S2)
- **Changes:**
  - Move today's public booking flow under `/stays/[slug]` (rooms, book, manage links), scoped by the resolved Partner.
  - Add the `partner_domains` table.
  - Add "sold by" branding.
  - Booking emails and messages carry the Partner's name as seller.

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-LST-07 | `/stays/golden-tide-retreat` books exactly as today (existing booking tests re-pointed) | int | S |
| TC-LST-08 | A second Stay Partner's site books its own rooms, and Partner #1's rooms are invisible there | int | S |
| TC-TEN-05 | An unknown host shows a neutral "site not found" page | int | N |
| TC-LST-09 | The Partner site shows the Partner as seller on every page and on the confirmation | manual | N |

### S4 · Click-to-chat and Usage metering — `todo` (depends S2)
- **Changes:** Add the redirect route, `usage_events` (append-only, with a dedupe key), meters written from listing views, enquiry clicks, booking creation and notification sends.

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-USE-01 | A WhatsApp tap records one `enquiry_click` and redirects to `wa.me` with the pre-filled text | int | S |
| TC-USE-02 | Repeated views by one visitor in one day count once | int | N |
| TC-USE-03 | A failing Usage write never fails the booking or enquiry | int | N |
| TC-USE-04 | Creating a booking records `booking_created` and `booking_value_paise` once, even on retry | int | N |

### S5 · Usage dashboards — `todo` (depends S4)
- **Changes:** Partner console "Your activity" page (last 30 or 90 days per meter). Platform console view across Partners. Daily roll-up in `usage_daily`, rebuilt by the daily cron.

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-USE-05 | A Partner sees only its own numbers, and the platform view sums across Partners correctly | int | N |
| TC-USE-06 | Roll-ups are rebuilt from raw events with identical results | int | R |

### S6 · goldentideretreat.com custom domain — `blocked: owner O-4` (depends S3)

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-LST-10 | Requests to goldentideretreat.com resolve to Partner #1's site, and its links stay on that domain | int + manual | S |

### S7 · Featured slots — `todo` (depends S2, plan 02 S3)
- **Changes:** Add `featured_slots`, placements in `platform_settings`, a Platform console manager, a "Featured" badge, and ordering on the home and category pages. A Partner can't hold more than one slot per placement at a time.

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-FEAT-01 | An active slot puts the Partner first in its placement with a badge, and an expired slot drops it the next day | int | S |
| TC-FEAT-02 | A placement can't exceed its configured slot count | unit | N |
| TC-FEAT-03 | Public listings are never shown in paid placements, and are never charged | int | N |

### S8 · Trip plan — `todo` (depends S2)

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-LST-11 | A signed-out traveller saves 3 items, signs in, and the plan is kept | e2e/manual | N |
| TC-LST-12 | A Trip plan can't be read by another user | int | N |

## Open questions (refine before Ready)
1. **CA (owner O-1):** is path-based SaaS framing enough? If not, Stays from unregistered Partners show "Enquire" instead of "Book" (the ADR 019 fallback). Build S3 either way. The switch is a per-Partner flag that follows the Tax profile.
2. Listing photos: how many per listing, and what maximum size? Default: 12 photos, resized to WebP on upload.
3. Is a map view on day 1? Default: no. Show a static map link per Listing.
4. Should Partner #1's existing marketing home page (rooms carousel, food, dog-friendly) become its Partner site home? Default: yes, rendered from its Listing plus today's `site.ts` content until plan 04 moves the copy into data.

## Done when
S1–S8 are `done` (S6 once O-4 is done). F-LST, F-USE and F-FEAT are Built.
