# Feature catalog

The list of everything the product does (or will do). Each feature has an ID, a status and the test cases that cover it. Cases are written out in [manual-test-plan.md](manual-test-plan.md). The report described in [README.md](README.md#the-feature-matrix-your-catalog-as-test-results) turns this table into pass/fail results.

Status: **Built** · **Partial** · **Planned**. "Cases" counts cases in the manual plan (planned features have none yet; they show as ⬜ in the report until their cases are written).

## Guest-facing
| ID | Feature | Status | Cases | Notes |
|---|---|---|---|---|
| F-UI | Public site (home, rooms, responsive, reduced motion, 404) | Built | `TC-UI-*` | Real photography still TODO |
| F-AVL | Availability and calendar (sold-out nights, same-day turnover) | Built | `TC-AVL-*` | |
| F-BKG | Room booking (multi-room, occupancy, min/max nights, holds, double-booking guard) | Built | `TC-BKG-*` | |
| F-MEAL | Meals (free breakfast, lunch/dinner headcount, cutoff, snapshots, edit) | Built | `TC-MEAL-*` | |
| F-PRC | Pricing, GST, deposit | Built | `TC-PRC-*` | |
| F-PAY | Online deposit (Razorpay orders, verify, webhook, late payment) | Built | `TC-PAY-*` | Needs Razorpay test keys |
| F-MGT | Manage-booking link (`/booking/[token]`) | Built | `TC-MGT-*` | |
| F-ACC | Guest account (`/account` history) | Built | `TC-ACC-*` | |
| F-AUTH | Sign-in (Google) and roles | Built (needs OAuth setup) | `TC-AUTH-*` | Phone OTP planned |
| F-OTP | Phone OTP sign-in (India) | Planned | – | |
| F-REF | Refunds on cancellation | Planned | – | |
| F-INV | GST invoice PDF | Planned | – | |
| F-ALC | À la carte in-stay ordering | Planned | – | |
| F-ACT | Third-party activities | Planned | – | See future-services.md |
| F-TOUR | Guided walkthroughs (guest and admin) | Planned | – | See guided-experience.md |
| F-ASSIST | AI assistant and owner handoff | Planned | – | See guided-experience.md |

## Operations
| ID | Feature | Status | Cases | Notes |
|---|---|---|---|---|
| F-NTF | Notifications (events, routing, dedupe, retries, templates, channels) and their admin editor | Built | `TC-NTF-*` | Real channels need credentials |
| F-CRN | Daily jobs (expire holds, balance reminders, kitchen summary, retries) | Built | `TC-CRN-*` | |
| F-ADM | Admin overview and bookings list | Partial | `TC-ADM-*` | Booking detail, rooms, menu, notification log not built |
| F-SET | Settings editor (property, deposit, meals, tax, booking) with change history | Built | `TC-SET-*` | |
| F-THM | Theme editor with live preview and contrast checks | Built | `TC-THM-*` | |
| F-ADM2 | Booking detail, check-in/out, cancel, desk payments, date/room/meal changes, message log + resend, rooms and menu editors, audit log | Built | `TC-ADM2-*` | Photo upload not built |

## Platform
| ID | Feature | Status | Cases | Notes |
|---|---|---|---|---|
| F-SEC | Security (secrets, auth on routes, input validation) | Built | `TC-SEC-*` | |
| F-A11Y | Accessibility | Built | `TC-A11Y-*` | |
| F-PERF | Performance budgets | Built | `TC-PERF-*` | |
| F-CHN | Room types and channel sync (iCal, OTAs) | Planned | – | |
| F-TEN | Multi-tenancy (tenants, domains, isolation, cells) | Planned | – | Isolation cases are a standing regression group |
| F-FLG | Feature flags: entitlements and preferences | Planned | – | |
| F-ONB | Tenant onboarding wizard and platform console | Planned | – | |
| F-BILL | SaaS billing | Planned | – | |

## Adding a feature
1. Add a row here (ID, status `Planned`).
2. Write its cases in the manual plan **before** coding: steps, expected result, suite letter, Auto level.
3. Write the automated tests with the case ID in the title.
4. Flip the status to `Built` when its sanity cases pass.
