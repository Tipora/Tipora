-- =============================================================================
-- Referee penalties + fouls tracking
-- =============================================================================

-- Add penalties column to referees (fouls already exists)
alter table referees add column if not exists avg_penalties numeric(4,2) default 0;

-- Track penalties per fixture (derived from match events)
alter table fixtures add column if not exists penalty_count integer default 0;
