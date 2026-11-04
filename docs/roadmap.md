# Roadmap

## ✅ Done
- Project scaffold, schema, migrations, seed, theme system
- Room booking: calendar with sold-out nights, live availability, multi-room, occupancy, DB-level no-double-booking
- Meals: breakfast included, lunch/dinner headcounts, per-meal cutoff, price snapshots, guest meal editing
- GST-exclusive pricing, configurable deposit
- Notification framework: WhatsApp Cloud API, Telegram, SMS (MSG91/Twilio); outbox, dedupe, retries; daily balance reminders + kitchen summary
- Razorpay deposit payments: orders, checkout, signature verification, webhook, holds, late-payment handling

## 📝 TODO (owner)
- **Razorpay onboarding**: create an account, test keys, webhook, KYC, live keys. Step-by-step: [razorpay-onboarding.md](razorpay-onboarding.md). Until then bookings confirm without online payment.
- **Move hosting to India**: Vercel Montreal → Mumbai (`bom1`), Supabase Tokyo → Mumbai (`ap-south-1`). Easiest before go-live. Steps: [region-migration.md](region-migration.md).
- **Policy pages** (terms, cancellation/refund, privacy, contact), required for Razorpay activation.

## ⏭ Next
1. **Admin dashboard** (Supabase Auth behind `lib/server/auth.ts`)
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
