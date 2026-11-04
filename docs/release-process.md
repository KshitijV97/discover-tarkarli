# Release process

How a requirement becomes a merged change, a version tag and a production deploy. It applies to every change, from the owner's request to the live site.

> **Who approves:** the owner (Kshitij Vengurlekar). Nothing is merged, tagged or deployed to production until the owner approves in chat. The rules below are the process. GitHub does not enforce them (see [Limits](#limits)).

## The flow at a glance
```
owner request
  → branch  feat/<slug> from main
  → commits (owner's git identity; conventional messages)
  → checks: typecheck, lint, test, build
  → push branch → Vercel creates a PREVIEW deployment automatically
  → open PR (detailed, from .github/pull_request_template.md)
  → owner reviews and says "approved"
  → merge to main (squash, PR title as the commit message)
  → tag vX.Y.Z on main + GitHub release with notes
  → Vercel creates the PRODUCTION deployment from main automatically
  → verify the production deployment and report
```

## 1. Branch
- One requirement per branch, created from an up-to-date `main`.
- Name: `<type>/<short-kebab-slug>`, where type is `feat`, `fix`, `docs`, `chore` or `refactor`. Examples: `feat/food-page`, `fix/booking-cutoff-timezone`, `docs/release-process`.
- Several requirements that already share a branch are split before a PR is opened.

## 2. Commits
- Conventional messages: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `build:`, `test:`.
- Commits are authored by the owner's git identity (`Kshitij Vengurlekar <writetokshitij@gmail.com>`), so GitHub and Vercel attribute them to the owner.
- **No AI co-author trailers** (no `Co-Authored-By:` lines). This is the owner's rule.

## 3. Checks before the PR
Run from the repo root. All must pass:
```bash
npm run typecheck && npm run lint && npm test && npm run build
```
`npm run build` is required when app code, config or migrations change. Run a browser check for anything visible, and say in the PR if it was not run.

## 4. Push and preview
```bash
git push -u origin <branch>
```
Vercel builds a **preview** for every pushed branch (it does not touch the production database). Its URL appears in the PR.

## 5. Pull request
- Open the PR with `gh pr create --base main --head <branch>` and the template filled in. The PR is **detailed**: requirement, what changed, why, checks, database impact, risk and rollback, docs updated, release proposal, open owner items.
- Title: conventional, under 70 characters, becomes the squash commit message.
- Open as a **draft** while work continues. Mark ready when the owner should review.
- Do not merge it yourself, even if checks are green.

## 6. Owner approval and merge
- The owner reviews the PR and replies in chat with approval (for example "approved" or "merge it").
- Then merge with squash: `gh pr merge <number> --squash --delete-branch`. Confirm the merge commit on `main` and that the working tree is clean.
- A review comment is not approval until the owner says so. Ask if unsure.

## 7. Versioning and tag
Semantic versioning, `vMAJOR.MINOR.PATCH`. The version in `package.json` must equal the tag.

| Change | Bump |
|---|---|
| New feature, new page, new setting, new migration | MINOR |
| Fix, copy, styling, docs only | PATCH |
| Breaking change for guests, staff or data | MAJOR (none so far; pre-1.0 we still use MINOR for big features) |

The version bump is part of the PR (so the merged `main` already has it). After merge:
```bash
git checkout main && git pull --ff-only
git tag -a vX.Y.Z -m "vX.Y.Z: <short summary>"
git push origin vX.Y.Z
gh release create vX.Y.Z --title "vX.Y.Z" --notes-from-tag   # or --notes "<release notes>"
```
Release notes list the PR title, the requirement and any owner-facing changes.

## 8. Production deploy
- Vercel's Git integration deploys **production from `main`** when the merge lands. Nothing is deployed by hand.
- Production builds run `scripts/vercel-build.mjs`, which applies pending migrations **before** `next build`. A migration in the PR therefore goes live with the merge.
- Verify after the merge: `npx vercel ls golden-tide-retreat` should show a new **Production** deployment that is `Ready`, built from the merge commit. Check the site loads and the changed page works.
- If a deployment shows **Blocked** with "the commit author doesn't have permission", the commit's author email is not allowed to deploy this Vercel project. Fix the Vercel team membership or the author email; do not work around it.
- Fallback only, with the owner's approval in chat: `npx vercel --prod` from `main` (`npm run build` must pass first).

## 9. Rollback
- **Code:** in the Vercel dashboard, promote the previous production deployment, or revert the merge commit with a new PR.
- **Database:** migrations are forward-only. A rollback needs a new migration that undoes the change, written and approved through the same PR process. Review destructive migrations before approval.

## Limits
- The repository is **private** on a free GitHub plan. **Branch protection and required reviews are not available** (the API returns 403). Approval is enforced by this process, not by GitHub. Enabling protection needs GitHub Pro (or a public repo, which the owner has not chosen).
- Vercel's Git integration must stay connected to `KshitijV97/golden-tide-retreat`. Production deployments are blocked if the commit author is not allowed to deploy.
- The tag and release commands need `gh` logged in as the owner's account, which is the case on this machine.

## History note
Commits made before this process have AI co-author trailers. Those were not rewritten, because rewriting pushed history is not reversible for others. New commits follow rule 2.
