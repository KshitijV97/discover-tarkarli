# Golden Tide Retreat — Booking System

Room booking, meal planning, deposits and guest/staff messaging for a 6-room beachfront homestay.

Next.js 14 · TypeScript · Tailwind · PostgreSQL · Razorpay · WhatsApp / Telegram / SMS

## Quick start
```bash
cp .env.example .env.local
npm install
npm run db:up && npm run db:migrate && npm run db:seed
npm run dev        # http://localhost:3000
npm test
```

## Features
- **Booking**: calendar with sold-out nights, live per-room availability, multi-room bookings. Double-booking is impossible because the database enforces it.
- **Meals**: breakfast included every morning, lunch and dinner booked as headcounts. Guests can edit meals until a configurable cutoff.
- **Payments**: Razorpay deposits with room holds and signature-verified callbacks and webhooks. The balance is paid at the property.
- **Design**: animated, mobile-first site with hero and room carousels, scroll reveals, a spotlight bento grid, marquees and parallax. It respects reduced-motion.
- **Accounts**: optional Google sign-in (Auth.js) for guests and staff, with phone OTP planned.
- **Notifications**: one event system that sends over WhatsApp Cloud API, Telegram or SMS (MSG91/Twilio). Routing, recipients and templates are configurable.
- **Configurable**: deposit, meal prices, cutoff, GST and the theme are runtime settings. Design tokens are CSS variables.
- **Portable**: plain Postgres + Node. Supabase and Vercel are the hosts, not dependencies.

## Documentation
Everything is in **[docs/](docs/README.md)**: architecture, booking rules, data model, payments, notifications, configuration, API, deployment, development, decision log and roadmap.
