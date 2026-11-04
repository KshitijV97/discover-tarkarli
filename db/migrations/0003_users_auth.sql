-- Users & sign-in identities (Auth.js, JWT sessions — no sessions table).
-- Identity providers: Google today; phone OTP (India) planned.

create type user_role as enum ('guest', 'staff', 'admin');

create table users (
  id                uuid primary key default gen_random_uuid(),
  email             text unique,                -- lower-cased; null for phone-only users (future OTP)
  email_verified_at timestamptz,
  phone             text unique,                -- E.164; set by phone OTP sign-in (future)
  phone_verified_at timestamptz,
  name              text,
  image             text,
  role              user_role not null default 'guest',
  last_login_at     timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint users_has_identifier check (email is not null or phone is not null)
);
create trigger users_updated_at before update on users
  for each row execute function set_updated_at();

-- One row per external identity (google sub, phone number…), so a user can
-- link several sign-in methods to one account.
create table user_identities (
  user_id             uuid not null references users(id) on delete cascade,
  provider            text not null,            -- 'google' | 'phone' | …
  provider_account_id text not null,            -- google "sub", or E.164 phone
  created_at          timestamptz not null default now(),
  primary key (provider, provider_account_id)
);
create index user_identities_user_idx on user_identities (user_id);

-- Bookings made while signed in are linked to the account. Guests can still
-- book without an account (user_id null); signed-in users also see bookings
-- made with their verified email.
alter table bookings add column user_id uuid references users(id) on delete set null;
create index bookings_user_idx on bookings (user_id);
create index bookings_guest_email_idx on bookings (lower(guest_email));

alter table users           enable row level security;
alter table user_identities enable row level security;
