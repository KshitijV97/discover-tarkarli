# Channel sync: Airbnb, MakeMyTrip, Booking.com… (PLANNED)

> **Status: design only.** It depends on **room types**, which the owner will configure first.

## Goal
One inventory across the direct website and online travel agencies (OTAs). When a room is booked anywhere, it disappears everywhere else, with no double bookings.

## Key concept: room types vs rooms
OTAs sell **room types with a count** ("Sea-view Double: 2 left"), not individual rooms. Our double-booking guarantee works on **physical rooms** (the `booking_rooms_no_overlap` constraint). So:
- Add `room_types` (name, description, occupancy, base price, photos, amenities). Each `rooms` row gets a `room_type_id`.
- Availability for a type on a night = number of its rooms that are free.
- A booking for a type is **assigned to a specific free room** inside the same transaction, so the DB constraint still guarantees no overlap. Staff can reassign later.
- The website can keep showing rooms individually or switch to types. That's a UI choice made once types exist.

## Phase 1: iCal two-way sync (free, quick)
Supported by Airbnb, Booking.com, Vrbo and Agoda (per room or listing).
- **Export:** `GET /api/ical/<room-or-type>/<secret>.ics` lists blocked dates from all bookings. Paste that URL into each OTA's calendar import.
- **Import:** a new `external_calendars` table holds (room/type, channel, iCal URL, last synced). A cron job fetches each URL and turns every event into a blocking booking (`source = 'airbnb'`, no guest details or prices). If an event overlaps an existing booking, it is stored as a **conflict** and staff are alerted (`channel.conflict` notification).
- **Cadence:** every 15 minutes. The Vercel Hobby plan only runs daily crons, so use a free external scheduler (GitHub Actions `schedule`, cron-job.org) calling `/api/cron/channels` with `CRON_SECRET`.
- **Limits:**
  - OTAs refresh imported calendars on their own schedule (often hourly), so there's a short **double-booking window**.
  - iCal carries dates only: no rates, no guest names.
  - **MakeMyTrip/Goibibo generally don't offer iCal for hotels.** Check this for your listing type.

## Phase 2: channel manager (real-time, rates + inventory)
For MakeMyTrip/Goibibo and real-time sync, OTAs usually require a **certified channel manager**. Candidates to evaluate (confirm current MMT/Goibibo, Airbnb and Booking.com support and pricing with each vendor):
- **Channex.io**: developer-first API, white-label.
- **AxisRooms**, **STAAH**, **eZee Centrix**: popular with Indian properties, with MMT connectivity.

Behind a `ChannelProvider` interface (same pattern as payments):
```ts
interface ChannelProvider {
  pushAvailability(roomTypeId: string, from: ISODate, to: ISODate): Promise<void>; // counts per night
  pushRates(roomTypeId: string, from: ISODate, to: ISODate): Promise<void>;
  parseBookingWebhook(raw: string, signature: string | null): ExternalBooking | null; // new / modified / cancelled
}
```
- Every booking change on our side (create, cancel, expire, date edit) triggers `pushAvailability` for affected dates, via an outbox table like `notifications`.
- Incoming OTA bookings → `createExternalBooking()`: assigns a room, stores guest details and the channel's price and commission, then fires the usual notifications.

## Data model additions
- `room_types`; `rooms.room_type_id`
- `bookings.source` (`direct · airbnb · booking_com · makemytrip · goibibo · agoda · walk_in`), `bookings.external_ref`, `bookings.channel_commission`
- `external_calendars` (Phase 1), `channel_connections` + `channel_sync_log` (Phase 2)

## Owner decisions needed
1. Room types: names, which physical rooms belong to each, occupancy, base price.
2. Which channels first (Airbnb? Booking.com? MakeMyTrip/Goibibo?).
3. Budget for a channel manager (Phase 2 is a monthly subscription).
