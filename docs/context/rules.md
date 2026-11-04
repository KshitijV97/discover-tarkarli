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

8. **Work directly on `main`.** Commit and push to `main`; no feature branches and no pull requests (owner's fast mode, see [../workflows/vibe-coding.md](../workflows/vibe-coding.md)).
9. **Plain-English commit messages**, short, describing what changed (for example "Add login button"). No prefixes or tags required. Commits are authored by the owner's git identity. **No `Co-Authored-By` or other AI attribution trailers.**
10. **Push deploys.** Vercel deploys `main` automatically on every push, so a push goes to production. Still avoid breaking production: check the change before pushing.
11. **No tags or versions** are needed. `package.json` version is not maintained per release.
12. **Production deploys apply migrations first** (`vercel-build`). Preview deploys never touch the production database. Don't run migrations against production from a laptop unless the owner asks.
13. **Never delete or overwrite** without looking at the target first.
14. **Don't commit personal media.** `photos/` is gitignored, and so are env files. Check `git status` before committing.

## Code

15. **Invariants in [../../AGENTS.md](../../AGENTS.md) must hold** (no double-booking, paise, date strings, server-side pricing, idempotent payments, `notify()` never throws, settings for business values, theme tokens only, append-only migrations).
16. **Pure core, thin shell.** Domain rules have no I/O and get unit tests. DB access lives in `src/lib/server/*`.
17. **Every new external integration sits behind an interface** with a fake for tests. See the extension points in [../architecture.md](../architecture.md).
18. **Update docs in the same change** as the behaviour, schema, settings, env vars or endpoints.
19. **Before committing**: `npm run typecheck` and fix blatant syntax or type errors. Run `npm run lint`, `npm test` and `npm run build` when the change touches logic, config or build output.
20. **Add a decision to [../decisions.md](../decisions.md)** when choosing between real alternatives.

## Product

21. **Business values are settings**, not constants. Add a zod field with a default in `src/lib/settings.ts`.
22. **Owner-only facts are not invented.** Dog policy, dish list, prices, and business details come from the owner. Mark unverified copy in [../marketing.md](../marketing.md) under "Owner to confirm".
23. **Keep the owner's photos private** until the owner decides how to publish them.

## Known gaps in these rules
- Automated checks (pre-push hooks, CI) are not in place. Under the fast mode the gate is the typecheck in rule 19.
- Harness-specific features (Claude Code skills, hooks, memory, slash commands) are not portable. Keep rules here, not only in a tool's settings.
