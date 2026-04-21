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
  // Advanced
  expected_assists?: number;
  progressive_carries?: number;
  crosses_total?: number;
  crosses_completed?: number;
  big_chances_missed?: number;
  aerial_duels_won?: number;
  saves?: number;
  tackles?: number;
  interceptions?: number;
  blocks?: number;
  goal_minute?: number | null;
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
  // Advanced
  fouls_first_half?: number;
  fouls_second_half?: number;
  cards_first_half?: number;
  cards_second_half?: number;
  shots_inside_box?: number;
  shots_outside_box?: number;
  offsides?: number;
  aerial_duels_won?: number;
  goalkeeper_saves?: number;
  big_chances?: number;
  big_chances_missed?: number;
  created_at: string;
}
