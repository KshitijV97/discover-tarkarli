# 06 · Partner money: payment accounts, tax profiles, UPI, messages

> **Status: Draft.** Depends on: 02, 03. Feature ids: **F-PACC**, **F-TAX**, **F-UPI**, **F-WA**. Glossary: Merchant of record, Payment account, Tax profile, Usage. ADRs 018, 019.

## Problem
Each Partner is the **Merchant of record** (ADR 018). Most aren't comfortable with payment gateways, and many aren't GST-registered. The platform needs these to be correct per Partner: how a Partner gets paid, what tax a guest sees, and how much the Platform's WhatsApp messages cost — without the Platform ever holding guest money.

## Users and stories
- As a Partner owner, I choose how guests pay me: **pay at property**, or my **UPI ID**. Razorpay is offered later, behind a switch.
- As a guest at a UPI Partner, I see a QR code or UPI app link with the exact deposit amount. My room is held while the Partner confirms receipt.
- As a Partner manager, I confirm or reject a UPI payment from my phone. Unconfirmed bookings expire after the hold time.
- As a Partner owner, I set my **Tax profile**: unregistered, registered (regular) with a GSTIN, or composition. Prices and receipts follow it.
- As the **Owner**, automatic WhatsApp messages go out from the Platform number on Partners' behalf. Each Partner has a free monthly allowance, and messages above it are recorded as Usage.

## Scope
- Payment account settings and the UPI deposit flow with an "awaiting payment confirmation" state.
- Tax profiles in pricing and receipts.
- The WhatsApp allowance and message metering.
- The Owner's turnover-vs-threshold tracker.
- Razorpay kept as a hidden option.

## Non-goals
Razorpay Route or any platform-held money (that would be the pivot to model B, a new ADR). Platform invoices to Partners (later, see [saas-billing.md](../saas-billing.md)). Marketing WhatsApp messages (never from the Platform number).

## Decisions (made)
- **Payment account:** `pay_at_property` | `upi` | `razorpay`.
  - `razorpay` is hidden unless the platform setting `payments.razorpayForPartners` is on.
  - The Razorpay adapter keeps working for Partner #1 if configured, but its credentials move from env to per-Partner encrypted storage only when a second Partner needs it.
- **UPI deposit flow:**
  - The booking is created as `pending` with a new reason `awaiting_payment_confirmation`, and inventory stays blocked.
  - The guest sees `upi://pay?pa=<vpa>&pn=<partner name>&am=<deposit rupees>&tn=<booking ref>` as a link and as a QR code. The QR is generated client-side and no third-party QR service is called.
  - The Partner confirms, which records a `payments` row with `provider = 'upi_manual'` and confirms the booking (through the same idempotent path), or rejects, which cancels with a reason.
  - The hold length is a Partner setting `payments.upiHoldHours`, default 6. The existing hold-expiry cron expires late ones and notifies both sides.
- **Tax profiles** (pure logic in `src/lib/booking/pricing`):
  - `regular`: today's behaviour. GST slabs come from Platform defaults, and a Partner may override where the law allows. The GSTIN is printed.
  - `unregistered`: no GST line, total = base. The receipt says "Bill of supply" with the wording from O-1.
  - `composition`: no GST line shown to the guest. The receipt carries composition wording from O-1.
  - Price snapshots record the profile used, so changing profiles never alters existing bookings.
- **WhatsApp allowance:**
  - The Platform setting `messaging.freeUtilityPerPartnerPerMonth` defaults to 100.
  - Every platform-sent message records `message_sent` Usage. Messages above the allowance are still sent (never block a guest confirmation) and are flagged `over_allowance` in Usage.
  - Telegram staff alerts are free and unmetered for allowance purposes.
- **Turnover tracker:** the Owner records Featured payments (plan 03). The Platform console shows the Owner's fee turnover for the financial year against `platform.gstThresholdPaise` (default ₹20,00,000) and warns at 75%.

## Slices

