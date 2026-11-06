# Konkan produce shop: carry a taste, ship the rest (TODO)

> **Status: planned, not started.** Captured so the data model stays ready. Compliance notes are the team's current understanding, **not legal advice**.

## Idea
Guests love the local produce: kokum, Alphonso mangoes, jackfruit, cashews. Let them **order it during or before their stay**. They **carry a small "taste" home** and, later, have **the rest delivered to their home** in any city, so nobody hauls 5 dozen mangoes on a train.

- **v1:** order online or at the desk, and pick up at checkout. Pay now or add to the room bill.
- **v2:** split each line into *carry now* and *ship home*, fulfilled by a delivery partner.

Everything is configurable. A new product, season or unit is data, not code.

## Seasonal catalogue
Each item has a **season window**, so it appears and disappears from the site by itself. Typical Konkan windows, set by the owner each year:

| Item | Form | Typical window | Ships well? |
|---|---|---|---|
| Kokum | Juice / agal / syrup, dried kokum | Syrup and dried: all year. Fresh fruit: about Apr–Jun | Yes (bottled, dried) |
| Alphonso (Hapus) mangoes | Boxes by dozen, graded by size | About Mar–Jun | Yes, shipped semi-ripe, 1–3 days in transit |
| Jackfruit | Whole fruit (pickup only); chips, papad, dried products | Fresh: about Apr–Jul. Products: all year | Products yes; whole fruit no |
| Cashews | Raw/roasted, by weight | Harvest about Feb–May; packed all year | Yes |

Season features, all switchable:
- **Coming soon / waitlist**: off-season items show "Notify me", and opted-in guests get a message when the season opens. Marketing messages need explicit opt-in (WhatsApp policy and DPDP).
- **Season banner** on the home page while any item is in season ("Mango season is here").
- **Pre-order for your stay**: reserve a box for your checkout date, with a cutoff like meals (`cutoffDaysBefore`), so the owner buys the right quantity.
- **Limited stock**: an optional daily or season cap per item; sold-out shows clearly.
- **Seasonal dishes** on the menu (kokum curry, jackfruit sabzi) can use the same window fields later, via `menu_items`.

Variety names and origin claims (for example, Devgad or Ratnagiri Alphonso are GI-tagged) must be accurate. The owner confirms the wording.

## Guest flow
1. **Shop** page (`/shop`, plus a section on the manage-booking page) lists in-season items with photo, unit, price incl. GST, and stock.
2. Add items. If the guest has a booking, they choose **Pay now** or **Add to my bill** (settles at checkout).
3. **v2, per line:** a *Take home now / Ship to me* split. Example: 6 dozen mangoes → carry 1 dozen, ship 5. Ship lines ask for an address, check the pincode, and show the delivery fee and estimated date.
4. Pickup lines are packed and handed over at checkout; ship lines are dispatched within `dispatchWithinDays`.
5. Guests without a booking can order too if `openToPublic` is on (pickup or ship only).

## Staff flow
- **Pick list** per day (in the existing daily kitchen summary, or a new Telegram message): what to pack for whom.
- Mark lines **packed** → **handed over** (pickup) or **dispatched** (ship, with tracking).
- Unpaid "add to bill" lines appear on the booking's balance.
- Item management in admin: price, GST rate, unit, season window, stock, photos, pickup/ship flags.

## Delivery partner (v2, behind an interface)
```ts
interface FulfilmentProvider {
  id: string;                                   // "manual", "shiprocket", "delhivery", ...
  serviceable(pincode, parcel): Promise<{ ok: boolean; etaDays?: number; feePaise?: number }>;
  createShipment(order, address, parcels): Promise<{ awb: string; labelUrl?: string }>;
  track(awb): Promise<ShipmentStatus>;
  cancel(awb): Promise<void>;
}
```
- **`manual`** first: staff book the courier themselves and paste the tracking number. This works on day one.
- Then an aggregator such as Shiprocket (many couriers, one API), or Delhivery or Blue Dart directly for express perishables. A status webhook updates the shipment.
- Shipping fee rule in settings: flat, by weight slab, or free above ₹X.
- Perishables: express only, no shipping on Saturdays if delivery would slip past the weekend, plus a *damaged on arrival* claim with a photo within 24 hours.

