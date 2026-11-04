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
Full process: [release-process.md](release-process.md). In short:
- `main` is deployable. One requirement per branch: `<type>/<short-kebab-slug>`.
- Push the branch (Vercel makes a preview), open a detailed PR, and wait for the owner's approval.
- Squash-merge, tag `vX.Y.Z`, and Vercel deploys production from `main`.
- Conventional commit messages, authored by the owner. No AI co-author trailers.
- Before committing: `npm run typecheck && npm run lint && npm test`. Before the PR: also `npm run build`.
