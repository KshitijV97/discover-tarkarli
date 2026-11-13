# Guest convenience features (TODO catalogue)

> **Status: planned, not started.** Each item is a switchable module (P5 feature flags), set to `off`, `optional` or, where it makes sense, `required`. None of them may add a step to booking.

Bigger items have their own doc:
- [guest-checkin.md](guest-checkin.md): web check-in, guest ID (DigiLocker), guest register, Form C
- [produce-shop.md](produce-shop.md): seasonal Konkan produce, pickup at checkout, ship-home later

## Catalogue
| ID | Feature | When | Config knobs | Notes |
|---|---|---|---|---|
| F-CHK | Web check-in (ETA, vehicles, allergies, GSTIN, house rules) | Before arrival | sections on/off, reminder days | [guest-checkin.md](guest-checkin.md) |
| F-KYC | Guest ID (upload, DigiLocker, desk) | Before arrival | who needs ID, methods, accepted docs, retention | [guest-checkin.md](guest-checkin.md) |
| F-REG | Guest register export, Form C pre-fill | Operations | register columns, Form C on/off | [guest-checkin.md](guest-checkin.md) |
| F-PICK | Pickup from station/airport | Before arrival | locations, prices, lead time | An add-on line on the booking; staff notified |
| F-EARLY | Early check-in / late checkout requests | Before arrival | fee, approval required | Owner approves when the room is free |
| F-BAL | Pay balance early by UPI; split payment in a group | Before arrival | allow split, max payers | Uses the existing Razorpay provider |
| F-ADDON | Stay add-ons (cake, decoration, bonfire, BBQ) | Before arrival | items, prices, cutoff | Same item model as the shop; overlaps F-ACT |
| F-DIR | Day-before message: map pin, landmark photos, caretaker number | Before arrival | send time, content | New notification template |
| F-SHOP | Konkan produce shop | Any time | see doc | [produce-shop.md](produce-shop.md) |
| F-SHIP | Ship-home for shop orders | After stay | provider, fee rule | [produce-shop.md](produce-shop.md) |
| F-QRG | QR welcome guide per room: Wi-Fi, menu, house rules, **tide, sunset and swim-safety status** | During stay | sections, tide source | Tide data behind an interface; owner can override the swim flag |
| F-REQ | Request button (towels, mattress, cleaning) | During stay | request types, routing | Pings staff on Telegram |
| F-FOLIO | Running room bill and self checkout by UPI | During stay | allow self checkout | Shared by F-ALC, F-SHOP and add-ons |
| F-FDBK | Private feedback after checkout, then review request | After stay | delay, questions, review links | **See the review rules below** |
| F-PERK | Returning-guest perks and direct-booking codes | After stay | perk %, validity | Rewards loyalty, not reviews |
| F-LOST | Lost & found message | After stay | – | Staff-triggered |

## Reviews and incentives: what's allowed
The idea was "X% off the bill for a good Google review". **Don't build that.** The major platforms forbid it, and it can backfire:
- **Google** prohibits reviews incentivised with discounts, free goods or services, and also **review gating** (asking only happy guests to review). Penalties include removing reviews, freezing new ones, and warning labels on the business profile.
- **TripAdvisor, Booking.com and Airbnb** also prohibit incentivised reviews.
- **India**: the Consumer Protection Act treats misleading reviews as an unfair trade practice, and the BIS standard IS 19000:2022 on online consumer reviews expects incentivised reviews to be disclosed and negative ones not suppressed.

An earlier idea in this repo, sending the Google link only to happy guests, is review gating, and is dropped.

**What we build instead (allowed, and nearly as effective):**
1. **Ask every guest the same way**, at the same time (for example, the morning after checkout), with direct links to Google, TripAdvisor and others. No reward, and no condition on rating.
2. **Reward the private feedback form, not the public review.** Anyone who completes it, at any rating, gets a perk: X% off their next direct booking, or a free bottle of kokum syrup with their next shop order. The review request is a separate, unrewarded message.
3. **Loyalty and referral perks** (F-PERK): returning guests and guests who refer a friend get a direct-booking code. This also saves OTA commission.
4. **Answer every review** from admin (later), which helps ranking more than volume does.

Settings sketch:
```ts
feedback: {
  enabled: false,
  sendAfterHours: 18,
  questions: ["overall", "room", "food", "staff", "comments"],
  completionPerk: { type: "next_stay_percent", value: 10, validDays: 365 },  // or { type: "shop_item", itemId }
  reviewLinks: { google: "", tripadvisor: "" },  // shown to everyone, never gated, never rewarded
}
```

## Draft test cases (move to the manual plan when built)
| ID | Case | Suite |
|---|---|---|
| TC-FDBK-01 | Review request goes to every checked-out guest regardless of feedback score | N |
| TC-FDBK-02 | Feedback perk is issued for any rating, including 1 star | N |
| TC-FDBK-03 | No code path ties a discount to a public review | R |
| TC-PERK-01 | Returning-guest code applies once, server-side, and respects validity | N |
| TC-QRG-01 | QR guide loads on mobile without sign-in and shows only the configured sections | N |
| TC-REQ-01 | Guest request reaches staff once, with room and time | N |

## Suggested order
1. F-CHK + F-KYC (upload) + F-REG: the most value for the owner, the least risk.
2. F-FOLIO, then F-SHOP v1 (pickup) **before the 2027 mango season**.
3. F-QRG and F-REQ.
4. F-FDBK + F-PERK.
5. F-SHIP, DigiLocker, pickup and add-ons as demand shows.
