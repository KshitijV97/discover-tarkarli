# AGENTS.md

Instructions for any AI coding agent working in this repository (Claude Code, OpenAI Codex, OpenCode, Z.ai GLM, Gemini CLI, Cursor, and others). This file is the harness-neutral entry point. Tool-specific files (`CLAUDE.md`) point here.

## Read first, in this order
1. **This file**: commands, rules, invariants.
   Then **[docs/vision.md](docs/vision.md)**: where the product is going (marketplace + partners).
2. **[docs/context/README.md](docs/context/README.md)**: the full context pack. Requirements, working rules, decision history, and the current handoff state.
3. **[docs/README.md](docs/README.md)**: detailed technical docs (architecture, booking rules, data model, payments, auth, admin, deployment).

## What this project is
**Discover Tarkarli** (discovertarkarli.com, in progress): a destination platform for booking stays, food and experiences on the Tarkarli / Malvan coast, with local businesses as partners (tenants). Today the code runs one property, **Golden Tide Retreat**, a 6-room beachfront homestay with a restaurant, which becomes partner #1. Guests book rooms, plan meals and pay a deposit online. Staff get WhatsApp, Telegram and SMS updates. Direction and the technical changes it drives: [docs/vision.md](docs/vision.md). The codebase is **copyright Kshitij Vengurlekar, under a restricted licence** (see [LICENSE](LICENSE)). Do not copy, publish or redistribute code outside the owner's direction.

Stack: Next.js 14 App Router · TypeScript (strict) · Tailwind · PostgreSQL via `postgres.js` · Razorpay · Auth.js · Vitest.

**Portability is a hard requirement.** No supabase-js, no Vercel-only APIs, no vendor SDK lock-in. Everything must run on any Node host with any Postgres.

## Commands
```bash
npm run dev            # http://localhost:3000
npm run typecheck      # tsc --noEmit
npm run lint
npm test               # vitest (src/**/*.test.ts)
npm run build
npm run db:up          # local Postgres 16 in Docker (port 54329)
npm run db:migrate     # apply db/migrations/*.sql to $DATABASE_URL
npm run db:seed        # idempotent sample data + default settings
```
Before committing: `npm run typecheck && npm run lint && npm test`. The pre-push hook runs the same; CI re-checks every push. Smoke-check a running site with `npm run smoke -- <url>`. Database rules are covered by `npm run test:integration` (real Postgres; add cases in `src/lib/server/*.int.test.ts` with `setupTestDb()`).

## Working rules (short form; full list in docs/context/rules.md)
- **Ask few, decide the rest.** Ask only the 3 to 4 questions that change the design, as multiple choice with a recommended default. Take sensible defaults for everything else and record them.
- **Never work around credentials or sandboxes.** If a secret, connection string or network route is wrong or blocked, stop and ask the owner for the exact value or command. Do not probe, derive or disable anything to get past it.
- **Changes go through a pull request** (ADR 020 in [docs/decisions.md](docs/decisions.md)). Branch from `main`, commit, push the branch, and open a PR. Never push to `main`. Pushing a branch creates a Vercel preview. The owner merges, and the merge deploys production. No tags or releases are needed.
- **Commits are the owner's.** Plain-English messages. **No `Co-Authored-By` or AI attribution trailers.**
- **Guardrails still apply:** before opening or updating a PR, make sure there are no blatant syntax or type errors (`npm run typecheck`). Ask first before messages to guests or staff, and before changing live prices or policy copy.
- **Update the docs in the same change** whenever behaviour, schema, settings, env vars or endpoints change.
- **Report outcomes faithfully.** If a check fails or was not run, say so.

## Architecture and invariants: do not break these
- **No double-booking** is enforced by the `booking_rooms_no_overlap` exclusion constraint. `stay` and `blocks_inventory` are maintained by triggers; never set them by hand. Postgres error `23P01` maps to HTTP 409.
- **Money is integer paise in code** and `numeric(12,2)` rupees in the DB. Use `rupeesToPaise` / `paiseToRupeesString`; display with `formatINR`.
- **Dates are `YYYY-MM-DD` strings** (`ISODate`). Use `lib/dates.ts`. Wall-clock times go through `zonedTimeToUtc` with `settings.property.timezone`.
- **The server recomputes every price.** Never trust client totals.
- **Price snapshots** on booking lines are fixed at creation. Edits keep existing prices.
- **Payments are idempotent.** `recordPayment()` is called by the browser callback and the webhook. Keep it safe to repeat.
- **`notify()` never throws** and runs after the DB commit. Pass a `dedupeKey` for anything that may fire twice.
- **Build for many partners.** The repo is public. New tables include `partner_id` (see `GLOSSARY.md` and `docs/plans/`); new features must not assume a single property. Never commit secrets, real guest data or the owner's private photos.
- **Business values belong in `settings`** (zod field with a default in `lib/settings.ts`). Secrets belong in env.
- **Motion respects reduced motion**: use `components/fx` primitives.
- **Styling uses theme tokens only** (`bg-primary`, `text-muted`, …) from `src/theme/theme.config.ts`. No raw hex or Tailwind palette colours in components.
- **Pure core, thin shell.** `lib/booking`, `lib/dates.ts`, `lib/money.ts`, `lib/settings.ts`, `lib/notifications/*` (domain), `lib/admin/settings-form.ts` do no I/O. `lib/server/*` has all DB and side effects (`import "server-only"`).
- **Migrations are append-only.** Never edit an applied `db/migrations/NNNN_*.sql`. Add a new file.
- Route handlers are thin: zod parse, call a service, `errorResponse()`.

Full domain rules: [docs/booking-rules.md](docs/booking-rules.md). Why things are this way: [docs/decisions.md](docs/decisions.md).

## Secrets
Secrets are **not in git**. `.env.local` and `.env.production.local` are local only. If you change harness or machine, the owner must copy them securely (password manager or direct transfer). Never print their values, never commit them, never paste them into a prompt or a PR.

## Current state
See [docs/context/handoff.md](docs/context/handoff.md) for branch, deploy state, what is verified, and what is waiting on the owner.
