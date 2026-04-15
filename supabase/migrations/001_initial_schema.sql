-- Tipora Initial Schema

CREATE TABLE IF NOT EXISTS competitions (
  id SERIAL PRIMARY KEY,
  api_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  logo_url TEXT,
  active BOOLEAN DEFAULT true,
  season_year INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  api_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  logo_url TEXT,
  country TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS referees (
  id SERIAL PRIMARY KEY,
  api_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avg_yellow_cards NUMERIC(4,2) DEFAULT 0,
  avg_red_cards NUMERIC(4,2) DEFAULT 0,
  avg_fouls NUMERIC(4,2) DEFAULT 0,
  avg_booking_points NUMERIC(5,2) DEFAULT 0,
  games_officiated INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  api_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  team_id INTEGER REFERENCES teams(api_id),
  position TEXT,
  nationality TEXT,
  photo_url TEXT
);

CREATE TABLE IF NOT EXISTS fixtures (
  id SERIAL PRIMARY KEY,
  api_id INTEGER UNIQUE NOT NULL,
  competition_id INTEGER REFERENCES competitions(api_id),
  home_team_id INTEGER REFERENCES teams(api_id),
  away_team_id INTEGER REFERENCES teams(api_id),
  referee_id INTEGER REFERENCES referees(id),
  kickoff_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'NS',
  home_score INTEGER,
  away_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS player_match_stats (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL,
  fixture_id INTEGER NOT NULL REFERENCES fixtures(id),
  team_id INTEGER NOT NULL,
  minutes_played INTEGER DEFAULT 0,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  fouls_committed INTEGER DEFAULT 0,
  fouls_drawn INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  shots INTEGER DEFAULT 0,
  shots_on_target INTEGER DEFAULT 0,
  passes INTEGER DEFAULT 0,
  pass_accuracy NUMERIC(5,2) DEFAULT 0,
  dribbles INTEGER DEFAULT 0,
  duels_won INTEGER DEFAULT 0,
  corners_taken INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, fixture_id)
);

CREATE TABLE IF NOT EXISTS team_match_stats (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL,
  fixture_id INTEGER NOT NULL REFERENCES fixtures(id),
  possession NUMERIC(5,2) DEFAULT 0,
  shots INTEGER DEFAULT 0,
  shots_on_target INTEGER DEFAULT 0,
  corners INTEGER DEFAULT 0,
  fouls INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  xg NUMERIC(4,2),
  xg_against NUMERIC(4,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, fixture_id)
);

CREATE TABLE IF NOT EXISTS player_trends (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL,
  stat_type TEXT NOT NULL,
  streak_count INTEGER DEFAULT 0,
  last_n_games JSONB,
  avg_last_5 NUMERIC(6,3) DEFAULT 0,
  avg_last_10 NUMERIC(6,3) DEFAULT 0,
  home_avg NUMERIC(6,3) DEFAULT 0,
  away_avg NUMERIC(6,3) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, stat_type)
);

CREATE TABLE IF NOT EXISTS team_trends (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL,
  stat_type TEXT NOT NULL,
  streak_count INTEGER DEFAULT 0,
  hit_rate_last_10 NUMERIC(4,3) DEFAULT 0,
  home_hit_rate NUMERIC(4,3) DEFAULT 0,
  away_hit_rate NUMERIC(4,3) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, stat_type)
);

CREATE TABLE IF NOT EXISTS head_to_head (
  id SERIAL PRIMARY KEY,
  team_a_id INTEGER NOT NULL,
  team_b_id INTEGER NOT NULL,
  stat_type TEXT NOT NULL,
  hit_rate_last_10 NUMERIC(4,3) DEFAULT 0,
  avg_value_last_10 NUMERIC(6,3) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_a_id, team_b_id, stat_type)
);

CREATE TABLE IF NOT EXISTS tips (
  id SERIAL PRIMARY KEY,
  fixture_id INTEGER NOT NULL REFERENCES fixtures(id),
  market_type TEXT NOT NULL,
  selection TEXT NOT NULL,
  odds NUMERIC(6,2) NOT NULL,
  confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
  confidence_breakdown JSONB NOT NULL,
  reasons JSONB NOT NULL DEFAULT '[]',
  acca_eligible BOOLEAN DEFAULT true,
  acca_type TEXT CHECK (acca_type IN ('game', 'weekend')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'void')),
  tip_date DATE NOT NULL,
  settled_at TIMESTAMPTZ,
  stake INTEGER NOT NULL DEFAULT 1000,
  return_amount INTEGER,
  pl INTEGER,
  tag TEXT NOT NULL CHECK (tag IN ('BANKER', 'VALUE', 'BOLD', 'LONGSHOT')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accumulators (
  id SERIAL PRIMARY KEY,
  acca_type TEXT NOT NULL CHECK (acca_type IN ('game', 'weekend')),
  tip_ids JSONB NOT NULL,
  combined_odds NUMERIC(8,2) NOT NULL,
  stake INTEGER NOT NULL DEFAULT 1000,
  potential_return INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'void')),
  acca_date DATE NOT NULL,
  pl INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pl_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('day', 'week', 'month', 'season', 'all_time')),
  total_staked INTEGER DEFAULT 0,
  total_return INTEGER DEFAULT 0,
  pl INTEGER DEFAULT 0,
  roi_pct NUMERIC(6,2) DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  voids INTEGER DEFAULT 0,
  acca_pl INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_fixtures_date ON fixtures(kickoff_at);
CREATE INDEX IF NOT EXISTS idx_fixtures_status ON fixtures(status);
CREATE INDEX IF NOT EXISTS idx_tips_date ON tips(tip_date);
CREATE INDEX IF NOT EXISTS idx_tips_status ON tips(status);
CREATE INDEX IF NOT EXISTS idx_player_match_stats_player ON player_match_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_trends_player ON player_trends(player_id);
CREATE INDEX IF NOT EXISTS idx_team_trends_team ON team_trends(team_id);
CREATE INDEX IF NOT EXISTS idx_accumulators_date ON accumulators(acca_date);

-- Cron schedules (run via Supabase pg_cron)
-- SELECT cron.schedule('daily-fixtures',  '0 6 * * *',   'SELECT net.http_post(...)');
-- SELECT cron.schedule('trend-recalc',    '0 2 * * *',   'SELECT net.http_post(...)');
-- SELECT cron.schedule('tip-generation',  '0 7 * * *',   'SELECT net.http_post(...)');
-- SELECT cron.schedule('game-acca',       '30 7 * * *',  'SELECT net.http_post(...)');
-- SELECT cron.schedule('weekend-acca',    '0 8 * * 1',   'SELECT net.http_post(...)');
-- SELECT cron.schedule('settle-tips',     '0 */2 * * *', 'SELECT net.http_post(...)');
