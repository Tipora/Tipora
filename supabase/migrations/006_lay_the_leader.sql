-- =============================================================================
-- Lay-The-Leader Bot Schema
-- =============================================================================
-- Separate from the tipping platform. Uses 'tipora-lay-' prefix for cron jobs
-- to avoid collisions with the tipping platform's 'tipora-' prefix.
-- =============================================================================

-- Leagues to monitor for lay bot (separate from tipping platform competitions)
create table if not exists monitored_leagues (
  id serial primary key,
  api_football_id integer unique not null,
  name text not null,
  country text not null,
  current_season integer not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- Single-row config table for tunable thresholds
create table if not exists rule_config (
  id integer primary key default 1 check (id = 1),
  favourite_max_odds numeric(4,2) default 1.50,
  max_minute_for_open integer default 60,
  confirmation_delay_seconds integer default 180,
  virtual_stake_gbp numeric(8,2) default 10.00,
  enabled boolean default true,
  updated_at timestamptz default now()
);

-- Insert default config
insert into rule_config (id) values (1) on conflict (id) do nothing;

-- Telegram alert destinations
create table if not exists alert_channels (
  id serial primary key,
  platform text not null default 'telegram' check (platform in ('telegram')),
  chat_id text not null,
  label text,
  active boolean default true,
  created_at timestamptz default now()
);

-- Secrets store for Edge Functions to read at runtime
create table if not exists lay_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Watched matches — fixtures with qualifying favourites
create table if not exists watched_matches (
  id serial primary key,
  fixture_api_id integer unique not null,
  league_id integer not null references monitored_leagues(api_football_id),
  home_team text not null,
  away_team text not null,
  favourite text not null check (favourite in ('home', 'away')),
  favourite_odds numeric(5,2) not null,
  kickoff_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'finished', 'postponed', 'cancelled')),
  match_minute integer,
  home_score integer default 0,
  away_score integer default 0,
  -- VAR delay tracking (wall-clock timestamps, NOT match minutes)
  fav_losing_since timestamptz,       -- set when favourite falls behind, cleared when not
  fav_levelled_since timestamptz,     -- set when favourite equalises after OPEN, cleared when not
  open_alert_fired boolean default false,
  close_alert_fired boolean default false,
  last_polled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_watched_matches_status on watched_matches(status);
create index if not exists idx_watched_matches_kickoff on watched_matches(kickoff_at);

-- Alerts — one per OPEN or CLOSE per fixture (dedup guarantee)
create table if not exists lay_alerts (
  id serial primary key,
  fixture_api_id integer not null references watched_matches(fixture_api_id),
  alert_type text not null check (alert_type in ('OPEN', 'CLOSE')),
  home_team text not null,
  away_team text not null,
  favourite text not null,
  score_at_alert text not null,       -- e.g. "0-1"
  match_minute_at_alert integer,
  odds_at_alert numeric(5,2),
  message_sent boolean default false,
  telegram_message_id integer,
  created_at timestamptz default now(),
  -- Only one OPEN and one CLOSE per fixture
  unique(fixture_api_id, alert_type)
);

create index if not exists idx_lay_alerts_fixture on lay_alerts(fixture_api_id);

-- Settlements — P&L for each OPEN alert, populated at match end
create table if not exists lay_settlements (
  id serial primary key,
  alert_id integer unique not null references lay_alerts(id),
  fixture_api_id integer not null references watched_matches(fixture_api_id),
  final_score text not null,          -- e.g. "2-1"
  favourite_won boolean not null,     -- did the favourite win?
  lay_result text not null check (lay_result in ('win', 'loss', 'void')),
  -- Lay bet P&L:
  --   If favourite lost or drew (lay wins): profit = stake
  --   If favourite won (lay loses): loss = stake * (odds - 1)
  stake_gbp numeric(8,2) not null,
  pnl_gbp numeric(8,2) not null,
  settled_at timestamptz default now()
);

create index if not exists idx_lay_settlements_fixture on lay_settlements(fixture_api_id);

-- P&L summary view
create or replace view lay_pnl_summary as
select
  count(*) as total_bets,
  count(*) filter (where lay_result = 'win') as wins,
  count(*) filter (where lay_result = 'loss') as losses,
  count(*) filter (where lay_result = 'void') as voids,
  coalesce(sum(pnl_gbp), 0) as net_pnl,
  coalesce(sum(stake_gbp), 0) as total_staked,
  case
    when sum(stake_gbp) > 0
    then round((sum(pnl_gbp) / sum(stake_gbp)) * 100, 1)
    else 0
  end as roi_pct,
  case
    when count(*) filter (where lay_result in ('win', 'loss')) > 0
    then round(
      count(*) filter (where lay_result = 'win')::numeric /
      count(*) filter (where lay_result in ('win', 'loss')) * 100, 1
    )
    else 0
  end as strike_rate
from lay_settlements;

-- RLS: keep all lay bot tables private (service_role only)
alter table monitored_leagues enable row level security;
alter table rule_config enable row level security;
alter table alert_channels enable row level security;
alter table lay_secrets enable row level security;
alter table watched_matches enable row level security;
alter table lay_alerts enable row level security;
alter table lay_settlements enable row level security;

-- No policies = no access via anon key. Only service_role bypasses RLS.

-- =============================================================================
-- Seed default monitored leagues (top 5 European leagues + UCL)
-- =============================================================================
insert into monitored_leagues (api_football_id, name, country, current_season) values
  (39,  'Premier League',   'England', 2025),
  (140, 'La Liga',          'Spain',   2025),
  (135, 'Serie A',          'Italy',   2025),
  (78,  'Bundesliga',       'Germany', 2025),
  (61,  'Ligue 1',          'France',  2025),
  (2,   'Champions League', 'Europe',  2025)
on conflict (api_football_id) do nothing;

-- =============================================================================
-- Enable Realtime for fixtures table (used by live score component)
-- =============================================================================
alter publication supabase_realtime add table fixtures;

-- =============================================================================
-- Lay bot cron jobs (uses 'tipora-lay-' prefix to avoid collision)
-- =============================================================================
-- BEFORE RUNNING: replace YOUR_EDGE_BASE_URL with your Supabase project's
-- Edge Function URL (e.g. https://abcdefg.supabase.co/functions/v1)
-- and YOUR_SERVICE_ROLE_KEY with your service role key.
-- =============================================================================

-- Schedule matches: every 30 minutes during the day (08:00-23:00 UTC)
-- select cron.schedule(
--   'tipora-lay-schedule',
--   '*/30 8-23 * * *',
--   $$
--   select net.http_post(
--     url := 'YOUR_EDGE_BASE_URL/schedule-matches',
--     headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb
--   )
--   $$
-- );

-- Poll live matches: every 60 seconds (CRITICAL: this is the hot path)
-- select cron.schedule(
--   'tipora-lay-poll',
--   '* * * * *',
--   $$
--   select net.http_post(
--     url := 'YOUR_EDGE_BASE_URL/poll-matches',
--     headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb
--   )
--   $$
-- );

-- Settle finished matches: every 5 minutes
-- select cron.schedule(
--   'tipora-lay-settle',
--   '*/5 * * * *',
--   $$
--   select net.http_post(
--     url := 'YOUR_EDGE_BASE_URL/settle-matches',
--     headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb
--   )
--   $$
-- );
