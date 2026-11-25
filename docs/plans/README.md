# Plans: turning this repo into discovertarkarli.com

> Decided in a grilling session on 2026-11-24. Words in **bold capitals** (Partner, Listing, Partner site…) are defined in [GLOSSARY.md](../../GLOSSARY.md). Why things are the way they are: [decisions.md](../decisions.md), ADRs 018 and 019.

Each plan is a **PRD plus vertical slices**. A slice is one unit of work that an agent can finish alone in one session and prove with tests.

| # | Plan | Status | Depends on |
|---|---|---|---|
| 00 | [Owner actions](00-owner-actions.md) | Ready (owner) | none |
| 01 | [Tenancy core](01-tenancy-core.md) | Ready | none |
| 02 | [Consoles, roles and support sessions](02-consoles-and-roles.md) | Draft | 01 |
| 03 | [Marketplace front](03-marketplace-front.md) | Draft | 01, 02 |
| 04 | [Languages, brand and guides](04-languages-brand-guides.md) | Draft | 03 |
| 05 | [Partner PWA with offline queue](05-partner-pwa-offline.md) | Draft | 02 |
| 06 | [Partner money: payment accounts, tax profiles, UPI, messages](06-partner-money.md) | Draft | 02, 03 |

## Plan status

| Status | Meaning | Who moves it |
|---|---|---|
| **Draft** | The scope is decided, but open questions remain. Don't implement it. | The owner, through a refinement session |
| **Ready** | Every open question is answered or has a stated default, and every slice has its tests listed. Agents may start. | The owner, by editing the status line |
| **In progress** | At least one slice is done. | An agent |
| **Done** | Every slice is done, and its feature rows in the catalog show **Built**. | An agent |

Each slice also has its own status: `todo`, `doing`, `done` or `blocked: <reason>`.

## How to refine a plan (owner)
1. Run `/mattpocock-skills:grill-with-docs docs/plans/0N-….md`. It works through the **Open questions** section, updates the plan, adds to the glossary and records ADRs.
2. Use `/mattpocock-skills:prototype` for anything you need to *see* first, such as the brand, console layouts or the offline UX.
3. Use `/mattpocock-skills:research` for facts the plan depends on, such as GST rules or Meta pricing. Findings go in `docs/research/`.
4. When the open questions are empty or have defaults you accept, change the status line to **Ready**.

## How an agent implements a slice (no supervision needed)
Hand the agent this sentence: *"Implement the next `todo` slice of docs/plans/0N-….md, following docs/plans/README.md."*

The agent then:
1. **Checks it may start.** The plan is **Ready** or **In progress**, every slice the chosen slice depends on is `done`, and it has no `owner:` blocker. If any of these fails, pick the next eligible slice, or stop and report.
2. **Marks the slice `doing`** in the plan file.
3. **Writes the test cases first.** It copies the slice's `TC-…` rows into [docs/testing/manual-test-plan.md](../testing/manual-test-plan.md) and adds the feature row to [feature-catalog.md](../testing/feature-catalog.md) if it isn't there.
4. **Builds with `/mattpocock-skills:tdd`**, red then green then refactor, one TC at a time. Test titles carry the TC id and the suite tag, e.g. `it("[sanity] TC-TEN-07 …")`. Use `*.int.test.ts` for anything Postgres must prove.
5. **Verifies.** Run `npm run typecheck && npm run lint && npm test && npm run test:integration`. For UI slices, also use the browser preview and take a screenshot at 375 px wide.
6. **Updates the docs named in the slice**, plus the glossary or an ADR if the model changed. Then marks the slice `done`.
7. **Reviews its own diff** with `/code-review`, fixes what it finds, and commits to `main` (see [CLAUDE.md](../../CLAUDE.md#conventions)).

**When to stop and report instead of guessing:**
- the slice needs a decision the plan doesn't make;
- a test from an earlier slice breaks and the fix isn't obvious;
- the slice needs a secret, an account or DNS (that's the owner's job, see plan 00);
- the change would edit an applied migration.

In these cases, write `blocked: <reason>` on the slice, add the question to the plan's **Open questions**, and move on.

## Standing rules for every slice
- **Isolation is a regression group.** All `TC-TEN-*` cases must stay green from plan 01 onwards. A slice that adds a partner-owned table adds that table to the isolation suite in the same change.
- **Golden Tide Retreat must keep working.** It is Partner #1 and the canary. The existing tests are the guard.
- **Mobile first.** Every console screen is checked at 375 px with 44 px touch targets.
- **Metering hook.** Any new action that is a Usage meter (plan 03) records a Usage event in the same change.
- The invariants in [CLAUDE.md](../../CLAUDE.md#invariants-dont-break-these) still hold: paise, ISO dates, append-only migrations, `notify()` never throws, settings not constants, theme tokens only.