### S1 · Payment account settings — `todo`
- **Changes:** Partner settings group `payments` (method, UPI VPA validated by format, payee name, `upiHoldHours`). Partner owner only (plan 02 permissions). Migration only if settings can't hold it (they can: partner-scoped `settings`).

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-PACC-01 | Only the `partner_owner` can change the payment account, and a manager gets 403 | int | N |
| TC-PACC-02 | An invalid VPA format is rejected with a field error | unit | N |
| TC-PACC-03 | With `pay_at_property`, bookings confirm at once as today (Mode A) | int | S |

### S2 · Tax profiles in pricing and receipts — `blocked: owner O-1 (receipt wording)` (pure logic can start)
- **Changes:** Add `taxProfile` to the pure pricing input, plus snapshot columns (migration). Add a profile setting with a GSTIN field for `regular` (format and checksum validated). Receipt and manage-page wording follows the profile.

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-TAX-01 | `regular`: the existing worked examples (TC-PRC-*) still hold | unit | S |
| TC-TAX-02 | `unregistered`: a ₹6,000 room × 2 nights totals ₹12,000 with no GST lines, and the deposit is computed on ₹12,000 | unit | S |
| TC-TAX-03 | `composition`: no GST line shown, and the receipt carries composition wording | unit | N |
| TC-TAX-04 | Changing a Partner's profile doesn't change existing bookings' totals | int | N |
| TC-TAX-05 | An invalid GSTIN checksum is rejected | unit | N |

### S3 · UPI deposit flow — `todo` (depends S1)
- **Changes:** Add the pending reason, the UPI link and QR on the manage page, confirm/reject actions in the Partner console (queueable offline via plan 05 if it has landed, otherwise online), hold expiry per Partner, and notifications.

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-UPI-01 | A UPI Partner's booking shows a `upi://pay` link with the exact deposit in rupees and the booking ref | int | S |
| TC-UPI-02 | Partner confirmation records a `upi_manual` payment and confirms the booking, and a second confirmation is a no-op | int | S |
| TC-UPI-03 | Without confirmation, the booking expires after `upiHoldHours`, the room frees up, and both sides are notified once | int | N |
| TC-UPI-04 | Rejecting cancels the booking with a reason shown to the guest | int | N |
| TC-UPI-05 | The double-booking guard holds while a UPI booking is pending | int | N |

### S4 · Message metering and allowance — `todo` (plan 03 S4 required)

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-WA-01 | Each platform-sent WhatsApp or SMS records one `message_sent` with its channel, and a retry doesn't double-count | int | N |
| TC-WA-02 | The 101st utility message in a month is sent and flagged `over_allowance` | int | N |
| TC-WA-03 | The Partner's Usage page shows messages used against the allowance | int | N |

### S5 · Per-language utility templates from the platform number — `blocked: owner O-2, O-3`
- **Templates** (utility category, in en, mr and hi): `booking_confirmed`, `booking_awaiting_payment`, `payment_confirmed`, `booking_reminder_day_before`, `booking_cancelled`. Partner-facing: `new_booking_alert`.

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-WA-04 | The template is chosen by event × `guest_lang`, falling back to English | unit | N |
| TC-WA-05 | Real send with test numbers in each language | manual | R |

### S6 · Owner's turnover tracker — `todo` (plan 03 S7 required)

| TC | Case | Level | Suite |
|---|---|---|---|
| TC-WA-06 | The Platform console shows financial-year fee turnover, and warns when it crosses 75% of the threshold | int | N |

## Open questions (refine before Ready)
1. The O-1 wording for unregistered and composition receipts. Can S2's UI wait for it, while the pure logic ships first?
2. May a UPI Partner also ask for **no deposit** (book now, pay at property)? Default: yes, a deposit of 0% is allowed and means instant confirmation.
3. Should the over-allowance flag ever **block** messages (e.g. a hard cap of 1,000 a month to avoid surprise bills)? Default: no block, but notify the Owner at 80% of a platform-wide monthly budget setting.
4. Is the GST threshold tracker based on receipts or invoice dates? Default: payment received date, as recorded by the Owner.

## Done when
S1–S6 are `done` (S5 once O-2 and O-3 are done). F-PACC, F-TAX, F-UPI and F-WA are Built. [payments.md](../payments.md), [booking-rules.md](../booking-rules.md) and [notifications.md](../notifications.md) are updated.
