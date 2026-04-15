export interface Player {
  id: number;
  api_id: number;
  name: string;
  team_id: number;
  position: string;
  nationality: string;
  photo_url: string | null;
}

export interface PlayerMatchStat {
  id: number;
  player_id: number;
  fixture_id: number;
  team_id: number;
  minutes_played: number;
  goals: number;
  assists: number;
  fouls_committed: number;
  fouls_drawn: number;
  yellow_cards: number;
  red_cards: number;
  shots: number;
  shots_on_target: number;
  passes: number;
  pass_accuracy: number;
  dribbles: number;
  duels_won: number;
  corners_taken: number;
  created_at: string;
}

export interface TeamMatchStat {
  id: number;
  team_id: number;
  fixture_id: number;
  possession: number;
  shots: number;
  shots_on_target: number;
  corners: number;
  fouls: number;
  yellow_cards: number;
  red_cards: number;
  xg: number | null;
  xg_against: number | null;
  created_at: string;
}
