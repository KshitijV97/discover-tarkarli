# Handoff: current state

Last updated: 2026-11-24, after finishing P2. Update this file whenever the state changes.

## Repository
- **Branch in use:** `main` (direct-to-main fast mode). P0, P1 and P2 are pushed there. Next: P3 (refunds and GST invoice), or tenancy first per [../vision.md](../vision.md) (owner decision).
- **Open PR:** #2 (`docs/guest-convenience-and-produce-shop`): planning docs for web check-in, guest ID, produce shop and conveniences. Waiting for the owner to merge.
- **Owner status page:** `docs/status/status.html`, published as a private artifact. Republish it when the state changes.

## Deployment
- **Process:** direct to `main` (owner's fast mode, see [../workflows/vibe-coding.md](../workflows/vibe-coding.md)). Every push deploys production. The old release process is in [../release-process.md](../release-process.md) for reference.
- **Production (Vercel):** the latest *production* deploy does **not** include the admin dashboard, branding or licence. The `vercel --prod` attempt was blocked by a permission check. It needs the owner's approval, or a deploy from `main` after merging.
- **Preview:** a preview build of the feature branch was started by the push. Its result was not checked.
- **Region mismatch to resolve:** `vercel.json` sets `regions: ["hnd1"]` (Tokyo), `docs/deployment.md` says Montreal `yul1`, and commit `2a23ba4` says "pin Vercel region to Mumbai". Decide the intended region (Mumbai `bom1` is the goal in `docs/region-migration.md`) and make the three agree.

## Built and verified
- Typecheck, lint and 38 unit tests pass on `main`. `scripts/smoke.mjs` passed 5/5 against production on 2026-11-13.
- `/food` and the home page render in the local browser (checked against the local database).
- **Not verified:** the admin pages in a browser (need Google sign-in and a staff email); `npm run build` on the feature branch; the production behaviour of the settings editor.

## Waiting on the owner
In rough priority order:
1. **Merge PR #2** (planning docs for check-in, guest ID, produce shop). The admin dashboard is already on `main` and in production.
2. **Dog policy** (number of dogs, extra charges, rules): the copy in `src/content/site.ts` (`pets`) promises only dogs welcome in every room, walks, and advance setup.
3. **Dish list and prices**: confirm the dishes in `site.localFood.dishes` are made in the kitchen, and whether to add them to `menu_items` with prices.
4. **Solkadhi**: confirm it is served with meals or on request, so the "signature" wording holds.
5. **Razorpay**: account, KYC, test keys, webhook, live keys (`docs/razorpay-onboarding.md`).
6. **Google sign-in**: OAuth client and env vars (`docs/auth.md`). Without it, `/admin` cannot be used.
7. **Real photography**: replace Unsplash placeholders. The owner's private photos are in `photos/` (gitignored). Decide where to host them publicly.
8. **Policy pages**: terms, cancellation and refund, privacy, contact. Needed for Razorpay activation.
9. **Region move** to Mumbai (see above).

## Known issues and gaps
- Admin: photo upload is not built (`docs/admin.md`). Admin pages were checked in a local browser with a throwaway database and a localhost-only test session; not yet in production (needs Google sign-in).
- No E2E tests yet (P9). Unit, integration (20, real Postgres), pre-push hook and CI exist.
- Activity, multi-tenant and billing work is planned only.
- The `CLAUDE.md` status line is partly out of date; this file is the current source.

## How to resume in another tool (Codex, OpenCode, Z.ai GLM, others)
1. **Clone or open the repo** and check out the branch: `git fetch && git checkout feat/admin-dashboard-and-planning-docs`.
2. **Tell the tool to read** `AGENTS.md`, then `docs/context/README.md`. Most tools read `AGENTS.md` automatically. Tools that read other files (for example `CLAUDE.md` or `GEMINI.md`) should be pointed at `AGENTS.md`.
3. **Copy secrets securely** from the owner's password manager into `.env.local` (and `.env.production.local` if needed). Never paste them into a prompt.
4. **Install and check**: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`. If these pass, the environment is good.
5. **Local database** (optional): `npm run db:up && npm run db:migrate && npm run db:seed`.
6. **Start the app** with `npm run dev` and open http://localhost:3000.
7. **Pick the next task** from the "Waiting on the owner" list (ask the owner first where it needs their input), or from [../roadmap.md](../roadmap.md).
8. **Before finishing**: update `history.md` and this file, run the checks, commit on a feature branch, and report what is verified and what is not.

## Things a new tool should not do without asking
- Deploy to production, push to `main`, or send messages to guests or staff.
- Change live settings, prices or the dog policy copy.
- Commit anything under `photos/` or any env file.
