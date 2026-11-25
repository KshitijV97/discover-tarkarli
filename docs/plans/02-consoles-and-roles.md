# 02 · Consoles, roles and support sessions

> **Status: Draft.** Depends on: 01. Feature ids: **F-RBAC**, **F-CON**, **F-ONB**. Glossary: Owner, Platform admin, Content editor, Finance, Partner owner, Manager, Staff, Support session, Partner application.

## Problem
Roles come from env allow-lists and are global. The Platform needs two consoles: a **Platform console** for the Owner and team, and a **Partner console** for each Partner. Permissions must be precise, and Platform staff must reach a Partner's guest data only through an audited **Support session**.

## Users and stories
- As the **Owner**, I invite Platform users and give them a role. I see every Partner, approve or suspend them, and see a full audit log.
- As a **Partner owner**, I invite my Managers and Staff, and remove them.
- As a **Staff** member, I see today's bookings and check guests in. I can't see money settings.
- As a **Platform admin**, I open a Support session with a reason to help a Partner. The Partner owner is told, and can read exactly what I looked at or changed.
- As a business, I can start a **Partner application** myself from my phone. The Owner approves it before I go public.

## Scope
- Role tables, permission checks, and both consoles' shells and navigation.
- The Partner application flow up to approval.
- Support sessions.
- The audit log, extended to platform actions.
- Moving today's `/admin` into the Partner console.

## Non-goals
Listing editors (plan 03), payment and tax settings (plan 06), offline (plan 05), Featured slot management (plan 03).

## Decisions (made)
- **Roles:**
  - Platform: `owner`, `platform_admin`, `content_editor`, `finance`.
  - Partner: `partner_owner`, `manager`, `staff`.
  - One user can hold memberships in several Partners.
- **Permissions:**
  - A pure module `src/lib/auth/permissions.ts` defines `can(actor, action, resource)`. It has a table-driven unit test for every role × action pair.
  - Services call it. Pages call `requirePermission()`.
  - Roles no longer come from `ADMIN_EMAILS`/`STAFF_EMAILS`. Those env vars remain only to **bootstrap** the Owner on an empty database.
- **Support sessions:**
  - They last at most 60 minutes and are read-only by default. Write access needs a second confirmation, and that step is logged too.
  - The Partner owner is notified when a session opens, through `notify()` with a dedupe key.
  - All reads and writes during a session are tied to its id in the audit log, and the Partner owner can see that log.
- **Partner applications:**
  - Anyone signed in can submit one: business name, type, phone, area, a short description and photos.
  - The application creates a `partners` row with status `applied`. It isn't public and can't take bookings.
  - The Owner or a Platform admin approves it, which makes it `active` and the applicant its `partner_owner`, or rejects it with a reason.
  - "Invite-only" means approval is required. Invite links are an optional shortcut that pre-fills the application.
- **URLs:** `/platform/*` for the Platform console, `/partner/[slug]/*` for the Partner console. `/admin` redirects to Partner #1's console for continuity.

## Slices

### S1 · Role and membership tables, permission module — `todo`
- **Changes:**
  - Migration: `platform_roles(user_id, role)`, `partner_members(partner_id, user_id, role)` (partner-owned, with RLS).
  - Add `permissions.ts` with its test.
  - Session loading returns the platform role plus memberships.
  - Bootstrap: on first sign-in, an email listed in `ADMIN_EMAILS` becomes `owner` if no owner exists.

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-RBAC-01 | Permission table: every role × action pair matches the matrix in this plan's appendix | unit | S |
| TC-RBAC-02 | A user who is `staff` in A and `manager` in B gets the right rights in each, and none in C | int | N |
| TC-RBAC-03 | `staff` can't read or change settings, payouts or team (403 via API, hidden in UI) | int | N |
| TC-RBAC-04 | The first sign-in from `ADMIN_EMAILS` becomes `owner` only if no owner exists | int | N |

