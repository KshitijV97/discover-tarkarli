-- Golden Tide Retreat — initial schema.
-- Plain PostgreSQL (13+). Only uses the standard contrib extension btree_gist,
-- which is available on Supabase, Neon, RDS, Cloud SQL and stock Postgres.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type booking_status as enum (
  'pending',      -- created, waiting for deposit (holds inventory until expires_at)
  'confirmed',    -- deposit paid (or payments disabled)
  'checked_in',
  'checked_out',
  'cancelled',
  'expired'       -- pending hold lapsed without payment
);

create type meal_type as enum ('breakfast', 'lunch', 'dinner');

create type order_status as enum ('placed', 'in_preparation', 'served', 'cancelled');

-- ---------------------------------------------------------------------------
-- Shared trigger: updated_at
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Rooms
-- ---------------------------------------------------------------------------
create table rooms (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  description   text not null default '',
  max_occupancy int  not null check (max_occupancy > 0),
  base_price    numeric(12,2) not null check (base_price >= 0),  -- per room per night, excl. GST
  photos        text[] not null default '{}',                     -- public URLs
  amenities     text[] not null default '{}',
  sort_order    int  not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger rooms_updated_at before update on rooms
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Bookings
-- Money columns are excl./incl. GST as named; all amounts in INR.
-- ---------------------------------------------------------------------------
create table bookings (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique,          -- human-friendly, e.g. GT-7K3P9Q
  access_token    text not null unique,          -- secret for the guest's manage-booking link
  guest_name      text not null,
  guest_phone     text not null,                 -- E.164, e.g. +919876543210
  guest_email     text not null,
  num_guests      int  not null check (num_guests > 0),
  check_in        date not null,
  check_out       date not null,
  status          booking_status not null default 'pending',
  expires_at      timestamptz,                   -- only for status = pending
  subtotal_amount numeric(12,2) not null default 0,  -- excl. GST
  tax_amount      numeric(12,2) not null default 0,
  total_amount    numeric(12,2) not null default 0,  -- incl. GST
  deposit_amount  numeric(12,2) not null default 0,
  deposit_paid    boolean not null default false,
  deposit_paid_at timestamptz,
  balance_paid    boolean not null default false,
  balance_paid_at timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint bookings_dates_valid check (check_out > check_in)
);
create index bookings_check_in_idx on bookings (check_in);
create index bookings_status_idx on bookings (status);
create trigger bookings_updated_at before update on bookings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Booking ↔ rooms
-- `stay` and `blocks_inventory` are denormalised from bookings by triggers so
-- the exclusion constraint can guarantee no double-booking at the DB level,
-- even under concurrent requests.
-- ---------------------------------------------------------------------------
create table booking_rooms (
  booking_id       uuid not null references bookings(id) on delete cascade,
  room_id          uuid not null references rooms(id),
  guests           int  not null check (guests > 0),
  price_per_night  numeric(12,2) not null,   -- room rate snapshot, excl. GST
  gst_rate         numeric(5,2)  not null,   -- % applied to this room's nightly charge
  stay             daterange not null,       -- [check_in, check_out)
  blocks_inventory boolean not null default true,
  primary key (booking_id, room_id),
  constraint booking_rooms_no_overlap
    exclude using gist (room_id with =, stay with &&) where (blocks_inventory)
);
create index booking_rooms_room_idx on booking_rooms (room_id);

create or replace function booking_status_blocks(s booking_status) returns boolean
language sql immutable as $$
  select s in ('pending', 'confirmed', 'checked_in', 'checked_out')
$$;

-- On insert: copy stay + blocking flag from the parent booking.
create or replace function booking_rooms_sync_from_booking() returns trigger
language plpgsql as $$
declare b bookings%rowtype;
begin
  select * into b from bookings where id = new.booking_id;
  new.stay := daterange(b.check_in, b.check_out, '[)');
  new.blocks_inventory := booking_status_blocks(b.status);
  return new;
end $$;
create trigger booking_rooms_before_insert before insert or update on booking_rooms
  for each row execute function booking_rooms_sync_from_booking();

-- On booking date/status change: propagate to its rooms.
create or replace function bookings_propagate_to_rooms() returns trigger
language plpgsql as $$
begin
  if new.check_in is distinct from old.check_in
     or new.check_out is distinct from old.check_out
     or new.status is distinct from old.status then
    update booking_rooms
       set stay = daterange(new.check_in, new.check_out, '[)'),
           blocks_inventory = booking_status_blocks(new.status)
     where booking_id = new.id;
  end if;
  return new;
end $$;
create trigger bookings_after_update after update on bookings
  for each row execute function bookings_propagate_to_rooms();

-- Releases inventory held by unpaid bookings whose hold has lapsed.
-- Called before availability checks and booking creation (and can be cron'd).
create or replace function expire_stale_bookings() returns int
language plpgsql as $$
declare n int;
begin
  update bookings set status = 'expired'
   where status = 'pending' and expires_at is not null and expires_at < now();
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Meals (per booking, per date, per meal type)
-- Breakfast rows exist for every morning after a booked night so the kitchen
-- has counts, with included_free = true and price 0 when breakfast is included.
-- ---------------------------------------------------------------------------
create table booking_meals (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid not null references bookings(id) on delete cascade,
  date             date not null,
  meal_type        meal_type not null,
  quantity         int  not null check (quantity >= 0),
  price_at_booking numeric(12,2) not null default 0,  -- unit price per person, excl. GST
  gst_rate         numeric(5,2)  not null default 0,
  included_free    boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (booking_id, date, meal_type)
);
create index booking_meals_date_idx on booking_meals (date, meal_type);
create trigger booking_meals_updated_at before update on booking_meals
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- À la carte (step 3 — schema created now so the model is complete)
-- ---------------------------------------------------------------------------
create table menu_items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  category    text not null default 'Mains',
  price       numeric(12,2) not null check (price >= 0),
  veg         boolean not null default true,
  active      boolean not null default true,  -- availability toggle
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger menu_items_updated_at before update on menu_items
  for each row execute function set_updated_at();

create table ala_carte_orders (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  room_id    uuid references rooms(id),
  status     order_status not null default 'placed',
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ala_carte_orders_booking_idx on ala_carte_orders (booking_id);
create trigger ala_carte_orders_updated_at before update on ala_carte_orders
  for each row execute function set_updated_at();

create table ala_carte_order_items (
  order_id       uuid not null references ala_carte_orders(id) on delete cascade,
  menu_item_id   uuid not null references menu_items(id),
  quantity       int  not null check (quantity > 0),
  price_at_order numeric(12,2) not null,
  gst_rate       numeric(5,2)  not null default 0,
  primary key (order_id, menu_item_id)
);

-- ---------------------------------------------------------------------------
-- Settings (key → JSON value). Defaults live in src/lib/settings.ts; rows here
-- override them, so a missing key never breaks the app.
-- ---------------------------------------------------------------------------
create table settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
create trigger settings_updated_at before update on settings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Security: the app connects server-side with a privileged DB role, so it is
-- unaffected by RLS. On Supabase, enabling RLS with no policies stops the
-- public anon/authenticated API keys from reading or writing these tables.
-- On plain Postgres this is harmless.
-- ---------------------------------------------------------------------------
alter table rooms                 enable row level security;
alter table bookings              enable row level security;
alter table booking_rooms         enable row level security;
alter table booking_meals         enable row level security;
alter table menu_items            enable row level security;
alter table ala_carte_orders      enable row level security;
alter table ala_carte_order_items enable row level security;
alter table settings              enable row level security;
