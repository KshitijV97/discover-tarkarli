## Requirement
<!-- The request in the owner's words, and the requirement it serves (link to docs/context/requirements.md section, or the TODO doc). -->

## What changed
<!-- Plain summary, file or area by area. -->

## Why
<!-- The decision behind it, and any alternative rejected. Link docs/decisions.md entry if one was added. -->

## Checks run
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build` (required when app code or config changed)
- [ ] Browser or manual check (describe below, or say "not run")

## Database and config impact
- [ ] No migration
- [ ] New migration `db/migrations/NNNN_*.sql`: forward-only, reviewed for lock time and data loss. Production applies it during the deploy.
- [ ] New or changed env vars (listed in docs/configuration.md)
- [ ] New or changed settings keys (defaults in `src/lib/settings.ts`)

## Risk and rollback
<!-- What could break, who is affected, and how to roll back. Schema changes are not rolled back automatically. -->

## Docs updated
- [ ] Relevant file in `docs/` updated in this PR
- [ ] `docs/context/history.md` and `handoff.md` updated if the state changed

## Release
- Version bump in this PR: <!-- none / patch / minor / major -->
- Proposed tag after merge: <!-- vX.Y.Z -->

## Open items for the owner
<!-- Decisions, copy or policy the owner must confirm before or after release. -->