## Money and tax
- **Prices are integer paise and GST-exclusive**, snapshotted on the order line, exactly like meals.
- **GST rate per item, set in admin**, never hardcoded. Fresh fruit is typically exempt, while processed and packaged goods (juices, roasted cashews, chips) carry rates that differ by product and have changed recently. Confirm each rate with your CA.
- Shipping fee is its own line with its own GST rate.
- Payments reuse the existing Razorpay provider (new `purpose: "shop"`). `recordPayment()` idempotency applies.

## Compliance checklist (before selling)
- **FSSAI**: selling food needs a registration or licence that covers it. Check whether the restaurant's existing one covers retail and online sale of these items.
- **Legal Metrology** for packaged goods: net quantity, MRP, packer details and best-before on the label.
- **Refund and cancellation policy for perishables** on the policy pages (Razorpay requires one).
- **Waitlist and broadcast messages**: explicit opt-in, with easy opt-out.

## Settings (sketch)
```ts
shop: {
  enabled: false,
  openToPublic: false,
  allowAddToBill: true,
  preorderCutoffDaysBefore: 1,
  shipping: { enabled: false, provider: "manual", feeRule: { type: "flat", paise: 15000 }, freeAbovePaise: 300000, dispatchWithinDays: 2 },
  seasonBanner: true,
  waitlist: true,
}
```

## Data model (sketch, not a migration yet)
Every table has `tenant_id`.
| Table | Purpose |
|---|---|
| `shop_items` | Name, description, unit (`kg`, `dozen`, `bottle`, `pack`), price, GST rate, season start/end (month-day, repeats yearly), stock cap, `can_pickup`, `can_ship`, weight for shipping, photos, active |
| `shop_orders` | Guest, optional `booking_id`, status, payment mode (`prepaid`/`on_bill`), totals |
| `shop_order_lines` | Item, quantity, `fulfilment` (`pickup`/`ship`), price and GST snapshot, status (`reserved` → `packed` → `handed_over`/`dispatched` → `delivered`), shipment id |
| `shop_shipments` | Address, provider, AWB, fee snapshot, status, events |
| `shop_waitlist` | Item, contact, opted_in_at, notified_at |

## Notifications
New events through `notify()`: `shop.ordered` (guest + staff), `shop.ready` (pickup), `shop.dispatched` (with tracking), `shop.delivered`, `shop.season_open` (waitlist only). Each uses a `dedupeKey`.

## Draft test cases (move to the manual plan when built)
| ID | Case | Suite |
|---|---|---|
| TC-SHOP-01 | Shop disabled: no page, no nav, API 404 | S |
| TC-SHOP-02 | Out-of-season item hidden (or shown as "Notify me" if waitlist is on) | N |
| TC-SHOP-03 | Server recomputes totals and GST per line; client total ignored | N |
| TC-SHOP-04 | "Add to bill" line increases the booking balance; price unchanged after admin edits item price | N |
| TC-SHOP-05 | Pre-order after cutoff is rejected | N |
| TC-SHOP-06 | Stock cap: last unit can't be sold twice under concurrent orders | R |
| TC-SHIP-01 | Split line: carry 1, ship 5 → two lines, correct fulfilment each | N |
| TC-SHIP-02 | Unserviceable pincode blocks ship option with a clear message | N |
| TC-SHIP-03 | Manual provider: tracking number entered → guest gets `shop.dispatched` once | N |

## Build order
1. Catalogue with season windows, pickup-only orders, pay now or add to bill, staff pick list. **To catch the 2027 mango season this needs to be live by about February 2027.**
2. Pre-orders, stock caps, waitlist and season banner.
3. Ship-home with the `manual` provider and the carry/ship split.
4. Courier integration (aggregator) with live fee quotes and tracking.
5. Public shop for non-guests.

Depends on: a room bill (folio), shared with à la carte ordering (F-ALC); admin item management (P2); feature flags (P5).
