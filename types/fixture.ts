export interface Competition {
  id: number;
  api_id: number;
  name: string;
  country: string;
  logo_url: string | null;
  active: boolean;
  season_year: number;
}

export interface Team {
  id: number;
  api_id: number;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  country: string;
}

export interface Fixture {
  id: number;
  api_id: number;
  competition_id: number;
  home_team_id: number;
  away_team_id: number;
  referee_id: number | null;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_xg_avg?: number;
  away_xg_avg?: number;
  created_at: string;
  updated_at: string;
}

export interface InsertFixture {
  api_id: number;
  competition_id: number;
  home_team_id: number;
  away_team_id: number;
  referee_id: number | null;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

export interface Referee {
  id: number;
  api_id: number;
  name: string;
  avg_yellow_cards: number;
  avg_red_cards: number;
  avg_fouls: number;
  avg_booking_points: number;
  games_officiated: number;
  updated_at: string;
}

export const TRACKED_COMPETITIONS = {
  EPL:        { api_id: 39,  name: "Premier League",  country: "England" },
  LA_LIGA:    { api_id: 140, name: "La Liga",          country: "Spain"   },
  SERIE_A:    { api_id: 135, name: "Serie A",          country: "Italy"   },
  BUNDESLIGA: { api_id: 78,  name: "Bundesliga",       country: "Germany" },
  LIGUE_1:    { api_id: 61,  name: "Ligue 1",          country: "France"  },
  UCL:        { api_id: 2,   name: "Champions League", country: "Europe"  },
  UEL:        { api_id: 3,   name: "Europa League",    country: "Europe"  },
  WORLD_CUP:  { api_id: 1,   name: "World Cup",        country: "World"   },
} as const;

export type CompetitionKey = keyof typeof TRACKED_COMPETITIONS;
