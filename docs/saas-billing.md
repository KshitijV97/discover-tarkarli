# Future: SaaS billing and cost control (TODO)

> **Status: planned, not started.** Goal: bill tenants for everything the platform does, keep the platform's own running cost as low as possible, and make every cost visible per tenant.

## Business model (proposed, to confirm)
A tenant pays for:
1. **Base subscription**, monthly or yearly, per plan (for example Starter, Growth, Pro). Plans are data in the database, not code.
2. **Usage**, metered per tenant and billed in arrears:
   - bookings created (or confirmed stays)
   - messages sent per channel (WhatsApp, SMS, Telegram). Pass through the provider's cost plus a margin.
   - payment transactions (Razorpay fees are usually paid by the tenant's own merchant account, so this is a platform fee only if the platform collects).
   - storage for photos, if above a free allowance
3. **Add-on features**, enabled per tenant: activities marketplace, à la carte ordering, channel sync, invoices (see [future-services.md](future-services.md) and [multi-tenancy.md](multi-tenancy.md)).
4. **Marketplace commission** on activities sold through the platform.

Keep plans simple: a small number of plans with clear limits, and a published price for each usage meter.

## Design

### Metering
- An append-only `usage_events` table: `(tenant_id, meter, quantity, occurred_at, source_id, dedupe_key)`. Write an event from the same place the action happens (for example, when a booking is confirmed or a message is delivered), and use `dedupe_key` so retries never double-count.
- Daily roll-up into `usage_daily` for dashboards and invoices. Roll-ups are cheap to rebuild from the raw events.
- Meters are defined as settings-like data, so a new meter is added without a code change.

### Invoicing the tenant
- A monthly job creates an **invoice** per tenant: subscription, usage lines, add-ons, commission, then GST.
- GST on the platform's own invoice to a tenant: as an Indian SaaS provider, confirm the rate and the SAC code with a chartered accountant. Do not hard-code it before that check. Put it in settings, like the guest-facing tax rates.
- Invoice numbering is a separate series from the guest invoices and gap-free.
- Payment of the platform's invoice: Razorpay (subscriptions, payment links or invoices). The webhook must be idempotent, like guest payments.

### Enforcement
- Plan limits are checked in one place (a `policy` function, pure and tested) and enforced by the services. Grace period on failed payment, then the tenant's public booking pages go read-only, not deleted.
- Never delete tenant data for non-payment without written notice and an export option.

### Cost control (so it runs cheap and fast)
- **Serverless with scale-to-zero** (Vercel functions, Supabase or any Postgres). No always-on servers until traffic justifies it.
- **Cache public, read-heavy data** (room list, availability calendar, theme) at the edge with short TTLs. Availability for the calendar is the hot path.
- **Batch and queue notifications** through the existing outbox, so bursts do not spike function time.
- **Keep the database small.** Index the hot queries (`bookings(check_in)`, `booking_rooms(room_id, stay)`), archive old `usage_events` to cheap storage after the invoice period closes.
- **Per-tenant cost report**: database rows, storage, message spend and function time, so pricing can cover cost with a margin. Review it monthly.
- **Free tiers first, pay as the tenant count grows.** Check each provider's free allowance before choosing it (hosting, database, messaging).

## Build order
1. Add `tenant_id` and metering events (ties to [multi-tenancy.md](multi-tenancy.md) step 1). Metering is hard to retrofit, so do it early.
2. Plans and entitlements in the database, with a pure `policy` module and tests.
3. Usage roll-ups and a usage view in the admin.
4. Platform invoices, with GST confirmed by the accountant.
5. Self-serve checkout and plan change for tenants.

## Open questions
- Is the platform the merchant of record for tenants' guests' money? (Default: no. Each tenant uses its own Razorpay account. The platform bills only for software and usage.)
- Which plans and prices? (Owner decision.)
- Refund and cancellation terms for tenants.
