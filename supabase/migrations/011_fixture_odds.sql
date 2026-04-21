-- =============================================================================
-- Fixture odds — cached from API-Football per bookmaker, per market, per selection
-- =============================================================================

create table if not exists fixture_odds (
  id serial primary key,
  fixture_id integer not null references fixtures(id) on delete cascade,
  bookmaker text not null,
  market text not null,          -- 'Over/Under', 'Both Teams Score', 'Match Winner', etc.
  selection text not null,       -- 'Over 2.5', 'Yes', 'Home', 'Draw', etc.
  odds numeric(6,2) not null,
  created_at timestamptz default now(),
  unique(fixture_id, bookmaker, market, selection)
);

create index if not exists idx_fixture_odds_fixture on fixture_odds(fixture_id);
create index if not exists idx_fixture_odds_market on fixture_odds(fixture_id, market, selection);

alter table fixture_odds enable row level security;

-- Public can read odds (for display) but not write
create policy "Anyone can view fixture odds"
  on fixture_odds for select
  to anon, authenticated
  using (true);
