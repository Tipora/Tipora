-- =============================================================================
-- Time period stats — goals by time bucket, fouls/cards by half
-- =============================================================================

-- Store goals by time bucket on each fixture as JSONB
-- e.g. { "0-15": 1, "16-30": 0, "31-45": 2, "46-60": 0, "61-75": 1, "76-90": 0 }
alter table fixtures add column if not exists goals_by_period jsonb;

-- Half-based stats on team_match_stats
alter table team_match_stats add column if not exists fouls_first_half integer default 0;
alter table team_match_stats add column if not exists fouls_second_half integer default 0;
alter table team_match_stats add column if not exists cards_first_half integer default 0;
alter table team_match_stats add column if not exists cards_second_half integer default 0;

-- Advanced team shooting stats
alter table team_match_stats add column if not exists shots_inside_box integer default 0;
alter table team_match_stats add column if not exists shots_outside_box integer default 0;
alter table team_match_stats add column if not exists offsides integer default 0;
alter table team_match_stats add column if not exists aerial_duels_won integer default 0;
alter table team_match_stats add column if not exists goalkeeper_saves integer default 0;
alter table team_match_stats add column if not exists big_chances integer default 0;
alter table team_match_stats add column if not exists big_chances_missed integer default 0;
