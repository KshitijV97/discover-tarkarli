# Testing strategy

> **Status:** unit tests exist (5 files, `npm test`). Everything else here is **planned**; the manual plan in [manual-test-plan.md](manual-test-plan.md) is usable today.

## Goals
1. You can **manually test every feature** from a written plan ([manual-test-plan.md](manual-test-plan.md)).
2. Three named suites (**smoke**, **sanity**, **regression**) with well-documented cases.
3. **Unit** and **integration** tests wherever possible, and the product's **feature catalog is reflected as test results** ([feature-catalog.md](feature-catalog.md) and the matrix report below).
4. **You never wait on integration tests.** They run in the background and you read their status when you want it.

## The pyramid

| Level | What it proves | Speed | Runs | Command (planned unless noted) |
|---|---|---|---|---|
| **Unit** | Pure rules: pricing, GST, cutoff, occupancy, notification routing, settings schema, roles | seconds | every pre-push, every CI run | `npm test` (exists) |
| **Integration** | Things only Postgres can prove: no double-booking (`23P01`→409), triggers, idempotent payments, settings round-trip, price snapshots, cron jobs, tenant isolation | 1–3 min | **in the background**, and as its own CI job | `npm run test:integration` |
| **API/E2E** | Real journeys through the running app | 3–10 min | CI on `main`, before a release | `npm run test:e2e` (Playwright) |
| **Manual** | Look and feel, real providers (Razorpay, WhatsApp, SMS, Google), anything flaky to automate | you | per release, per suite | [manual-test-plan.md](manual-test-plan.md) |

Rule from `CLAUDE.md` stays: put new domain logic in the pure core so it is unit-testable without a database.

## The three suites

Suites are **cumulative**: smoke ⊂ sanity ⊂ regression. Every case in the manual plan has a suite letter: **S**, **N** or **R**, meaning the *smallest* suite that includes it.

| Suite | Purpose | Cases | Budget | When |
|---|---|---|---|---|
| **Smoke** | "Is it alive?" The site loads, a booking can be made, admin opens, cron is protected | ~12 | ≤ 10 min manual, ≤ 1 min automated | After every deploy (including production) |
| **Sanity** | "Do the features I touched, and their neighbours, work?" Happy paths of every feature plus the main rules | ~45 | ≤ 45 min manual | Before telling anyone a release is good |
| **Regression** | "Did anything old break?" Everything: edge cases, security, rules, real providers | all | ~3 h manual, fully scripted where possible | Before a release tag, before onboarding a tenant, after any schema change |

### Automating each suite
- **Smoke:** `npm run test:smoke` = unit tests titled `[smoke]` + `scripts/smoke.mjs <baseUrl>`, which makes plain HTTP calls: `/` returns 200, `/api/availability` returns JSON, `/api/cron/daily` returns 401 without the secret, `/admin` redirects when signed out. It needs no browser and no database access, so it is safe to point at production.
- **Sanity:** smoke + every test tagged `[sanity]` (unit and integration).
- **Regression:** everything: all unit, integration and E2E tests.

Tags go in the test title, so the stock `vitest -t "\[smoke\]"` filter works:
```ts
it("[smoke] TC-PRC-01 Sea Breeze, 2 nights, 2 guests = ₹13,650 incl. GST", …)
```

## Test case IDs and the feature catalog
- Every feature has an ID such as `F-BKG` (booking). Every test case has `TC-<FEATURE>-<NN>`, for example `TC-BKG-03`.
- The **same ID** appears in the manual plan, in the automated test title, and in the report. That is the whole trick: one ID joins all three.
- A case's **Auto** column says the highest level where it can be automated: `unit`, `integration`, `e2e` or `manual` (provider- or eyeball-only).
- Rule: **a pull request that adds a feature adds its catalog rows and cases in the same change.** A feature with no cases shows as a red "no tests" row in the report.

## Integration tests that never block you
Design so they cost you nothing:

1. **Separate config.** `vitest.integration.config.ts` includes only `src/**/*.int.test.ts`. `npm test` never runs them, so the pre-push hook stays under 30 s.
2. **Fresh schema per file.** Each file creates `test_<random>`, applies `db/migrations/*.sql`, runs, drops. Files run in parallel without touching each other or your dev data.
3. **Background runner.** `npm run test:integration:bg` starts the suite detached and writes `reports/integration.json` plus a log. You keep working.
4. **Always-visible status.** `npm run test:status` prints one line per suite (last run time, pass/fail counts, failures by feature). The same line can go in the shell prompt or a desktop notification.
5. **CI runs them in a separate job**, in parallel with the fast job. A failing integration job blocks a release tag, but not a push to `main`.
6. **Local Postgres only when needed.** The runner starts `npm run db:up` if port 54329 is closed.

## The feature matrix (your catalog as test results)
`npm run test:matrix` (planned) joins three inputs and writes `reports/feature-matrix.md` and `reports/feature-matrix.html`:

| Input | Source |
|---|---|
| Catalog and case IDs | [feature-catalog.md](feature-catalog.md) and [manual-test-plan.md](manual-test-plan.md) |
| Automated results | vitest JSON reporter (`--reporter=json`) for unit and integration; Playwright JSON for E2E |
| Manual results | `docs/testing/manual-results.csv` (`caseId,date,tester,result,notes,build`), appended after each manual run |

Output, one row per feature, one cell per level:

```
Feature              Status   Unit   Integration   E2E   Manual   Cases
F-BKG Booking        ✅       12/12  5/5           2/2   9/10     28
F-PAY Payments       ⚠️       6/6    3/4           –     2/2      14
F-ASSIST Assistant   ⬜ planned                                     0
```
Statuses: ✅ all pass · ⚠️ some fail or stale (> 30 days) · ❌ failing · ⬜ planned / no tests. CI publishes the matrix as the job summary, so every run shows catalog health. The headline numbers to track: **% of catalog cases with automation** and **% passing**.

## Test data
- `npm run db:seed` gives 6 rooms (Sea Breeze ₹6,500 ×4 guests, Sunset ₹5,200 ×3, Coral ₹4,200 ×2, Driftwood ₹3,900 ×2, …) and default settings. Manual cases use these figures.
- Integration tests build their own data with small factory helpers (`makeRoom`, `makeBooking`), never the seed, so they don't drift when seed data changes.
- Time-dependent rules (cutoffs, holds, balance reminders) are tested with an injected clock in unit and integration tests. Manually, use the tricks listed in the plan's "Controlling time" section.

## Rules
- A failing test is fixed or reverted, never skipped (see [quality-gates.md](../quality-gates.md)).
- Contract tests for every provider: the same suite runs against the fake and, where possible, the real provider in test mode.
- Multi-tenancy adds a standing regression group, **F-TEN**: tenant A can never read or write tenant B's rows, through the API, the admin or the database (RLS).

## Build order (also in the roadmap)
1. Pre-push hook and CI (quality-gates phase 1).
2. Case-ID convention, `[smoke]/[sanity]` tags, `test:smoke`, `scripts/smoke.mjs`.
3. Integration harness and the first 8 tests (no double-booking, triggers, idempotent payment, settings, snapshots, cron holds, webhook signature, cutoff at booking).
4. `test:integration:bg`, `test:status`, `test:matrix`, CI summary.
5. Playwright journeys (5–10).
6. Backfill unit tests until every `Auto = unit` case in the plan has a test.
