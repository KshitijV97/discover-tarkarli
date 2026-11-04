# Roadmap

## ✅ Done
- Project scaffold, schema, migrations, seed, theme system
- Room booking: calendar with sold-out nights, live availability, multi-room, occupancy, DB-level no-double-booking
- Meals: breakfast included, lunch/dinner headcounts, per-meal cutoff, price snapshots, guest meal editing
- GST-exclusive pricing, configurable deposit
- Notification framework: WhatsApp Cloud API, Telegram, SMS (MSG91/Twilio); outbox, dedupe, retries; daily balance reminders + kitchen summary
- Razorpay deposit payments: orders, checkout, signature verification, webhook, holds, late-payment handling

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
