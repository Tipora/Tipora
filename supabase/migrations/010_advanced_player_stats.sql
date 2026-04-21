-- =============================================================================
-- Advanced player stats — xA, crosses, aerial duels, big chances missed
-- =============================================================================

alter table player_match_stats add column if not exists expected_assists numeric(4,2) default 0;
alter table player_match_stats add column if not exists progressive_carries integer default 0;
alter table player_match_stats add column if not exists crosses_total integer default 0;
alter table player_match_stats add column if not exists crosses_completed integer default 0;
alter table player_match_stats add column if not exists big_chances_missed integer default 0;
alter table player_match_stats add column if not exists aerial_duels_won integer default 0;
alter table player_match_stats add column if not exists saves integer default 0;  -- for goalkeepers
alter table player_match_stats add column if not exists tackles integer default 0;
alter table player_match_stats add column if not exists interceptions integer default 0;
alter table player_match_stats add column if not exists blocks integer default 0;
alter table player_match_stats add column if not exists goal_minute integer;       -- minute of first goal scored (null if didn't score)
