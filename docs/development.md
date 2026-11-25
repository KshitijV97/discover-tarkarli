# Development

## Prerequisites
Node 18+ (tested on 24), Docker (for local Postgres).

## Setup
```bash
cp .env.example .env.local
npm install
npm run db:up        # Postgres 16 on localhost:54329
npm run db:migrate
npm run db:seed
npm run dev          # http://localhost:3000
```
Reset the local DB: `docker compose down -v && npm run db:up && npm run db:migrate && npm run db:seed`.

## Scripts
| Script | |
|---|---|
| `dev` / `build` / `start` | Next.js |
| `typecheck` | `tsc --noEmit` |
| `lint` | ESLint (next/core-web-vitals) |
| `test` | Vitest unit tests (`src/**/*.test.ts`) |
| `test:smoke` / `test:sanity` | Only unit tests tagged `[smoke]` (or `[smoke]` and `[sanity]`) in their title |
| `smoke` | `npm run smoke -- <baseUrl>`: read-only HTTP checks against a running site, safe on production |
| `prepare` | Runs on `npm install`; points git at `.githooks/` so the pre-push gate runs |
| `test:integration` | Integration tests on real Postgres 16 (`*.int.test.ts`). Starts a local throwaway Postgres if `TEST_DATABASE_URL` isn't set |
| `test:integration:bg` | Same, detached; results in `reports/` |
| `test:status` | One line per suite: last run, pass/fail, failing case IDs |
| `test:matrix` | Feature catalog as test results → `reports/feature-matrix.md` |
| `db:up` | start local Postgres (Docker) |
| `db:migrate` | apply new `db/migrations/*.sql` to `DATABASE_URL` |
| `db:seed` | idempotent sample rooms, menu, settings |

## Testing payments locally
Set test keys in `.env.local` (`RAZORPAY_KEY_ID=rzp_test_…`). The browser callback confirms payments locally; webhooks need a tunnel. Signed requests can be simulated — see `src/lib/payments/razorpay.test.ts`.

## Testing notifications locally
Without credentials, every delivery is logged in `notifications` as `skipped` and printed to the dev console — you can see exactly what would be sent. Add `TELEGRAM_BOT_TOKEN` + a chat id for a real, free end-to-end test.

## Conventions
- **Money** = integer paise in code. Use `rupeesToPaise`, `paiseToRupeesString`, `formatINR`.
- **Dates** = `ISODate` strings. Use helpers in `lib/dates.ts`; never `new Date("YYYY-MM-DD")` arithmetic in local time.
- **Pure vs server**: domain rules go in `lib/booking` / `lib/notifications` (pure, tested). DB and side effects only in `lib/server` (`import "server-only"`).
- **Never trust the client**: API routes validate with zod; services recompute prices.
- **Config over constants**: business values belong in `settings` (with a default in `lib/settings.ts`).
- **Styling**: theme tokens only (see design-system.md).
- **Migrations**: append-only, numbered `NNNN_name.sql`.
- **Notifications**: call `notify()` after the DB commit; pass a `dedupeKey` for anything that may be triggered twice.
- **Docs**: update `docs/` in the same commit as the behaviour change.

## Git workflow
Pull requests (ADR 020 in [decisions.md](decisions.md)):
- Branch from `main`, commit, push the branch, and open a PR with `gh pr create`. Never push to `main` directly. Plain-English commit messages, no AI trailers.
- A pushed branch gets a Vercel preview deployment. The owner merges, and the merge deploys production. Run `npm run typecheck` before every push.
- For logic, config or build changes, also run `npm run lint`, `npm test` and `npm run build`.
- **Pre-push hook** (`.githooks/pre-push`) runs typecheck, lint and unit tests automatically. Emergency skip: `git push --no-verify`.
- **CI** (`.github/workflows/ci.yml`) runs on every push to `main` and every PR: typecheck, lint, tests, migrations on a fresh Postgres 16 (twice, to prove they are idempotent), seed, build, and the smoke script against the built app. A PR with red CI is not merged. Fix it on the branch.
- The earlier PR and tag process is in [release-process.md](release-process.md), kept for reference.
