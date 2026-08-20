-- ============================================================
-- BYCRYPT ROW LEVEL SECURITY POLICIES
-- ============================================================

alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.investment_tiers enable row level security;
alter table public.deposits enable row level security;
alter table public.investments enable row level security;
alter table public.withdrawals enable row level security;
alter table public.bot_performance_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.market_symbols enable row level security;
alter table public.platform_config enable row level security;

-- ------------------------------------------------------------
-- profiles: user reads/updates own row; admins read all
-- ------------------------------------------------------------
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- profiles insert is handled by the on_auth_user_created trigger
-- (security definer) — no client insert policy needed/allowed.

-- ------------------------------------------------------------
-- admin_users: an admin can always read their OWN row (even pre-MFA,
-- so the admin app can decide whether to show TOTP enrollment).
-- Reading the full roster requires MFA (aal2).
-- ------------------------------------------------------------
create policy "admin_users_select_self" on public.admin_users
  for select using (id = auth.uid() and public.is_admin_identity());

create policy "admin_users_select_all" on public.admin_users
  for select using (public.is_admin());

create policy "admin_users_manage" on public.admin_users
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ------------------------------------------------------------
-- investment_tiers: public read (needed pre-signup on landing/markets
-- pages); only super_admin can edit.
-- ------------------------------------------------------------
create policy "tiers_select_all" on public.investment_tiers
  for select using (true);

create policy "tiers_manage" on public.investment_tiers
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ------------------------------------------------------------
-- deposits: user can insert/select own; verification status changes
-- happen only via the server (service_role bypasses RLS). Admins
-- can select all and manually reverify.
-- ------------------------------------------------------------
create policy "deposits_select_own_or_admin" on public.deposits
  for select using (user_id = auth.uid() or public.is_admin());

create policy "deposits_insert_own" on public.deposits
  for insert with check (user_id = auth.uid());

create policy "deposits_admin_update" on public.deposits
  for update using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- investments: read-only to owning user and admins. Created only
-- by the server (service_role) on deposit confirmation.
-- ------------------------------------------------------------
create policy "investments_select_own_or_admin" on public.investments
  for select using (user_id = auth.uid() or public.is_admin());

create policy "investments_admin_update" on public.investments
  for update using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- withdrawals: user can insert own (app enforces maturity check
-- server-side too) and select own; admins select/update all.
-- ------------------------------------------------------------
create policy "withdrawals_select_own_or_admin" on public.withdrawals
  for select using (user_id = auth.uid() or public.is_admin());

create policy "withdrawals_insert_own" on public.withdrawals
  for insert with check (user_id = auth.uid());

create policy "withdrawals_admin_update" on public.withdrawals
  for update using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- bot_performance_logs: admin only
-- ------------------------------------------------------------
create policy "bot_perf_admin_all" on public.bot_performance_logs
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- audit_logs: admin read; inserts come from server (service_role)
-- ------------------------------------------------------------
create policy "audit_logs_admin_select" on public.audit_logs
  for select using (public.is_admin());

-- ------------------------------------------------------------
-- notifications: user reads own; admin reads/manages all
-- ------------------------------------------------------------
create policy "notifications_select_own_or_admin" on public.notifications
  for select using (user_id = auth.uid() or public.is_admin());

create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- market_symbols: public read; super_admin manage
-- ------------------------------------------------------------
create policy "market_symbols_select_all" on public.market_symbols
  for select using (true);

create policy "market_symbols_manage" on public.market_symbols
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ------------------------------------------------------------
-- platform_config: public read (wallet address/min deposit must be
-- visible to depositing users); super_admin manage
-- ------------------------------------------------------------
create policy "platform_config_select_all" on public.platform_config
  for select using (true);

create policy "platform_config_manage" on public.platform_config
  for all using (public.is_super_admin()) with check (public.is_super_admin());
