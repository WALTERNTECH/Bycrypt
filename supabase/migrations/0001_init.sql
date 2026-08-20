-- ============================================================
-- BYCRYPT DATABASE SCHEMA (Supabase / PostgreSQL 15+)
-- Adapted from Bycrypt Technical Design Document v1.0
-- Auth is handled by Supabase Auth (auth.users); this schema
-- adds profile/domain tables keyed off auth.users.id.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Profiles (depositors) — 1:1 with auth.users
-- ------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     varchar(120) not null,
  phone         varchar(20),
  status        varchar(20) not null default 'active'
                 check (status in ('active','suspended','deactivated')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Admin / operations users — 1:1 with auth.users, never created
-- via public signup. Rows inserted manually by a super_admin.
-- TOTP/MFA is handled by Supabase Auth's built-in MFA (aal2).
-- ------------------------------------------------------------
create table public.admin_users (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     varchar(120) not null,
  role          varchar(20) not null default 'operations'
                 check (role in ('super_admin','operations','viewer')),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Security-definer helpers so RLS policies can check admin status
-- without recursive RLS lookups.
--
-- is_admin_identity(): true if this user IS an admin, regardless of
-- MFA level. Used only so the admin app can read its own admin_users
-- row at aal1 to decide whether to show the TOTP-enrollment screen.
--
-- is_admin() / is_super_admin(): true only once the session has
-- completed TOTP (aal2). Used to gate every actual admin data
-- access — deposits, investments, withdrawals, audit logs, etc.
create or replace function public.is_admin_identity()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where id = auth.uid() and is_active = true
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_admin_identity()
    and coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2';
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where id = auth.uid() and is_active = true and role = 'super_admin'
  ) and coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2';
$$;

-- ------------------------------------------------------------
-- Investment tier configuration (seeded, editable by super_admin)
-- ------------------------------------------------------------
create table public.investment_tiers (
  id              serial primary key,
  name            varchar(40) not null,
  lockup_days     integer not null,
  max_return_pct  numeric(5,2) not null,
  is_active       boolean not null default true
);

insert into public.investment_tiers (name, lockup_days, max_return_pct) values
  ('7-Day',  7,  5.00),
  ('14-Day', 14, 10.00),
  ('30-Day', 30, 15.00),
  ('60-Day', 60, 20.00),
  ('90-Day', 90, 25.00);

-- ------------------------------------------------------------
-- Deposits (submitted for verification, matched by tx_hash)
-- ------------------------------------------------------------
create table public.deposits (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id),
  tier_id           integer not null references public.investment_tiers(id),
  tx_hash           varchar(80) unique not null,
  amount            numeric(18,6),
  token             varchar(20) not null default 'USDT-TRC20',
  status            varchar(20) not null default 'pending_verification'
                     check (status in ('pending_verification','confirmed','rejected')),
  rejection_reason  varchar(255),
  submitted_at      timestamptz not null default now(),
  confirmed_at      timestamptz
);

-- ------------------------------------------------------------
-- Investments (created once a deposit is confirmed)
-- ------------------------------------------------------------
create table public.investments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id),
  deposit_id      uuid unique not null references public.deposits(id),
  tier_id         integer not null references public.investment_tiers(id),
  amount          numeric(18,6) not null,
  max_return_pct  numeric(5,2) not null,
  accrued_return  numeric(18,6) not null default 0,
  start_date      timestamptz not null default now(),
  maturity_date   timestamptz not null,
  status          varchar(20) not null default 'active'
                   check (status in ('active','matured','withdrawn')),
  created_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Withdrawal requests
-- ------------------------------------------------------------
create table public.withdrawals (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id),
  investment_id         uuid not null references public.investments(id),
  amount                numeric(18,6) not null,
  destination_address   varchar(80) not null,
  status                varchar(20) not null default 'pending'
                         check (status in ('pending','approved','rejected','processed')),
  admin_id              uuid references public.admin_users(id),
  tx_hash               varchar(80),
  rejection_reason      varchar(255),
  requested_at          timestamptz not null default now(),
  processed_at          timestamptz
);

-- ------------------------------------------------------------
-- Bot performance snapshots (solvency tracking)
-- ------------------------------------------------------------
create table public.bot_performance_logs (
  id                        serial primary key,
  log_date                  date not null,
  total_trading_pnl         numeric(18,6) not null,
  total_accrued_liability   numeric(18,6) not null,
  notes                     text,
  created_at                timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Admin audit trail
-- ------------------------------------------------------------
create table public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  admin_id      uuid references public.admin_users(id),
  action        varchar(80) not null,
  target_type   varchar(40),
  target_id     uuid,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Notifications (in-app; email/SMS dispatch hook for later)
-- ------------------------------------------------------------
create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id),
  admin_id      uuid references public.admin_users(id),
  type          varchar(40) not null,
  message       text not null,
  is_read       boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Supported market symbols (crypto only for v1 — see PRD 2.3 /
-- launch scope decision to drop stocks & futures for v1)
-- ------------------------------------------------------------
create table public.market_symbols (
  id            serial primary key,
  symbol        varchar(20) unique not null,
  display_name  varchar(40) not null,
  asset_class   varchar(20) not null check (asset_class in ('crypto')),
  data_provider varchar(30) not null default 'binance',
  is_active     boolean not null default true,
  sort_order    integer not null default 0
);

insert into public.market_symbols (symbol, display_name, asset_class, data_provider, sort_order) values
  ('BTCUSDT', 'Bitcoin', 'crypto', 'binance', 1),
  ('ETHUSDT', 'Ethereum', 'crypto', 'binance', 2),
  ('SOLUSDT', 'Solana', 'crypto', 'binance', 3),
  ('BNBUSDT', 'BNB', 'crypto', 'binance', 4),
  ('XRPUSDT', 'XRP', 'crypto', 'binance', 5),
  ('DOGEUSDT', 'Dogecoin', 'crypto', 'binance', 6),
  ('ADAUSDT', 'Cardano', 'crypto', 'binance', 7),
  ('TONUSDT', 'Toncoin', 'crypto', 'binance', 8);

-- ------------------------------------------------------------
-- Platform-wide runtime config (editable without redeploy)
-- ------------------------------------------------------------
create table public.platform_config (
  key           varchar(60) primary key,
  value         text not null,
  updated_at    timestamptz not null default now()
);

insert into public.platform_config (key, value) values
  ('receiving_wallet_address', 'REPLACE_WITH_CLIENT_TRC20_WALLET_ADDRESS'),
  ('min_deposit_usdt', '10'),
  ('platform_name', 'Bycrypt');

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------
create index idx_deposits_user on public.deposits(user_id);
create index idx_investments_user on public.investments(user_id);
create index idx_investments_status on public.investments(status);
create index idx_withdrawals_status on public.withdrawals(status);
create index idx_withdrawals_user on public.withdrawals(user_id);
create index idx_audit_admin on public.audit_logs(admin_id);
create index idx_notifications_user on public.notifications(user_id);

-- ------------------------------------------------------------
-- updated_at trigger for profiles
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- New auth.users -> profiles bootstrap
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
