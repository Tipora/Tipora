import { apiFetch } from './client';
import type { InsertFixture } from '@/types/fixture';

interface APIFixtureResponse {
  fixture: { id: number; date: string; status: { short: string }; referee: string | null };
  league: { id: number };
  teams: { home: { id: number }; away: { id: number } };
  goals: { home: number | null; away: number | null };
}

export async function fetchFixturesByDate(date: string, leagueId: number): Promise<APIFixtureResponse[]> {
  return apiFetch<APIFixtureResponse>('/fixtures', {
    league: String(leagueId),
    season: '2025',
    date,
  });
}

export function mapFixture(f: APIFixtureResponse): InsertFixture {
  return {
    api_id: f.fixture.id,
    competition_id: f.league.id,
    home_team_id: f.teams.home.id,
    away_team_id: f.teams.away.id,
    referee_id: null,
    kickoff_at: f.fixture.date,
    status: f.fixture.status.short,
    home_score: f.goals.home,
    away_score: f.goals.away,
  };
}
