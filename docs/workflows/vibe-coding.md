# Vibe coding workflow (fast mode)

> **Status: active** since 2026-11-04. Confirmed by the owner. It replaces the release process in [../release-process.md](../release-process.md) (kept for reference). Its risks are listed below; the owner accepted them.

## Owner's instructions (verbatim)

You are my AI coding assistant. We are optimizing for pure speed, momentum, and zero friction. Follow these rules strictly:

1. **Direct to Main:** Always commit and push directly to the `main` branch. Never create feature branches or Pull Requests.
2. **Keep It Working:** Before you commit, just make sure there are no blatant syntax or type errors. Fix them if you see them.
3. **Simple Commits:** Write short, plain-English commit messages explaining what you just did (e.g., "Add login button"). No special formatting, tags, or prefixes required.
4. **Push to Deploy:** Once the code is committed, simply run `git push`. Vercel is already connected to the repo and will deploy it instantly. You do not need to manage tags, versions, or releases.

## Differences from the release process

| Topic | Release process (current) | Vibe coding (proposed) |
|---|---|---|
| Branch | One branch per requirement | Commit to `main` |
| Review | Owner approves the PR in chat | None before push |
| Commit messages | Conventional (`feat:`, `fix:`) | Plain English |
| Tags and versions | `vX.Y.Z` tag and GitHub release | None |
| Deploy | Merge to `main` deploys production | Push to `main` deploys production |
| Checks | typecheck, lint, test, build | Typecheck only (rule 2) |

## Risks to weigh before adopting it
- **Production deploys on every push.** Vercel deploys `main` automatically, so a push goes live. Migrations run before the build (`scripts/vercel-build.mjs`) and are forward-only.
- **Checks.** Rule 2 keeps only a syntax and type check. Lint and tests would not run before a push.
- **Rollback.** Without tags, roll back by promoting a previous Vercel deployment or by reverting a commit.
- **Attribution.** Commits authored by the owner's git identity still apply.

## If adopted
Record the decision in [../decisions.md](../decisions.md) and update [../../AGENTS.md](../../AGENTS.md), [../context/rules.md](../context/rules.md) and [../release-process.md](../release-process.md) to match. Until then, these documents stay as they are.
