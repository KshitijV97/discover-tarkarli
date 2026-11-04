# Future: third-party activity services (TODO)

> **Status: planned, not started.** Captured so the data model and booking flow stay ready for it. Nothing here is built yet.

## Idea
Guests want more than a room: parasailing, banana boat rides, scuba diving, kayaking, surfing lessons, cycling tours. The retreat owner does **not** run these. Independent operators do. The platform should let an operator list an activity, let a guest book it as an add-on to their stay, and collect money for it, while the retreat takes a commission or a listing fee.

Every service must be **configurable**. Nothing is hardcoded to "parasailing". A new activity type is data, not a code change.

## Principles
1. **Third parties own their service.** Operators set their own price, slots, capacity, cancellation terms and waiver. The retreat only curates and collects.
2. **Configurable, not coded.** An activity is a row (name, duration, price, capacity, age/fitness rules, required documents, operator). Activity *types* that need special fields (for example, a required swimming test) are described by a schema the admin edits, not by new code.
3. **One click to enable.** A tenant (or the owner) turns a category on or off in the admin, and the guest sees it at checkout.
4. **Isolated module.** Activities live in their own module (`src/lib/activities/*` for pure rules, `src/lib/server/activities-*` for I/O). They plug into the booking flow through one interface. They must not change room pricing or availability logic.

## Proposed model (sketch, not a migration yet)
| Table | Purpose |
|---|---|
| `activity_operators` | The third party: name, contact, legal/GST details, payout account reference, commission %, status (`pending`, `active`, `suspended`) |
| `activity_types` | Configurable category: slug, name, icon, `form_schema` (JSON describing extra questions such as weight limit or swim test), default duration |
| `activities` | Offer by an operator: type, title, price (paise, GST rate per type), duration, capacity per slot, location, meeting point, cancellation policy, active flag |
| `activity_slots` | Dated availability per activity (start time, capacity, booked count). Holds and overbooking are enforced by the database, like rooms |
| `activity_bookings` | Guest booking of a slot, linked to a stay (`bookings.id`, optional) and to the guest. Status, price snapshot, waiver accepted at |
| `activity_payments` | Split or routed payment, record of the retreat's commission |

Price, GST and commission are snapshotted at booking time, as with rooms and meals.

## Money flow (to decide before building)
- **Option A, collect and settle:** the retreat collects the full amount, keeps its commission and pays the operator on a schedule. Simple, but the retreat holds operator money and takes on payout compliance.
- **Option B, split at checkout:** Razorpay Route (linked accounts) sends the operator's share directly and the retreat keeps its fee. Better for the platform. Needs operator KYC. Check current Razorpay Route terms and India marketplace rules before choosing.
- **Default for the first version:** Option A with manual payouts, then move to Option B when there are several active operators.

## Compliance and risk (must be done before going live)
- Water sports carry real injury risk. Each operator provides a **signed waiver** (captured per booking) and proof of **liability insurance**.
- Check **local licensing** for each activity and location. Operators are responsible for their own permits.
- Store **minimal personal data** for activity bookings, and show the operator only what they need (name, age if required, health declaration).
- Cancellation and refund rules are set by the operator and shown before payment. Refunds go through the payments module, once it supports refunds.

## Notifications
New events in the notification system, using the same `notify()` path: `activity.booked`, `activity.cancelled`, `activity.reminder` (day before). Recipients: the guest, the operator, and staff. Each goes through the existing channels, so no new channel work is needed.

## Admin and operator portal
- **Admin:** approve operators, enable or disable activity types, see activity bookings and commission.
- **Operator portal (later):** a sign-in for the operator (same Auth.js setup, role `operator`) to manage their own activities and slots, and see their bookings. Operators must only ever see their own data (enforced in the repo layer, and by RLS if the database is Supabase).

## Build order
1. Admin-managed activity types and activities (no operators yet). Manual bookings by staff.
2. Guest add-on booking in the stay flow, with waiver and manual payment.
3. Operator accounts and their portal.
4. Split payments (Razorpay Route) and automatic payouts.
5. Commission and operator invoicing (see [saas-billing.md](saas-billing.md)).

## Open questions
- Is the retreat itself the merchant of record for guest payments, or does each operator need its own merchant account?
- Who is liable when an activity is cancelled by weather?
- Does the retreat want exclusive or open listings?
