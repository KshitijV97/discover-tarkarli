# Roadmap

## ✅ Done
- Project scaffold, schema, migrations, seed, theme system
- Room booking: calendar with sold-out nights, live availability, multi-room, occupancy, DB-level no-double-booking
- Meals: breakfast included, lunch/dinner headcounts, per-meal cutoff, price snapshots, guest meal editing
- GST-exclusive pricing, configurable deposit
- Notification framework: WhatsApp Cloud API, Telegram, SMS (MSG91/Twilio); outbox, dedupe, retries; daily balance reminders + kitchen summary
- Razorpay deposit payments: orders, checkout, signature verification, webhook, holds, late-payment handling
- Redesigned animated site (hero carousel, room carousels, bento, marquees, parallax, reveal-on-scroll)
- Optional guest accounts + staff roles via Auth.js (Google); `/account` booking history; staff-gated `/admin`

## 📝 TODO (owner)
- **Razorpay onboarding**: create an account, test keys, webhook, KYC, live keys. Step-by-step: [razorpay-onboarding.md](razorpay-onboarding.md). Until then bookings confirm without online payment.
- **Move hosting to India**: Vercel Montreal → Mumbai (`bom1`), Supabase Tokyo → Mumbai (`ap-south-1`). Easiest before go-live. Steps: [region-migration.md](region-migration.md).
- **Google sign-in setup**: create the OAuth client in Google Cloud and set env vars. Steps: [auth.md](auth.md#todo-set-up-google-sign-in).
- **Real photography**: replace the Unsplash placeholders in `src/content/site.ts` and `rooms.photos`.
- **Policy pages** (terms, cancellation/refund, privacy, contact), required for Razorpay activation.

## ⏭ Next
- **Room types + channel sync (Airbnb, MakeMyTrip, Booking.com…)**: owner is defining room types first; plan in [channel-sync.md](channel-sync.md).
0. **Phone OTP sign-in (India)**: MSG91/Twilio Verify behind `OtpProvider`; plan in [auth.md](auth.md#phone-otp-india-planned).
1. **Admin dashboard** (gate with `requireStaff()`)
   - Bookings list filterable by date; meal selections; payment status
   - Edit rooms/dates/meals (cutoff bypass), cancel, check-in/out
   - Record balance payments (`payments` with `provider='manual'`), mark fully paid → `booking.fully_paid`
   - Manage rooms (photos via `lib/server/storage.ts`) and menu items
   - Settings page (deposit, meals, tax, booking, property, notifications, theme)
   - Notification log + resend
2. **GST invoice PDF** — template-based, behind an `InvoiceProvider` interface (Frappe Books later). Invoice numbering series, GSTIN, SAC codes (996311 rooms, 996331 food).
3. **À la carte ordering** — menu, in-stay orders tied to booking/room, editable until `in_preparation`, kitchen notifications.
4. **Refunds** — Razorpay refund API for cancellations/conflicts.

## Later / ideas
- Seasonal & weekend rates, extra-guest charges, child policy
- Promo codes
- Email channel
- Channel manager / OTA sync (iCal export per room)
- Reviews & guest feedback after checkout
