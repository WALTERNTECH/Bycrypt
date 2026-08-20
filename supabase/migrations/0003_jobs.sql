-- ============================================================
-- BYCRYPT SCHEDULED JOBS (pg_cron)
-- Replaces the BullMQ "check-maturity" job from the TDD.
-- ============================================================

create extension if not exists pg_cron;

create or replace function public.check_investment_maturity()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.investments
     set status = 'matured'
   where status = 'active'
     and maturity_date <= now();
end;
$$;

select cron.schedule(
  'bycrypt-check-maturity',
  '*/15 * * * *',
  $$select public.check_investment_maturity();$$
);
