# 05 · Partner PWA with offline queue

> **Status: Draft.** Depends on: 02. Feature id: **F-PWA**.

## Problem
Partners run their business from a phone, often on patchy coastal networks. The Partner console must install like an app, stay readable offline, and **queue some actions** while offline, replaying them safely when the network returns.

## Users and stories
- As a Partner manager, I add the console to my home screen and open it like an app.
- As Staff with no signal, I can still see today's arrivals and in-house guests.
- As Staff with no signal, I check a guest in, mark a cash balance paid, add a note, change a meal headcount, or reply to an enquiry. Each shows as "queued" and applies by itself when I'm back online.
- If a queued action can't apply (e.g. the booking was cancelled meanwhile), I see it in a **"Needs attention"** list with the reason.

## Scope
Web app manifest and icons, a service worker, offline read cache for the Partner console's day view, an offline action queue with idempotent replay, and the "Needs attention" list.

## Non-goals
A native app. Offline guest-facing booking. Offline creation of new bookings, price, settings or payout changes (these stay online-only, by decision).

## Decisions (made)
- **Queueable actions:**
  - check-in
  - check-out
  - mark balance paid (cash or UPI)
  - staff note
  - meal headcount change
  - enquiry reply
- **Online only:** everything else. Their buttons are disabled offline, with a reason.
- **Idempotency:**
  - Each queued action carries a client-generated UUID `action_id`.
  - The server keeps `applied_actions(partner_id, action_id, result)` and returns the stored result on replay, the same pattern as `recordPayment()`.
  - Each action also carries the `booking.updated_at` it was based on. The server rejects it if the state no longer allows the action (not merely if the row changed). The reason goes to "Needs attention".
- **Ordering:** queued actions replay in order, per booking.
- **Storage:** IndexedDB. The queue survives app restarts. Nothing beyond the day view's data is cached, and the cache clears on sign-out.
- **Service worker:** hand-written or a small library that runs on any static host. No Vercel-only features.
- **Security:** cached data is the same data the signed-in user may see. Signing out wipes IndexedDB and caches.

## Slices

### S1 · Installable PWA — `todo`
- **Changes:** Add a manifest scoped to `/partner/`, icons, a minimal service worker, and an install prompt in the Partner console.

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-PWA-01 | Lighthouse "installable" passes for `/partner/<slug>`, and the guest pages are not in scope | manual | N |
| TC-PWA-02 | Installed on Android Chrome, it opens to the Partner day view | manual | N |

### S2 · Offline read cache for the day view — `todo` (depends S1)

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-PWA-03 | With the network off, today's arrivals and in-house guests show with a "last updated" time | e2e (Playwright offline) | N |
| TC-PWA-04 | Signing out clears cached partner data (IndexedDB and Cache Storage empty) | e2e | N |

### S3 · Idempotent action endpoint — `todo`
- **Changes:** Migration `applied_actions` (partner-owned, with RLS). Add one `POST /api/partner/[slug]/actions` that accepts `{action_id, type, booking_id, based_on, payload}`, validates with zod, applies through existing services, and stores the result.

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-PWA-05 | Sending the same `action_id` twice applies once and returns the same result | int | S |
| TC-PWA-06 | Check-in on a booking cancelled since `based_on` is rejected with a reason code | int | N |
| TC-PWA-07 | A non-queueable type (e.g. a price change) is refused | int | N |
| TC-PWA-08 | `applied_actions` is covered by the isolation meta-test | int | S |

### S4 · Client queue, replay and "Needs attention" — `todo` (depends S2, S3)

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-PWA-09 | Offline check-in shows "queued", and coming back online applies it once and updates the UI | e2e | S |
| TC-PWA-10 | Three queued actions on one booking replay in order | e2e | N |
| TC-PWA-11 | A rejected replay appears in "Needs attention" with its reason and can be dismissed | e2e | N |
| TC-PWA-12 | The queue survives closing and reopening the app | e2e/manual | N |

## Open questions (refine before Ready)
1. This plan needs Playwright (roadmap P9). Should S2/S4 introduce Playwright, or should P9 land first? Default: introduce a minimal Playwright setup in S2.
2. How long may an action wait in the queue before it's considered stale? Default: 48 hours, then it moves to "Needs attention" without replaying.
3. Should desk payments recorded offline be capped (e.g. at most the balance due)? Default: yes, the server enforces the cap on replay.

## Done when
S1–S4 are `done`. F-PWA is Built and [admin.md](../admin.md) describes offline behaviour.
