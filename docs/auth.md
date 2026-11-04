# Sign-in (Auth.js · Google now, phone OTP next)

## Overview
- **Library:** Auth.js (NextAuth v5), configured in `src/auth.ts`. It is open source and host-agnostic, and users live in our own Postgres.
- **Sessions:** signed JWT cookies (`AUTH_SECRET`), so there is no sessions table.
- **Who signs in:**
  - **Guests (optional):** see all their bookings at `/account`, and get name and email prefilled when booking. Booking without an account still works.
  - **Staff / admin:** access `/admin` (dashboard coming). Roles come only from env allow-lists (`ADMIN_EMAILS`, `STAFF_EMAILS`) and are refreshed at each sign-in. Nobody can grant themselves a role.
- **Booking linkage:** bookings made while signed in get `bookings.user_id`. `/account` shows bookings linked to the user **or** made with their (Google-verified) email.

## Data
- `users`: email (unique, lower-case), phone (unique, E.164, for future OTP), name, image, role (`guest | staff | admin`), verification timestamps, `last_login_at`.
- `user_identities`: `(provider, provider_account_id)` → user. A person who uses Google and later phone OTP ends up on **one** account, linked by verified email or phone.
- Migration: `db/migrations/0003_users_auth.sql`.

## Code map
| File | Role |
|---|---|
| `src/auth.ts` | Auth.js config: providers, JWT/session callbacks, `googleEnabled` |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth.js HTTP handlers |
| `src/lib/server/users-repo.ts` | `upsertIdentityUser()`: find-or-create and link identities |
| `src/lib/auth/roles.ts` | Pure role resolution plus safe redirect check (unit-tested) |
| `src/lib/server/session.ts` | `getSessionUser()`, `requireUser()`, `requireStaff()` for server components |
| `src/components/site/actions.ts` | `signInWithGoogle`, `signOutAction` server actions |
| `src/app/signin`, `src/app/account`, `src/app/admin` | Pages |
| `src/lib/auth/otp.ts` | **Phone OTP extension point** (interface + policy) |

Gate a page: `const user = await requireStaff();` at the top of the server component. There's no edge middleware, because the DB driver runs on Node only and this keeps it portable.

## TODO: Set up Google sign-in
> **Status: not started.** Until this is done, `/signin` shows "Google sign-in isn't set up yet" and everything else works.

- [ ] 1. Go to https://console.cloud.google.com → create (or pick) a project, e.g. "Golden Tide Retreat".
- [ ] 2. **APIs & Services → OAuth consent screen**: User type **External**. App name, support email, logo (optional), app domain `https://golden-tide-retreat.vercel.app`. Scopes: `openid`, `email`, `profile` (the defaults, so no Google verification review is needed). **Publish** the app ("In production"), or only test users can sign in.
- [ ] 3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → Application type **Web application**.
  - Authorised JavaScript origins: `https://golden-tide-retreat.vercel.app` and `http://localhost:3000`
  - Authorised redirect URIs: `https://golden-tide-retreat.vercel.app/api/auth/callback/google` and `http://localhost:3000/api/auth/callback/google`
- [ ] 4. Copy the **Client ID** and **Client secret** into `.env.production.local` (and `.env.local` for development):
  ```
  AUTH_GOOGLE_ID=xxxxxxxx.apps.googleusercontent.com
  AUTH_GOOGLE_SECRET=GOCSPX-xxxxxxxx
  ```
- [ ] 5. Add them to Vercel, along with `AUTH_SECRET` and the allow-lists:
  ```bash
  npx vercel env add AUTH_GOOGLE_ID production
  npx vercel env add AUTH_GOOGLE_SECRET production
  openssl rand -base64 32 | tr -d '\n' | npx vercel env add AUTH_SECRET production   # if not already set
  printf 'you@gmail.com' | npx vercel env add ADMIN_EMAILS production
  npx vercel --prod
  ```
- [ ] 6. Test: open `/signin` → Continue with Google → you land on `/account`. With your email in `ADMIN_EMAILS`, the header menu shows **Admin**.
- [ ] 7. When you add a custom domain, add its origin and callback URL to the OAuth client (step 3).

## Phone OTP (India), planned
Indian guests often prefer a mobile number to a Google account. The schema (`users.phone`, `user_identities` with `provider = 'phone'`) and the interface (`src/lib/auth/otp.ts`) are already in place.

**Implementation plan**
1. **Provider:** implement `OtpProvider` for **MSG91 OTP** (DLT-registered template, sender ID; the `send`/`verify` APIs handle code generation and expiry) or **Twilio Verify**. Register it by env (`OTP_PROVIDER=msg91`).
2. **Request endpoint** `POST /api/auth/otp/request { phone }`:
   - `normalizePhone()` (in `lib/booking/rules.ts`) → E.164
   - rate limits from `OTP_POLICY` (per phone and per IP) → `provider.send()`
   - always respond 200, so the endpoint never reveals whether an account exists
3. **Auth.js Credentials provider** `phone-otp` in `src/auth.ts`:
   - `authorize({ phone, code })` → `provider.verify()`
   - then `upsertIdentityUser({ provider: "phone", providerAccountId: phone, email: null, emailVerified: false })`
   - and set `users.phone` / `phone_verified_at`
   - credentials providers need the JWT strategy, which is already in use
4. **UI:** replace the "Coming soon" button on `/signin` with phone input → 6-digit code input (auto-advance, resend after 30s).
5. **Account linking:** if a signed-in Google user verifies a phone, attach the identity to the current user instead of creating a new one.
6. **Bookings:** also show bookings where `guest_phone` equals the verified phone (extend `listBookingsForUser`).
7. **Compliance:** DLT registration of the OTP template (with MSG91). Store no OTP codes in plain text: hash them if self-managed.
