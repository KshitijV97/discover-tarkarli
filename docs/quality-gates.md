# Future: quality gates (TODO, in phases)

> **Status: planned.** Current state: `npm run typecheck`, `npm run lint` and `npm test` exist and are run by hand (see [development.md](development.md)). There are no git hooks, no CI pipeline and no integration or end-to-end tests yet.

## Goal
Every change is tested, linted and type-checked **before it leaves the developer's machine**, and every merge is checked again on a clean machine. Checks must be fast, so nobody turns them off.

## Phases

Each phase is independently useful. Stop after any phase if the cost is not worth it.

### Phase 1: local gate and CI (do first)
- **Pre-push hook** with no dependencies. A `.githooks/pre-push` script, activated by `git config core.hooksPath .githooks` from an `npm run prepare` script. It runs `typecheck`, `lint` and `test` (about a minute). Skip with `--no-verify` only in emergencies.
- **Pre-commit (optional)**: format and lint staged files only, to keep commits fast.
- **CI on every push and pull request** (GitHub Actions, free tier for private repos within limits): install, typecheck, lint, test, `next build`. Blocks merge to `main`.
- **Migration check in CI**: apply `db/migrations/*.sql` to a throwaway Postgres 16 service container, so a broken migration fails before Vercel runs it.

*Why first:* it is cheap (under an hour), protects every later change, and catches the bugs that matter most (type errors, broken imports, migration mistakes).

### Phase 2: integration tests against real Postgres
Unit tests cannot prove the invariants that live in the database. Add a suite that runs against Postgres 16 (the docker-compose service in CI, or a local one):
- No double-booking: two overlapping bookings for the same room, the second gets `23P01` and maps to HTTP 409.
- Triggers keep `stay` and `blocks_inventory` in sync.
- Payments are idempotent: `recordPayment()` called twice from browser and webhook leaves one payment row and one notification.
- Settings round-trip: a value saved by the admin is read back and validated.
- Price snapshots survive a room price change.

Use a fresh schema per test file, so tests run in parallel without interfering.

### Phase 3: end-to-end tests of key journeys
Playwright, run in CI against a preview deploy or `next start`:
- Guest books a stay, pays a deposit (Razorpay test mode), sees confirmation.
- Guest edits meals before the cutoff and is blocked after it.
- Staff signs in, filters bookings, and changes a setting.
- Accessibility smoke test (axe) on public pages.

Keep to 5 to 10 journeys. Each one is slow and flaky if there are too many.

### Phase 4: coverage, performance and visual checks
- Coverage thresholds on the pure core (`lib/booking`, `lib/notifications`, `lib/payments`, `lib/auth`), for example 90%. Do not gate the UI on coverage.
- Lighthouse CI on the public pages (mobile), with a budget for image weight and JavaScript.
- Visual snapshot tests for the theme tokens, once the UI packs exist for multi-tenancy.

### Phase 5: release hygiene
- Preview deploy per pull request.
- Automatic changelog from conventional commits.
- Dependency update bot with a test run.
- Secret scanning in the hook and CI (for example gitleaks).

## Suggested order
Phase 1, then Phase 2 (the database invariants are the highest risk), then Phase 3. Phases 4 and 5 can wait until multi-tenancy starts, because that is when UI packs and release volume justify them.

## Rules for every phase
- A failing test is never skipped to get a change merged. Fix it or revert it.
- Test the pure core first. Put new domain logic in `src/lib/booking`, `src/lib/notifications`, etc., so it can be tested without a database.
- Every new external integration gets a contract test with a fake, as well as a test with the real provider in test mode where possible.
