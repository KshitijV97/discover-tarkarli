# Deployment

Today: **Vercel** (Next.js app) + **Supabase** (Postgres). Both free tier.

## 1. Supabase (database)
1. Create a project at supabase.com — region **Mumbai (ap-south-1)** for Indian guests. Save the DB password.
2. **Connect → Connection string → Transaction pooler** (port `6543`). This is `DATABASE_URL` for Vercel.
   For running migrations from your laptop either URI works; the session pooler / direct URI is fine too.
3. Apply schema + seed from your machine:
   ```bash
   DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres" npm run db:migrate
   DATABASE_URL="…same…" npm run db:seed
   ```
4. Nothing else in Supabase is used yet (no supabase-js, no RLS policies, no edge functions). RLS is enabled on all tables so the public anon key can't read data.

## 2. Vercel (app)
```bash
npx vercel link            # create/link project
npx vercel env add DATABASE_URL production        # transaction pooler URI
npx vercel env add DATABASE_POOL_MAX production   # 1
npx vercel env add NEXT_PUBLIC_SITE_URL production
npx vercel env add CRON_SECRET production         # long random string
# optional: RAZORPAY_*, WHATSAPP_*, TELEGRAM_BOT_TOKEN, SMS_*
npx vercel --prod
```
Or connect the GitHub repo in the Vercel dashboard for automatic deploys on push (preview deployments for branches).

- **Cron**: `vercel.json` schedules `/api/cron/daily` once a day (Hobby plan allows daily crons). Vercel sends `Authorization: Bearer $CRON_SECRET`.
- **Region**: set the Vercel function region to `bom1` (Mumbai) in Project → Settings → Functions to sit next to the database.
- After the first deploy, set `NEXT_PUBLIC_SITE_URL` to the real URL and redeploy.

## 3. After deploy
- Razorpay webhook → `https://<domain>/api/webhooks/razorpay` (see [payments.md](payments.md)).
- Fill `settings.property` (phone, address, GSTIN) and notification recipients.
- Smoke test: make a booking, check `notifications` table.

## Migrating to another host
| Component | Replace with | Change |
|---|---|---|
| Supabase Postgres | Neon, RDS, Cloud SQL, any VPS Postgres 13+ | `pg_dump`/`pg_restore`, then change `DATABASE_URL` |
| Vercel | Any Node 18+ host (Render, Railway, Fly, Docker, VPS) | `npm run build && npm start`; schedule `GET /api/cron/daily` with the Bearer secret (crontab, GitHub Actions…) |
| Supabase Auth (upcoming admin) | Any auth | swap `lib/server/auth.ts` |
| Supabase Storage (upcoming photos) | S3 / R2 / local | swap `lib/server/storage.ts`; photos are plain URLs in `rooms.photos` |

No code uses Vercel-specific APIs.
