-- First goal tracking columns on fixtures
alter table fixtures add column if not exists first_goal_team text check (first_goal_team in ('home', 'away'));
alter table fixtures add column if not exists first_goal_minute integer;
alter table fixtures add column if not exists first_goal_player text;

-- Team first-goal stats (aggregated)
create table if not exists team_first_goal_stats (
  id serial primary key,
  team_id integer not null,
  -- As home
  home_scored_first_pct numeric(5,2) default 0,  -- % of home games where this team scored first
  home_conceded_first_pct numeric(5,2) default 0,
  home_avg_first_goal_minute numeric(5,1) default 0,
  home_games_sampled integer default 0,
  -- As away
  away_scored_first_pct numeric(5,2) default 0,
  away_conceded_first_pct numeric(5,2) default 0,
  away_avg_first_goal_minute numeric(5,1) default 0,
  away_games_sampled integer default 0,
  -- Overall
  scored_first_win_pct numeric(5,2) default 0,   -- when this team scores first, % they go on to win
  conceded_first_win_pct numeric(5,2) default 0,  -- when they concede first, % they recover to win
  updated_at timestamptz default now(),
  unique(team_id)
);

create index if not exists idx_team_first_goal_team on team_first_goal_stats(team_id);

alter table team_first_goal_stats enable row level security;