### S2 · Partner console shell; move /admin into it — `todo` (depends S1)
- **Changes:** Add `/partner/[slug]` layout with mobile-first navigation (bottom bar on mobile). Move existing admin pages under it, scoped by `withPartner`. Add the `/admin` redirect. Add a team page: invite by phone or email, change roles, remove members.

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-CON-01 | A Partner #1 manager sees all of today's admin features at `/partner/golden-tide-retreat` | e2e/manual | S |
| TC-CON-02 | Visiting another Partner's console slug returns 404, not 403 (no existence leak) | int | N |
| TC-CON-03 | Every console page is usable at 375 px with 44 px targets | manual | N |
| TC-TEN-06 | A settings change in Partner A never appears in Partner B | int | R |

### S3 · Platform console shell and platform settings — `todo` (depends S1)
- **Changes:**
  - Add a `/platform` layout.
  - Partners list with status filters, and a partner detail page with status changes.
  - A `platform_settings` table (key → zod-validated JSON, like `settings`) for platform-wide values. Plans 03, 04 and 06 add their keys here.
  - A platform users page.

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-CON-04 | Only platform roles can open `/platform`, and `content_editor` sees only content sections | int | N |
| TC-CON-05 | Suspending a Partner hides its listing and Partner site within one request, and its console turns read-only | int | N |

### S4 · Partner application and approval — `todo` (depends S3)
- **Changes:** Add a public `/partners/apply` form (mobile-first, photo upload), an approval queue in the Platform console, and approve/reject actions. Applicant and Owner are notified through `notify()`.

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-ONB-01 | A signed-in user submits an application, and an `applied` Partner exists that isn't visible publicly | int | S |
| TC-ONB-02 | Approval makes the Partner `active` and the applicant `partner_owner`, and both are notified once | int | N |
| TC-ONB-03 | Rejection records a reason, and the applicant can see it and re-apply | int | R |
| TC-ONB-04 | An invite link pre-fills the application and marks it invited | int | R |

### S5 · Support sessions and the platform audit log — `todo` (depends S2, S3)
- **Changes:** Migration `support_sessions(id, platform_user_id, partner_id, reason, mode, opened_at, expires_at, closed_at)`. Platform users enter a Partner console only through an open session, and `withPartner` records the session id in the audit log. Add an "elevate to write" action and a log view for the Partner owner.

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-RBAC-05 | Without an open session, a `platform_admin` gets 404 on a Partner's bookings | int | S |
| TC-RBAC-06 | In a read-only session, every write is refused, and after elevation writes succeed and are logged with the session id | int | N |
| TC-RBAC-07 | A session expires after 60 min, and later requests are refused | int | N |
| TC-RBAC-08 | The Partner owner is notified on open (deduped) and can see the session's full log | int | N |

## Appendix: permission matrix (to confirm in refinement)
| Action | owner | platform_admin | content_editor | finance | partner_owner | manager | staff |
|---|---|---|---|---|---|---|---|
| Approve or suspend Partners | ✓ | ✓ | | | | | |
| Edit Guides, Places, Public listings, translations | ✓ | ✓ | ✓ | | | | |
| See Usage across Partners | ✓ | ✓ | | ✓ | | | |
| Manage Featured slots | ✓ | ✓ | | ✓ | | | |
| Open a Support session | ✓ | ✓ | | | | | |
| Partner team and payout account | | | | | ✓ | | |
| Listing, prices, partner settings | | | | | ✓ | ✓ | |
| Bookings, check-in/out, desk payments | | | | | ✓ | ✓ | ✓ |
| See own Usage | | | | | ✓ | ✓ | |

## Open questions (refine before Ready)
1. Should `finance` see Partners' booking totals (not guest names) without a Support session, for future invoicing? Default: yes, aggregates only.
2. Should a Partner owner be able to **block** Support sessions entirely? Default: no, but every session is visible to them.
3. Can staff be invited by phone number before phone OTP exists? Default: invite by email (Google sign-in) now, phone later.
4. Is photo upload storage decided (S4)? Default: an S3-compatible bucket behind a `StorageProvider` interface (Supabase Storage today, for portability). Needs an owner OK.

## Done when
S1–S5 are `done`. F-RBAC, F-CON and F-ONB are Built, and [auth.md](../auth.md) and [admin.md](../admin.md) are updated.
