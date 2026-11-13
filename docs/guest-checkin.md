# Web check-in, guest ID and guest register (TODO)

> **Status: planned, not started.** Nothing here is built yet. Legal points are the team's current understanding, **not legal advice**. Confirm with the local police station and a CA or lawyer before going live.

## Goal
Collect what the property needs before arrival (ID, arrival time, allergies, GST details) **without adding any step to booking**. Booking stays exactly as it is. Web check-in is a convenience for the guest, who skips paperwork at the desk, and for the owner, whose guest register and Form C fill themselves.

Anything still missing at arrival is completed at the desk. Web check-in is never a reason to refuse or cancel a booking.

## What the law asks for (verify locally)
| Who | Requirement | What the product does |
|---|---|---|
| Indian guests | Keep a guest register (name, address, phone, ID, arrival/departure). The state or local police decide whether ID is needed for the lead guest or every adult; some states run online guest-reporting portals | Collect ID per setting, then generate the register as a printable or CSV export |
| Foreign nationals | **Form C** to the FRRO (indianfrro.gov.in) **within 24 hours of arrival**: passport, visa, arrival details. Homestays are included | Collect passport and visa, pre-fill a Form C summary, and remind staff until it is marked submitted |
| Aadhaar | It can't be the **only** accepted ID. Don't store the full Aadhaar number; use masked Aadhaar (last 4 digits) or an issuer-signed document | Accept any government photo ID; store Aadhaar masked only |
| DPDP Act 2023 + Rules | Consent notice, stated purpose, limited retention, deletion, security safeguards, breach handling | Consent text on the form, purpose "statutory guest register", auto-purge after `retentionDays`, encrypted storage |

## Guest flow
1. The booking confirms as today. The confirmation message (WhatsApp/SMS) includes a **Web check-in** link: the existing manage-booking token page, at `/booking/[token]/checkin`.
2. A reminder goes out `reminderDaysBefore` days before arrival if check-in is incomplete (new event `checkin.reminder`, deduped per booking).
3. The form has one short section per enabled item:
   - **Guests**: names, and for each adult who needs ID, the ID step.
   - **ID**: *Fetch from DigiLocker* (one tap and consent) **or** *Upload a photo* **or** *I'll show it at the desk*.
   - **Arrival**: ETA, vehicles for parking, pickup request (an add-on, if enabled).
   - **Food**: allergies and dietary needs, which feed the kitchen summary.
   - **Invoice**: company name and GSTIN (optional), used later by the GST invoice (P3).
   - **House rules**: tick to accept, with timestamp and version stored.
4. The guest can stop and resume at any time. Progress shows as a checklist.

## Staff flow
- Arrivals list and booking detail show a **readiness badge**: ID ✓ · ETA ✓ · Balance ✓ · Allergies ✓.
- At the desk: open the booking, verify the photo ID against the person, tick *Verified at desk*. Upload or scan from a phone if nothing was submitted.
- **Guest register** page: date range → print or CSV, in the format the local police want (configurable columns).
- **Foreign guests**: a Form C card per guest with all fields laid out for copying into the FRRO portal, and a *Submitted* button with a reference number. Staff are reminded on Telegram until it's done or 24 hours pass.

## ID methods (behind an interface)
```ts
interface IdentityProvider {
  id: string;                                    // "digilocker-direct", "setu", "upload"
  start(ctx): Promise<{ redirectUrl: string }>;  // consent screen
  complete(callback): Promise<VerifiedDocument>; // doc type, name, DOB, masked number, issuer signature ok, file ref
}
```
- **DigiLocker, direct**: register as a requester organisation on the DigiLocker partner portal. It's free, but approval takes time. **Start this as an owner task early.**
- **DigiLocker via an aggregator** (Setu, IDfy, Signzy, HyperVerge…): a few rupees per pull, and live within days. Good for v2 while direct approval is pending.
- **Upload**: a photo of any accepted ID, checked by staff at the desk. This is v1.
- **Desk**: no data captured online; staff upload at arrival.

Providers activate only when their credentials are in env, like payments and channels.

## Storage and privacy
- Files go to **private object storage behind a `FileStore` interface** (S3-compatible; Supabase Storage today). No supabase-js, which keeps the portability rule. Short-lived signed URLs, viewable by staff only.
- Encrypt the ID number and file key at the application level (`ID_ENCRYPTION_KEY` env). Store Aadhaar **masked only**.
- A daily job purges files and numbers `retentionDays` after checkout, leaving a register row (name, ID type, last 4 digits) if the police format needs it.
- An access log records who viewed which ID and when.

## Settings (sketch, added to `lib/settings.ts` with defaults)
```ts
checkin: {
  enabled: false,
  reminderDaysBefore: 3,
  sections: { id: true, arrival: true, food: true, invoice: true, houseRules: true },
  idRequiredFor: "lead_guest",              // | "all_adults"
  idMethods: ["upload", "desk"],            // + "digilocker" when configured
  acceptedDocs: ["aadhaar_masked", "passport", "driving_licence", "voter_id"],
  retentionDays: 365,
  foreignerFormC: true,
  registerColumns: ["name", "address", "phone", "id_type", "id_last4", "arrival", "departure", "nationality"],
  houseRulesVersion: "2026-11",
}
```
Secrets (`DIGILOCKER_CLIENT_ID`, aggregator keys, `ID_ENCRYPTION_KEY`) go in env, never in settings.

## Data model (sketch, not a migration yet)
Every table has `tenant_id`.
| Table | Purpose |
|---|---|
| `booking_guests` | One row per guest: name, adult/child, nationality, `is_lead` |
| `guest_documents` | Doc type, method (`digilocker`/`upload`/`desk`), masked number, encrypted file key, verified_by, verified_at, purge_after |
| `booking_checkin` | ETA, vehicles, allergies, GSTIN, house-rules version and accepted_at, completed_at |
| `form_c_filings` | Guest, status, FRRO reference, submitted_by, submitted_at |
| `document_access_log` | Who viewed what, when |

## Draft test cases (move to the manual plan when built)
| ID | Case | Suite |
|---|---|---|
| TC-CHK-01 | Booking with check-in disabled works exactly as today; no link sent | S |
| TC-CHK-02 | Check-in enabled: confirmation message contains the check-in link; incomplete check-in never blocks booking or payment | N |
| TC-CHK-03 | Reminder fires once at T-`reminderDaysBefore` and not after completion | N |
| TC-CHK-04 | Allergies appear in the next kitchen summary | N |
| TC-KYC-01 | Upload ID → staff sees it via signed URL; guest and other users get 403 | N |
| TC-KYC-02 | Aadhaar stored masked only; full number never in DB or logs | R |
| TC-KYC-03 | Purge job removes files and numbers after `retentionDays` | R |
| TC-REG-01 | Register export for a date range lists every in-house guest with configured columns | N |
| TC-REG-02 | Foreign guest creates a Form C card and staff reminder; marking submitted stops reminders | N |

## Build order
1. Check-in form (arrival, food, invoice, house rules) with **upload** and **desk** ID; readiness badge; register export.
2. Form C pre-fill and reminders.
3. DigiLocker through an aggregator, behind `IdentityProvider`.
4. Direct DigiLocker once approved; drop the aggregator if it's cheaper.

Depends on: admin booking detail (P2) for the staff side; feature flags (P5) to switch it per tenant.
