# 04 · Languages, brand and guides

> **Status: Draft.** Depends on: 03. Feature ids: **F-I18N**, **F-BRAND**, **F-GDE**. Glossary: Guide, Place of interest, Public listing.

## Problem
Travellers and Partners on the Konkan coast read Marathi and Hindi as often as English. The brand must feel local: water sports, Malvani food, lazy beach days, the Maratha navy and Sindhudurg Fort. The Platform must also be useful before anyone books, through free Guides, Places of interest and Public listings.

## Users and stories
- As a traveller, I switch between English, मराठी and हिंदी anywhere. My booking messages come in my language.
- As a Partner, I write my Listing in one language, and it appears auto-translated in the others until I approve or edit it.
- As a **Content editor**, I write Guides, Places and Public listings in all three languages from the Platform console.
- As a traveller, I find how to reach Malvan from Mumbai, Pune, Goa (Mopa and Dabolim), Kolhapur, Bengaluru or Chipi airport, by road, rail and air, with time and rough cost.

## Scope
- i18n routing and message catalogues for `en`, `mr` and `hi`.
- Translations of all UI strings.
- Translatable fields for Listings, Guides and Places, with an "auto-translated" state.
- The guest's language saved on the booking and used for notifications.
- Malvani and Konkani flavour phrases.
- Brand identity and theme.
- Guides, Places of interest and Public listings as content.

## Non-goals
Malvani or Konkani as selectable languages, AI chat, user reviews.

## Decisions (made)
- **URLs:** English has no prefix. Marathi and Hindi use `/mr` and `/hi`. The first visit picks from `Accept-Language`, and the choice is remembered in a cookie. The switcher is always visible. Add `hreflang` tags.
- **Library:** an i18n helper that works with Next 14 App Router server components and needs no hosted service. `next-intl` is the default; confirm in refinement.
- **Partner content:**
  - The source language is whatever the Partner writes in.
  - Other languages are machine-translated behind a `TranslationProvider` interface (portability rule), stored with `status = auto`, and labelled "auto-translated" publicly until a Partner or Content editor approves them.
  - Editing the source marks translations stale.
- **Flavour:** Malvani and Konkani phrases appear in native script with an English or Marathi gloss, from a curated list in content (not code), e.g. a welcome line on the home page, section headers and food names. A Content editor maintains the list.
- **Brand pillars:** water sports, Malvani food, chilling on the beach, Maratha navy history, Sindhudurg Fort (1664). No portraits or royal emblems of Chhatrapati Shivaji Maharaj as logo or marketing motifs. His history is told with care in the Guides.
- **Theme:** new tokens in `theme.config.ts` (e.g. sea blue, laterite red, kokum purple, sand), fort-wall dividers as SVG components, and motion through `components/fx`. Partner sites keep their own theme override.
- **Guide content** is stored in the database, edited in the Platform console, and never in code. Places and Public listings are Platform-owned (no `partner_id`) and are never charged or Featured.

## Slices

### S1 · i18n plumbing and English catalogue — `todo`
- **Changes:** Locale routing and middleware-free resolution (pages read the locale from the path segment). Extract all strings to `messages/en.json`. Add a `t()` helper on server and client. Add a unit test that fails on hardcoded user-facing strings in new components (lint rule or a scan).

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-I18N-01 | `/`, `/mr` and `/hi` render, with `hreflang` alternates | int | S |
| TC-I18N-02 | A missing key in `mr` or `hi` falls back to English, and CI reports the missing keys | unit | N |

### S2 · Marathi and Hindi catalogues — `todo` (depends S1)
- **Changes:** `messages/mr.json` and `messages/hi.json`, machine-drafted and then flagged for human review in `docs/research/translation-review.md`.

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-I18N-03 | Key-set parity: `mr` and `hi` have every `en` key | unit | S |
| TC-I18N-04 | Devanagari renders with the chosen font at 375 px with no overflow on main pages | manual | N |

### S3 · Translatable content and guest language — `todo` (depends S1)
- **Changes:**
  - Add a `translations(entity, entity_id, field, lang, text, status)` table (partner-owned rows for Listings).
  - Add the `TranslationProvider` interface, a no-op provider, and one real adapter.
  - Add `bookings.guest_lang`.
  - Notification templates are chosen per language.

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-I18N-05 | Saving a Listing in Marathi creates `en` and `hi` drafts marked auto, and editing the source marks them stale | int | N |
| TC-I18N-06 | A booking made on `/hi` sends notifications with Hindi templates | int | N |
| TC-I18N-07 | With no provider configured, content shows in its source language, never blank | int | N |

### S4 · Brand identity and theme — `blocked: owner O-6` (depends S1)
- **Changes:** Run `/mattpocock-skills:prototype` for 2–3 directions. After the owner picks one, add theme tokens, logo or wordmark, home page hero, dividers and footer. Use photos approved by the owner.

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-BRAND-01 | All new colours are theme tokens (the existing raw-hex check passes), and contrast checks pass | unit | N |
| TC-BRAND-02 | Reduced-motion users see no animation on the new hero | manual | N |

### S5 · Guides, Places of interest, Public listings — `todo` (depends S1, plan 02 S3)
- **Changes:**
  - Add Platform-owned tables `guides(slug, kind [reach, place, activity, season], body…)`, `places`, and `public_listings` (with an `operator_kind` of government or non-profit).
  - Add Content editor screens.
  - Add public pages: `/guides/how-to-reach/<from>`, `/places/<slug>`, `/experiences` (Public listings appear alongside Partner listings, badged "Govt / non-profit · free").
  - Seed drafts of the six "how to reach" guides.

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-GDE-01 | A Content editor publishes a Guide in 3 languages, and a Partner role can't edit it | int | S |
| TC-GDE-02 | A Public listing never appears in Featured placements and never records chargeable Usage | int | N |
| TC-GDE-03 | The six how-to-reach guides exist (as drafts) with road, rail and air sections | int | N |

## Open questions (refine before Ready)
1. Confirm `next-intl`, or choose another library.
2. Which translation backend for `TranslationProvider`: Claude API, Google Translate, or none at first? This one has a cost per call, which is metered.
3. Who reviews the Marathi and Hindi UI catalogues? A family member, a local volunteer, or a paid translator?
4. Is the Malvani and Konkani phrase list supplied by the owner, or drafted and then checked?
5. Brand: is the name "Discover Tarkarli" final, or open to a Malvani-flavoured wordmark?

## Done when
S1–S5 are `done`. F-I18N, F-BRAND and F-GDE are Built.
