# History

Chronological record of what was built and why. Newest at the bottom. Each entry gives the commit hash and the reason, so the "why" survives even when the chat does not.

All dates are 2026-11-04 unless noted. The project was built in one long working session.

## Foundation
- **`0ff81ff` v1 core: room booking with live availability and meal planning.** Booking uses a calendar with sold-out nights, multi-room bookings, and a DB exclusion constraint so double-booking is impossible even under concurrency. Meals are headcounts with a cutoff. *Why:* the owner's core need is a reliable booking flow for a small property.
- **`9d7a0a0` pluggable notifications and Razorpay deposits.** One `notify()` routes events to WhatsApp, Telegram or SMS through an outbox with dedupe and retries. Razorpay takes the deposit through a REST adapter, with idempotent recording from both the browser callback and the webhook. *Why:* staff must hear about bookings on their phones, and guests pay a deposit online without a booking being lost.
- **`91c894a` docs folder, CLAUDE.md, slim README.** *Why:* decisions had to live in the repo, not in chat.

## Deployment and hardening
- **`2a23ba4`, `b3993b6` env handling.** Local env files are ignored; `.env.example` is tracked.
- **`16e6e9e` Razorpay onboarding checklist (TODO).** The owner must create the Razorpay account and KYC, which only the owner can do.
- **`da87f0d` migrations on Vercel production builds, Supabase Tokyo region, `.vercelignore`.** The owner's network blocks Postgres ports, so migrations run in the Vercel build (decision 012).
- **`67d2f5a` pages hanging in production.** Pool size 1 with a transaction pooler pipelined queries and hung. The code now enforces at least 3 connections (decision 013).
- **`4640385` TODO: move Vercel and Supabase to Mumbai.** Latency for Indian guests. The region setting in `vercel.json` still says `hnd1` (see handoff).

## Redesign and sign-in
- **`d19b6d4` animated redesign and Google sign-in (Auth.js).** The owner wanted a more modern, animated site. Sign-in is optional for guests. Staff roles come from env allow-lists (decision 014). Motion respects reduced motion (decision 015).

## Admin, planning and licence
- **`41f1809` admin dashboard and planning docs.** The owner asked "where is the admin login, has it been built?" Sign-in existed, but the dashboard was a placeholder. Built: overview, bookings list with date filter, admin-only settings editor with server-side validation. Also added TODO docs: third-party activities, multi-tenant SaaS, phased quality gates, SaaS billing, and a restricted licence with copyright. *Why:* the owner needs to configure the property without code changes, and wants the platform to be sellable.
- The owner asked to push and deploy. The branch was pushed. **Production deploy was blocked** by the permission classifier and has not happened.

## Branding
- **`dec77f1` dog-friendly and local food branding.** The owner's property is dog friendly and air-conditioned, and serves Konkan dishes. Added hero badges, a dog-friendly section, a `/food` page with Solkadhi as signature, and gitignored `/photos/`, which holds the owner's private photos. Dish and dog-policy wording is unconfirmed (see handoff).

## Context portability
- This entry's commit: `AGENTS.md` and `docs/context/`. *Why:* the owner expects to hit a Claude Pro usage limit and needs to continue with Codex, OpenCode, Z.ai GLM or another tool. Everything a new agent needs was moved out of Claude-only memory and into the repo.

## Release process
- Uncommitted at the time of writing: `docs/release-process.md` and `.github/pull_request_template.md`. Every requirement now gets its own branch, a detailed PR, owner approval, a squash merge, a `vX.Y.Z` tag, and a Vercel production deploy from `main`. *Why:* the owner wants approval before anything reaches production, and wants commits attributed to the owner (no AI co-author trailers).

## Workflow switch
- The owner chose direct-to-main fast mode: commit and push to `main`, no PRs, approvals or tags. *Why:* speed and momentum. The release process is kept for reference. See decision 016.

## Decisions that shaped the work
See [../decisions.md](../decisions.md) (001 to 015). The most consequential:
- Plain Postgres and postgres.js instead of Supabase client libraries (portability).
- Database-level double-booking protection.
- Price snapshots on every booking line, so settings changes never alter existing bookings.
- Settings table with typed defaults, so business rules are editable at runtime.
- Auth.js with users in our own Postgres.
