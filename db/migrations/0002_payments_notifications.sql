-- Payments ledger + notification outbox.

-- ---------------------------------------------------------------------------
-- Payments: one row per payment attempt / settlement, any provider.
-- Online deposits (Razorpay) and manual settlements at the property
-- (cash/UPI/card, recorded by staff) share this ledger, so the invoice and
-- balance can always be derived from it.
-- ---------------------------------------------------------------------------
create type payment_kind as enum ('deposit', 'balance', 'other');
create type payment_status as enum (
  'created',   -- order created with provider, awaiting checkout
  'paid',      -- money received (captured / settled)
  'failed',
  'conflict',  -- paid, but booking could not be confirmed (e.g. hold expired and room taken) → refund needed
  'refunded'
);

create table payments (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid not null references bookings(id) on delete restrict,
  kind                payment_kind not null,
  provider            text not null,            -- 'razorpay' | 'manual' | …
  method              text,                     -- 'upi' | 'card' | 'cash' | … (when known)
  amount              numeric(12,2) not null check (amount >= 0),
  currency            text not null default 'INR',
  status              payment_status not null default 'created',
  provider_order_id   text,
  provider_payment_id text,
  failure_reason      text,
  raw                 jsonb,                    -- last provider payload, for audits
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index payments_provider_order_uidx on payments (provider, provider_order_id) where provider_order_id is not null;
create unique index payments_provider_payment_uidx on payments (provider, provider_payment_id) where provider_payment_id is not null;
create index payments_booking_idx on payments (booking_id);
create trigger payments_updated_at before update on payments
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Notifications: outbox + delivery log for every channel (WhatsApp, SMS,
-- Telegram, …). dedupe_key makes sends idempotent (e.g. payment verified by
-- both the browser callback and the webhook → only one message).
-- ---------------------------------------------------------------------------
create type notification_status as enum ('queued', 'sent', 'failed', 'skipped');

create table notifications (
  id                  uuid primary key default gen_random_uuid(),
  event               text not null,           -- e.g. 'booking.confirmed'
  audience            text not null,           -- 'guest' | 'operator' | 'kitchen'
  channel             text not null,           -- 'whatsapp' | 'sms' | 'telegram'
  recipient           text not null,           -- phone (E.164) or chat id
  booking_id          uuid references bookings(id) on delete set null,
  body                text not null,
  vars                jsonb not null default '{}',
  status              notification_status not null default 'queued',
  attempts            int not null default 0,
  last_error          text,
  provider_message_id text,
  dedupe_key          text unique,
  sent_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index notifications_status_idx on notifications (status, created_at);
create index notifications_booking_idx on notifications (booking_id);
create trigger notifications_updated_at before update on notifications
  for each row execute function set_updated_at();

alter table payments      enable row level security;
alter table notifications enable row level security;
