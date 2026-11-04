# HTTP API

All JSON. Errors: `{ error: string, code?: string, details?: string[] }` with status 400 (bad input), 404, 409 (room taken), 422 (rule violation), 423 (locked), 502 (provider down), 500.

## Public (guest)
| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/api/availability` | `?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD` | `{ availableRoomIds: string[] }` |
| GET | `/api/availability/calendar` | `?from&to` (≤ 120 nights) | `{ total, free: { [date]: number } }` |
| POST | `/api/bookings` | `{ checkIn, checkOut, rooms: [{roomId, guests}], meals: [{date, mealType, quantity}], guest: {name, phone, email} }` | 201 `{ reference, paymentRequired, manageUrl }` |
| PUT | `/api/manage/:token/meals` | `{ meals: [{date, mealType, quantity}] }` (omitted slots unchanged) | `{ meals, quote }` |
| POST | `/api/manage/:token/pay` | — | `{ provider, keyId, orderId, amount, currency, prefill, holdSecondsLeft, … }` |
| POST | `/api/payments/:provider/verify` | `{ orderId, paymentId, signature }` | `{ outcome: confirmed \| already_paid \| conflict \| unknown_order }` |

The `:token` is the booking's secret `access_token` — possession = access to that booking.

## Webhooks
| Path | Auth |
|---|---|
| POST `/api/webhooks/razorpay` | `X-Razorpay-Signature` HMAC with `RAZORPAY_WEBHOOK_SECRET` |

## Cron (Bearer `CRON_SECRET`)
| Path | Does |
|---|---|
| GET `/api/cron/daily` | expire holds, balance reminders, kitchen summary for tomorrow, retry notifications |
| GET `/api/cron/notifications` | retry failed notifications |

Scheduled in `vercel.json` (daily 02:30 UTC = 08:00 IST). Any external scheduler can call them instead.
