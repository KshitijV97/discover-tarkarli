# Move hosting to India (TODO)

> **Status: not started.**
> Today the app runs on Vercel in **Montreal (`yul1`)** and the database is on Supabase in **Tokyo (`ap-northeast-1`)**. Guests and staff are in India, so both should move to **Mumbai**: Vercel `bom1` and Supabase `ap-south-1`. The app and database must end up in the **same region**, because every page makes several database round trips.

## Checklist
- [ ] 1. Decide which path applies: **A** (before launch, no real bookings) or **B** (after launch, real data)
- [ ] 2. Create the new Supabase project in Mumbai
- [ ] 3. Set up the schema (and copy data, path B)
- [ ] 4. Point Vercel at the new database and switch the function region to Mumbai
- [ ] 5. Deploy and verify
- [ ] 6. Retire the Tokyo project

> **Tip:** do this **before go-live** (path A). It takes about 15 minutes and needs no data copy.

---

## Prerequisites
- **A network that allows Postgres ports.** The home/office Wi-Fi blocks ports 5432 and 6543, so use a phone hotspot for any command that connects to the database. Vercel and GitHub steps work on any network.
- Vercel CLI logged in (`npx vercel whoami`).
- Path B only: `pg_dump`/`psql` matching the server's major version. Check it in Supabase → Settings → Infrastructure, then e.g. `brew install postgresql@17` and use `/opt/homebrew/opt/postgresql@17/bin/pg_dump`.

## 1. Create the Mumbai Supabase project
Supabase can't change an existing project's region, so you create a new project.
1. supabase.com → **New project** → Region **South Asia (Mumbai) — ap-south-1**. Save the database password.
2. **Connect** → copy two strings and replace `[YOUR-PASSWORD]` in each:
   - **Transaction pooler** (port `6543`): for the app and migrations.
   - **Session pooler** (port `5432` on the `pooler.supabase.com` host): for `pg_dump` (path B).
3. Put them in a new git-ignored file `.env.mumbai.local`:
   ```
   DATABASE_URL=<transaction pooler URI>
   SESSION_URL=<session pooler URI>
   ```

## 2A. Before launch: fresh schema + seed (no data copy)
On the hotspot:
```bash
node --env-file=.env.mumbai.local scripts/migrate.mjs
node --env-file=.env.mumbai.local scripts/seed.mjs
```
Re-apply any settings you changed in the old database (property details, notification recipients, prices). Then go to step 3.

## 2B. After launch: copy the data
1. **Pick a quiet window.** Bookings made during the copy would be lost. Tell staff not to take bookings for about 15 minutes.
2. Create the schema on the new database (hotspot):
   ```bash
   node --env-file=.env.mumbai.local scripts/migrate.mjs
   ```
3. Dump **data only** from Tokyo. Use the old project's **session pooler** URI, because `pg_dump` doesn't work through the transaction pooler:
   ```bash
   pg_dump "<TOKYO session pooler URI>" \
     --data-only --schema=public --exclude-table=schema_migrations \
     --disable-triggers --no-owner --no-privileges -f gtr-data.sql
   ```
4. Restore into Mumbai. `--disable-triggers` keeps the `booking_rooms` triggers from rewriting rows during the load. This needs the `postgres` role, which the Supabase session pooler user has.
   ```bash
   psql "$(grep ^SESSION_URL .env.mumbai.local | cut -d= -f2-)" -v ON_ERROR_STOP=1 -f gtr-data.sql
   ```
5. Verify row counts match, running this on **both** databases:
   ```sql
   select 'rooms', count(*) from rooms union all
   select 'bookings', count(*) from bookings union all
   select 'booking_rooms', count(*) from booking_rooms union all
   select 'booking_meals', count(*) from booking_meals union all
   select 'payments', count(*) from payments union all
   select 'notifications', count(*) from notifications union all
   select 'settings', count(*) from settings;
   ```
6. Delete `gtr-data.sql`: it contains guest personal data.

## 3. Point Vercel at Mumbai
1. Replace the database URL. The stdin pipe avoids printing the secret:
   ```bash
   npx vercel env rm DATABASE_URL production --yes
   grep ^DATABASE_URL .env.mumbai.local | cut -d= -f2- | tr -d '\n' | npx vercel env add DATABASE_URL production
   ```
2. Switch the function region:
   - In the repo: `vercel.json` → `"regions": ["bom1"]`, then commit.
   - In the dashboard: Vercel → Project → **Settings → Functions → Function Region → Mumbai, India (bom1)**. The dashboard setting is what actually applied: the `hnd1` value in `vercel.json` was ignored and functions ran in `yul1`, so set both.
3. Update `.env.production.local` to the Mumbai URL, so local scripts target the new database.

## 4. Deploy and verify
```bash
npx vercel --prod          # or push to main if the GitHub integration is connected
```
- The build log should show `▶ Applying database migrations` → `migrations up to date`.
- Function region: `npx vercel logs --deployment golden-tide-retreat.vercel.app` → each entry should show `"region":"bom1"`.
- Speed: `curl -s -o /dev/null -w "%{time_total}\n" https://golden-tide-retreat.vercel.app/book` should be well under the current ~0.3–0.6s.
- Smoke test: open `/book`, check availability, open an existing booking's manage link (path B).
- If Razorpay is live: webhooks keep working, because the site URL hasn't changed.

## 5. Retire Tokyo
1. Keep the Tokyo project **paused** (Supabase → Settings → General → Pause project) for about a week as a fallback.
2. Then delete it. Delete `.env.mumbai.local` after merging its values into `.env.production.local`.
3. Update [deployment.md](deployment.md) and this file's status to **done**.

## Rollback
Put the old `DATABASE_URL` back in Vercel and redeploy. Path B: any bookings made in Mumbai after the switch must be re-entered manually in Tokyo, so decide quickly.
