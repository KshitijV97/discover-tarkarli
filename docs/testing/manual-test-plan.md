# Manual test plan

How to test every built feature by hand. Strategy and automation: [README.md](README.md). Feature list: [feature-catalog.md](feature-catalog.md).

**How to read a case:** `Suite` = smallest suite containing it (**S**moke ⊂ sa**N**ity ⊂ **R**egression, so a Smoke case is also run in Sanity and Regression). `Auto` = the highest level it can be automated at (`unit`, `int` = integration, `e2e`, `manual` = needs a real provider or human judgement).

## 0. Setup

### Environment
```bash
docker compose down -v        # wipe local DB (optional, for a clean run)
npm run db:up && npm run db:migrate && npm run db:seed
npm run dev                   # http://localhost:3000
```
Copy `.env.example` to `.env.local`. Choose a **mode**, because behaviour differs:

| Mode | Env | What happens |
|---|---|---|
| **A. Bare** | no payment or channel keys | Bookings confirm instantly; notifications are logged as `skipped`. Use for most cases. |
| **B. Payments** | `RAZORPAY_*` test keys + webhook secret | Bookings stay `pending` until the deposit is paid. Needed for `TC-PAY-*`. |
| **C. Channels** | WhatsApp / Telegram / SMS credentials | Notifications really send. Needed for `TC-NTF-06`. |

