-- =============================================================================
-- Schedule Tipora pipeline jobs via pg_cron + pg_net
-- =============================================================================
--
-- BEFORE RUNNING THIS FILE:
-- 1. Replace 'https://YOUR_APP_URL.vercel.app' with your actual deployed URL
-- 2. Replace 'YOUR_CRON_SECRET' with the exact CRON_SECRET value from Vercel env
--
-- REQUIREMENTS:
-- The pg_cron and pg_net extensions must be enabled in your Supabase project.
-- Enable them via: Database → Extensions → search "pg_cron" and "pg_net" → toggle on.
-- =============================================================================

-- Make sure extensions are available
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Helper function — wraps http_post with our cron-secret header
create or replace function call_tipora_job(endpoint text)
returns void as $$
begin
  perform net.http_post(
    url := 'https://YOUR_APP_URL.vercel.app' || endpoint,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET'
    )
  );
end;
$$ language plpgsql;

-- Remove any existing Tipora schedules (safe no-op if they don't exist)
do $$
declare
  job_name text;
begin
  for job_name in
    select jobname from cron.job where jobname like 'tipora-%'
  loop
    perform cron.unschedule(job_name);
  end loop;
end $$;

-- =============================================================================
-- The schedule (all times UTC)
-- =============================================================================

-- 06:00 — pull today's fixtures from API-Football
select cron.schedule(
  'tipora-ingest-fixtures',
  '0 6 * * *',
  $$ select call_tipora_job('/api/ingest/fixtures') $$
);

-- 02:00 — recalculate all player and team trends
select cron.schedule(
  'tipora-trend-recalc',
  '0 2 * * *',
  $$ select call_tipora_job('/api/trends/calculate') $$
);

-- 07:00 — generate today's top 10 tips
select cron.schedule(
  'tipora-generate-tips',
  '0 7 * * *',
  $$ select call_tipora_job('/api/tips/generate') $$
);

-- 07:30 — build today's game accumulator
select cron.schedule(
  'tipora-game-acca',
  '30 7 * * *',
  $$ select call_tipora_job('/api/acca/game') $$
);

-- Monday 08:00 — build the weekend accumulator
select cron.schedule(
  'tipora-weekend-acca',
  '0 8 * * 1',
  $$ select call_tipora_job('/api/acca/weekend') $$
);

-- Every 2 hours — update live scores for any in-progress fixtures
select cron.schedule(
  'tipora-ingest-results',
  '0 */2 * * *',
  $$ select call_tipora_job('/api/ingest/results') $$
);

-- Every 2 hours at :15 — pull post-match player stats
select cron.schedule(
  'tipora-ingest-players',
  '15 */2 * * *',
  $$ select call_tipora_job('/api/ingest/players') $$
);

-- Every 2 hours at :30 — settle finished tips
select cron.schedule(
  'tipora-settle-tips',
  '30 */2 * * *',
  $$ select call_tipora_job('/api/tips/settle') $$
);

-- 07:15 — send daily tip digest email (Pro subscribers)
select cron.schedule(
  'tipora-email-digest',
  '15 7 * * *',
  $$ select call_tipora_job('/api/email/send?type=digest') $$
);

-- 23:30 — send settlement summary email
select cron.schedule(
  'tipora-email-settlement',
  '30 23 * * *',
  $$ select call_tipora_job('/api/email/send?type=settlement') $$
);

-- =============================================================================
-- Inspect scheduled jobs:
--   select * from cron.job where jobname like 'tipora-%';
--
-- View recent runs:
--   select * from cron.job_run_details order by start_time desc limit 20;
--
-- Unschedule a specific job:
--   select cron.unschedule('tipora-generate-tips');
-- =============================================================================
