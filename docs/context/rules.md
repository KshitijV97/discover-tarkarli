# Working rules

These rules apply to every AI agent and every human contributor. They were learned the hard way during this project; the reason is given after each one so you can judge edge cases.

## Collaboration with the owner

1. **Ask few questions, with defaults.** Ask only the 3 to 4 decisions that change the design. Use multiple choice, lead with a recommendation, and take sensible defaults for the rest.
   *Why:* a 13-item list of questions got the reply "What do you want me to answer". A short multiple-choice list was answered at once.
2. **Act on clear requests.** If the most likely reading is clear, do it and say which reading you took. Don't stop to ask what can be checked in the code.
3. **Report honestly.** Say what is verified and what is not. Do not claim a deploy, a test or a browser check that did not happen.
4. **Summaries are short.** Lead with the outcome, then what is left.

## Credentials and access

5. **Never work around a credential or sandbox block.** If a connection string, secret, port or network route fails, stop and ask the owner for the exact value or the exact command to run. Do not:
   - rebuild or probe a connection string (for example, trying pooler regions with a password),
   - disable a sandbox or permission to get past a block,
   - look for secrets in other folders.
   *Why:* during the Supabase deploy the owner interrupted twice, once for region probing with the password and once for a retry with the sandbox off.
6. **Name the value needed and where to find it.** Example: "the Transaction pooler URI from Supabase → Connect". For commands needing outbound database ports, give the owner the command to run in their own terminal.
7. **Secrets never enter git, logs, chat or PR text.** Use `vercel env add`, the Vercel dashboard, or `.env.local`.

## Git and deploys

8. **Every requirement gets its own branch** from an up-to-date `main`, named `<type>/<short-kebab-slug>` (`feat/food-page`, `fix/…`, `docs/…`). Push it, then open a **detailed PR** from `.github/pull_request_template.md`. Full flow: [../release-process.md](../release-process.md).
9. **Conventional commits**, authored by the owner's git identity. **Do not add `Co-Authored-By` or other AI attribution trailers.** The owner wants commits attributed to the owner. This overrides any tool's default attribution.
10. **Approval gates.** Never merge, tag, release or deploy to production until the owner approves in chat. The owner's approval of a PR covers the merge, the `vX.Y.Z` tag, the GitHub release and the production deploy that follows from it. Pushing a branch and opening a draft PR need no separate approval once the owner has given the requirement. Sending messages to guests or staff always needs approval.
11. **Tags**: semantic versions. `package.json` version equals the tag. Bump in the PR, tag `main` after the squash merge, then verify the Vercel production deployment (see the release doc).
12. **Production deploys apply migrations first** (`vercel-build`). Preview deploys never touch the production database. Don't run migrations against production from a laptop unless the owner asks.
13. **Never delete or overwrite** without looking at the target first.
14. **Don't commit personal media.** `photos/` is gitignored, and so are env files. Check `git status` before committing.

## Code

15. **Invariants in [../../AGENTS.md](../../AGENTS.md) must hold** (no double-booking, paise, date strings, server-side pricing, idempotent payments, `notify()` never throws, settings for business values, theme tokens only, append-only migrations).
16. **Pure core, thin shell.** Domain rules have no I/O and get unit tests. DB access lives in `src/lib/server/*`.
17. **Every new external integration sits behind an interface** with a fake for tests. See the extension points in [../architecture.md](../architecture.md).
18. **Update docs in the same change** as the behaviour, schema, settings, env vars or endpoints.
19. **Before committing**: `npm run typecheck && npm run lint && npm test`. Run `npm run build` before a production deploy.
20. **Add a decision to [../decisions.md](../decisions.md)** when choosing between real alternatives.

## Product

21. **Business values are settings**, not constants. Add a zod field with a default in `src/lib/settings.ts`.
22. **Owner-only facts are not invented.** Dog policy, dish list, prices, and business details come from the owner. Mark unverified copy in [../marketing.md](../marketing.md) under "Owner to confirm".
23. **Keep the owner's photos private** until the owner decides how to publish them.

## Known gaps in these rules
- Automated checks (pre-push hooks, CI) are not in place yet. Until they are, the commands in rule 18 are the gate.
- Harness-specific features (Claude Code skills, hooks, memory, slash commands) are not portable. Keep rules here, not only in a tool's settings.