### Test accounts
- **Guest:** any Google account not in the lists below.
- **Staff:** a Google account whose email is in `STAFF_EMAILS`.
- **Admin:** a Google account whose email is in `ADMIN_EMAILS`. Restart the dev server after changing the lists.
- Google sign-in needs the OAuth client from [auth.md](../auth.md#todo-set-up-google-sign-in). Until it is set up, skip `TC-AUTH-*`, `TC-ACC-*` and the admin cases.

### Razorpay test payments (Mode B)
Use Razorpay's published test values: card `4111 1111 1111 1111`, any future expiry, any CVV, any OTP; UPI `success@razorpay` succeeds and `failure@razorpay` fails. Details: [razorpay-onboarding.md](../razorpay-onboarding.md).

### Useful queries
```bash
psql postgres://postgres:postgres@localhost:54329/golden_tide
```
```sql
select reference, status, total, deposit_amount from bookings order by created_at desc limit 5;
select created_at, event, audience, channel, status from notifications order by created_at desc limit 10;
select * from payments order by created_at desc limit 5;
```
(Column names: check `docs/data-model.md` if a query errors.)

### Controlling time
- **Meal cutoff now:** in `/admin/settings` → Meals set `cutoffTime` to `00:00` and `cutoffDaysBefore` to `1`. Tomorrow's meals are now locked. Restore to `18:00` / `1` afterwards.
- **Hold expiry:** set `holdMinutes` to `1`, create a pending booking (Mode B), wait 2 minutes, then call the cron (below).
- **Cron:**
  ```bash
  curl -i -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily
  ```

### Worked numbers used below (default settings, seed rooms)
| Scenario | Room | GST | Total | Deposit (30%, rounded up) |
|---|---|---|---|---|
| Sea Breeze, 2 nights, 2 guests, free breakfast only | 13,000 | 5% = 650 | **13,650** | **4,095** |
| Same + dinner for 2 on night 1 | +1,300 food | +65 | **15,015** | **4,505** (4,504.50 rounded up) |
| Same as row 1 but `tax.roomThreshold` = 6000 | 13,000 | 18% = 2,340 | **15,340** | **4,602** |

## Smoke suite (S) · target ≤ 10 min

Run after every deploy. Cases are marked **S** below; this is the checklist:
`TC-UI-01`, `TC-AVL-01`, `TC-BKG-01`, `TC-MEAL-01`, `TC-PRC-01`, `TC-NTF-01`, `TC-CRN-01`, `TC-AUTH-01`, `TC-ADM-01`, `TC-SET-01`, `TC-SEC-01`, `TC-PAY-01` (Mode B only).

## Cases

### F-UI · Public site
| ID | Case | Steps | Expected | Suite | Auto |
|---|---|---|---|---|---|
| TC-UI-01 | Home loads | Open `/` | Hero, rooms, footer render; no console errors; property name/phone match settings | S | e2e |
| TC-UI-02 | Mobile layout | Browser at 375 px wide; scroll `/`, `/book`, `/food` | No horizontal scroll; buttons and links ≥ 44 px tall | N | manual |
| TC-UI-03 | Reduced motion | Enable "reduce motion" in the OS; reload `/` | Marquees, parallax and reveals do not animate | R | manual |
| TC-UI-04 | 404 page | Open `/does-not-exist` | Branded not-found page with a way home | R | e2e |
| TC-UI-05 | Footer follows settings | Admin changes property phone; reload `/` | Footer shows the new phone with no redeploy | N | manual |
| TC-UI-06 | Menu page | Open `/food` | Menu items and prices listed; prices exclude GST | N | e2e |
| TC-UI-07 | Theme tokens only | `grep -rE "#[0-9a-fA-F]{6}\|bg-(red\|blue\|green\|gray)-" src/components src/app` | No matches (theme tokens only) | R | unit (lint) |

### F-AVL · Availability
| ID | Case | Steps | Expected | Suite | Auto |
|---|---|---|---|---|---|
| TC-AVL-01 | Calendar loads | Open `/book` | Calendar shows; free-room counts per night | S | e2e |
| TC-AVL-02 | Booked room disappears | Book Sea Breeze for dates D1–D3 (TC-BKG-01). Search D1–D3 again | Sea Breeze not offered; other rooms are | N | int |
| TC-AVL-03 | Same-day turnover | With a booking checking out on D, search a stay checking in on D | Room is available | N | int |
| TC-AVL-04 | Sold-out night | Book all 6 rooms for one night | That night is marked sold out in the calendar | R | int |
| TC-AVL-05 | Bad range | `curl "localhost:3000/api/availability?checkIn=2030-01-05&checkOut=2030-01-05"` | 400 with an error body (not 500) | R | unit |
| TC-AVL-06 | Calendar cap | `curl ".../api/availability/calendar?from=2030-01-01&to=2031-01-01"` | 400 (limit 120 nights) | R | unit |

### F-BKG · Booking
| ID | Case | Steps | Expected | Suite | Auto |
|---|---|---|---|---|---|
| TC-BKG-01 | Happy path (Mode A) | `/book` → Sea Breeze, 2 nights, 2 guests → enter name, phone, email → confirm | Confirmation with reference; status `confirmed`; manage link opens | S | e2e |
| TC-BKG-02 | Occupancy limit | Pick Coral (max 2), set 3 guests | Blocked with a clear message; no booking created | N | unit |
| TC-BKG-03 | Multi-room | Book Sea Breeze + Sunset, same dates | One booking, two rooms, total is the sum | N | int |
| TC-BKG-04 | Min/max nights | Admin: `minNights` = 2. Try 1 night. Then `maxNights` = 3, try 4 | Both rejected with messages; restore defaults | N | unit |
| TC-BKG-05 | Advance limit | Admin: `maxAdvanceDays` = 30. Try a date 60 days out | Rejected | R | unit |
| TC-BKG-06 | Past dates | Pick yesterday as check-in (edit URL or form) | Rejected | R | unit |
| TC-BKG-07 | Double-booking race | Open `/book` in two tabs, same room and dates. Submit tab 1, then tab 2 | Tab 2 gets "no longer available" (HTTP 409); only one booking exists | N | int |
| TC-BKG-08 | Guest field validation | Submit with bad email, short phone, empty name | Field-level errors; nothing created | N | unit |
| TC-BKG-09 | Server price authority | `curl -X POST /api/bookings` with valid body **plus** `"total": 1` | Created booking has the server-computed total | R | int |
| TC-BKG-10 | Pending hold (Mode B) | Create booking | Status `pending`; room blocked for others; deposit prompt shown | N | int |
| TC-BKG-11 | Hold expiry (Mode B) | `holdMinutes`=1; create booking; wait; run cron | Status `expired`; room bookable again | R | int |
| TC-BKG-12 | Malformed body | `curl -X POST /api/bookings -d 'not json'` | 400 JSON error | R | unit |

### F-MEAL · Meals
| ID | Case | Steps | Expected | Suite | Auto |
|---|---|---|---|---|---|
| TC-MEAL-01 | Free breakfast | Book 2 nights, 2 guests | Breakfast on the morning after each night, quantity = guests, ₹0 | S | unit |
| TC-MEAL-02 | Add dinner | Add dinner for 2 on night 1 | Food line 2 × 650 = 1,300 + 5% GST 65; total 15,015 | N | unit |
| TC-MEAL-03 | Headcount range | Try dinner for 3 with 2 guests; try −1 | Rejected; 0..guests accepted | N | unit |
| TC-MEAL-04 | Edit before cutoff | Open manage link; change lunch headcount for a future date | Saved; quote updates; `booking.meals_updated` in `notifications` | N | int |
| TC-MEAL-05 | Locked after cutoff | Set cutoff trick (see Controlling time); open manage link | Tomorrow's meals read-only; API `PUT` returns an error | N | int |
| TC-MEAL-06 | Cutoff at booking | With cutoff trick, book for tomorrow and add dinner | Tomorrow's meal cannot be added | R | unit |
| TC-MEAL-07 | Price snapshot | Book with dinner at 650. Admin sets `dinnerPrice` 700. Reopen the booking; make a new one | Old booking still 650; new booking 700 | N | int |
| TC-MEAL-08 | Breakfast not included | Admin: `breakfastIncluded` off, price 350 | Breakfast priced 350/person + 5% GST | R | unit |

### F-PRC · Pricing, GST, deposit
| ID | Case | Steps | Expected | Suite | Auto |
|---|---|---|---|---|---|
| TC-PRC-01 | Base example | Sea Breeze, 2 nights, 2 guests, no extras | Subtotal 13,000; GST 650; total **13,650**; deposit **4,095** | S | unit |
| TC-PRC-02 | Meal GST and rounding | Add dinner for 2 | Total **15,015**; deposit **4,505** (rounded up) | N | unit |
| TC-PRC-03 | 18% slab | Admin: `roomThreshold` 6000 | Sea Breeze GST 18% = 2,340; total **15,340**; deposit **4,602**. Restore | N | unit |
| TC-PRC-04 | Fixed deposit | Admin: deposit type `fixed`, value 5000 | Deposit ₹5,000 | R | unit |
| TC-PRC-05 | Deposit fixed once paid | (Mode B) pay deposit; change deposit % in admin | Existing booking's deposit and balance unchanged | R | int |
| TC-PRC-06 | Room price snapshot | Book; `update rooms set base_price = 9000 where slug='sea-breeze-suite'` | Existing booking total unchanged; new booking uses 9000. Restore 6500 | R | int |
| TC-PRC-07 | CGST/SGST vs IGST | Toggle `tax.intraState` | Tax lines display as CGST+SGST or IGST; totals unchanged | R | unit |
| TC-PRC-08 | Tax rounded per line | Use odd prices (admin meals 551) | Each line's GST rounded individually; sum equals total | R | unit |

### F-PAY · Online deposit (Mode B)
| ID | Case | Steps | Expected | Suite | Auto |
|---|---|---|---|---|---|
| TC-PAY-01 | Pay deposit | Create booking → Pay → test card | Status `confirmed`; confirmation page; `booking.confirmed` notification | S | manual |
| TC-PAY-02 | Failed payment | Pay with `failure@razorpay` | Stays `pending`; retry possible; hold still running | N | manual |
| TC-PAY-03 | Resume payment | Close checkout; open manage link; pay | Hold countdown shown; payment completes | N | manual |
| TC-PAY-04 | Verify idempotent | After paying, replay `POST /api/payments/razorpay/verify` with the same body | Outcome `already_paid`; one `payments` row | R | int |
| TC-PAY-05 | Webhook signature | `curl -X POST /api/webhooks/razorpay -d '{}'` with a bad signature | Rejected (4xx); nothing recorded | N | int |
| TC-PAY-06 | Browser + webhook race | Pay; deliver the webhook as well | One payment row, one confirmation notification | R | int |
| TC-PAY-07 | Late payment, room free | Let hold expire; pay anyway | Booking confirmed (late-payment handling) | R | int |
| TC-PAY-08 | Late payment, room taken | Hold expires; another guest books same room; first guest pays | `payment.conflict` to operator; booking not double-booked | R | int |
| TC-PAY-09 | Payments off | Admin: `paymentsEnabled` off | Booking confirms instantly, no checkout | N | int |
| TC-PAY-10 | No keys | Remove Razorpay env; restart | Same as Mode A | R | int |

### F-MGT · Manage booking link
| ID | Case | Steps | Expected | Suite | Auto |
|---|---|---|---|---|---|
| TC-MGT-01 | Details | Open manage link from TC-BKG-01 | Rooms, dates, meals, totals, deposit, balance correct | N | e2e |
| TC-MGT-02 | Token safety | Change one character of the token | 404, no data leaked | N | int |
| TC-MGT-03 | Inactive booking | Open link of an `expired` booking; try editing meals | Meals not editable; clear message | R | int |

### F-NTF · Notifications
| ID | Case | Steps | Expected | Suite | Auto |
|---|---|---|---|---|---|
| TC-NTF-01 | Confirmed logged | Complete TC-BKG-01; run the `notifications` query | Rows for `booking.confirmed` (guest and operator); `skipped` in Mode A | S | int |
| TC-NTF-02 | Dedupe | Replay the payment verify (TC-PAY-04) | Still one notification per audience | N | int |
| TC-NTF-03 | Routing | Check which audience gets `booking.pending` | Operator only, never the guest | R | unit |
| TC-NTF-04 | Retry | Mode C with a wrong token; create booking; fix token; run `/api/cron/notifications` | Row retried, `attempts` rises, ends `sent` | R | int |
| TC-NTF-05 | Template override | Add a `templates` override in the `notifications` setting | New wording used | R | unit |
| TC-NTF-06 | Real delivery | Mode C: book; check WhatsApp, Telegram, SMS | Each channel delivers the right text to the right person | R | manual |
| TC-NTF-07 | Kitchen summary | Book dinner for tomorrow; run daily cron | `kitchen.daily_summary` with correct breakfast/lunch/dinner counts | N | int |
| TC-NTF-08 | Balance reminder | Booking checking out tomorrow; run daily cron | `booking.balance_reminder` created once | R | int |

### F-CRN · Daily jobs
| ID | Case | Steps | Expected | Suite | Auto |
|---|---|---|---|---|---|
| TC-CRN-01 | Cron auth | `curl -i /api/cron/daily` with no header, then with the bearer | 401, then 200 | S | e2e |
| TC-CRN-02 | Holds expire | See TC-BKG-11 | Expired and released | N | int |
| TC-CRN-03 | Idempotent run | Run daily cron twice in a row | No duplicate notifications | N | int |

### F-AUTH / F-ACC · Sign-in, roles, account
| ID | Case | Steps | Expected | Suite | Auto |
|---|---|---|---|---|---|
| TC-AUTH-01 | Google sign-in | `/signin` → Google → approve | Lands signed in (`/account`) | S | manual |
| TC-AUTH-02 | Sign out | Sign out, press Back | Protected pages redirect to `/signin` | N | e2e |
| TC-AUTH-03 | Gates when signed out | Open `/account` and `/admin` | Both redirect to `/signin` | N | e2e |
| TC-AUTH-04 | Guest vs admin area | Sign in as guest; open `/admin` | Redirected away (no admin data) | N | e2e |
| TC-AUTH-05 | Staff rights | Sign in as staff | `/admin` and bookings open; `/admin/settings` redirects to `/account` | N | e2e |
| TC-AUTH-06 | Admin rights | Sign in as admin | Settings open | N | e2e |
| TC-AUTH-07 | No self-elevation | As guest, craft a request to the settings server action | Rejected | R | int |
| TC-ACC-01 | History | Book while signed in; open `/account` | Booking listed; link opens the manage page | N | e2e |

### F-ADM / F-SET · Admin and settings
| ID | Case | Steps | Expected | Suite | Auto |
|---|---|---|---|---|---|
| TC-ADM-01 | Overview | Sign in as staff; open `/admin` | Counts: arrivals today, in house, next 7 days, pending holds. Match the DB | S | int |
| TC-ADM-02 | Bookings filter | `/admin/bookings`; change date range | Only stays overlapping the range, with reference, guest, rooms, status, total, deposit, balance | N | int |
| TC-ADM-03 | Timezone | Create a booking arriving "today" near midnight IST | Counted by property timezone, not UTC | R | unit |
| TC-SET-01 | Change deposit | Admin sets deposit 25%, saves | `/book` quote uses 25% immediately | S | int |
| TC-SET-02 | Invalid values | Enter −5, 150%, text in a number field | Rejected with a message; DB unchanged | N | unit |
| TC-SET-03 | Independent groups | Edit meals; leave tax form alone | Only meals row changes | N | int |
| TC-SET-04 | Site refresh | Change property phone | Footer and booking pages update at once | N | int |
| TC-SET-05 | Staff blocked | As staff, call the save action | Rejected | R | int |
| TC-SET-06 | Fallback to defaults | `delete from settings where key='tax'` | Site works with default tax; warning logged. Re-save from admin | R | int |
| TC-SET-07 | Save is logged | Save any group | Server log has the admin's email | R | manual |

### F-SEC / F-A11Y / F-PERF · Platform quality
| ID | Case | Steps | Expected | Suite | Auto |
|---|---|---|---|---|---|
| TC-SEC-01 | Protected routes | `/api/cron/*` and `/api/webhooks/razorpay` without secrets | 401 / rejected | S | e2e |
| TC-SEC-02 | No secrets in browser | `npm run build`; `grep -r "RAZORPAY_KEY_SECRET\|AUTH_SECRET" .next/static` | No matches | R | unit (script) |
| TC-SEC-03 | Error shape | Send bad input to each API | JSON error via `errorResponse()`, no stack traces | R | int |
| TC-A11Y-01 | Keyboard only | Complete a booking with Tab/Enter/Space only | Possible; visible focus; logical order | R | manual |
| TC-A11Y-02 | Labels and contrast | Run axe (browser extension) on `/`, `/book`, `/food` | No serious or critical issues | R | e2e |
| TC-PERF-01 | Mobile speed | Lighthouse mobile on `/` | Performance ≥ 80; no layout shift on carousels | R | manual |

## Running a session
1. Pick the suite. Record the build (`git rev-parse --short HEAD`) and the mode (A/B/C).
2. Work down the cases. For each, mark pass or fail and add a note on failure.
3. Append results to `docs/testing/manual-results.csv`:
   ```
   caseId,date,tester,result,notes,build
   TC-BKG-01,2026-11-05,kshitij,pass,,21df454
   ```
4. File each failure as a fix. Never mark a case passing "except for…".
5. A suite passes only when **every** case in it passes.

## Planned features (cases to be written with the feature)
F-OTP, F-REF, F-INV, F-ALC, F-ACT, F-TOUR, F-ASSIST, F-ADM2, F-CHK, F-KYC, F-REG, F-SHOP, F-SHIP, F-FOLIO, F-QRG, F-REQ, F-FDBK, F-PERK (draft cases are in their docs), F-CHN, F-TEN, F-FLG, F-ONB, F-BILL. For each, write the cases first (see [feature-catalog.md](feature-catalog.md#adding-a-feature)). Multi-tenancy brings a **standing isolation group** that every release must pass:

| ID | Case | Suite |
|---|---|---|
| TC-TEN-01 | Tenant A's admin cannot see tenant B's bookings, by UI, API and direct URL | S |
| TC-TEN-02 | A booking token from tenant A returns 404 on tenant B's domain | N |
| TC-TEN-03 | Same room and dates can be booked in both tenants (no cross-tenant overlap) | N |
| TC-TEN-04 | Disabling a feature for a tenant hides its pages, nav and API (404/403) | N |
| TC-TEN-05 | Unknown host shows a neutral "site not found" page | N |
| TC-TEN-06 | Settings, theme and copy changes in tenant A never appear in tenant B | R |
