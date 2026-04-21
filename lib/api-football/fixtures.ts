import { apiFetch, getCurrentSeason } from './client';
import type { InsertFixture } from '@/types/fixture';

export interface APIFixtureResponse {
  fixture: { id: number; date: string; status: { short: string }; referee: string | null };
  league: { id: number; name?: string; country?: string; logo?: string; season?: number };
  teams: {
    home: { id: number; name: string; logo?: string };
    away: { id: number; name: string; logo?: string };
  };
  goals: { home: number | null; away: number | null };
  events?: Array<{
    time: { elapsed: number };
    team: { id: number };
    type: string;
    detail: string;
    player: { name: string };
  }>;
}

/**
 * Extract unique teams from a batch of fixtures for upserting to teams table.
 */
export function extractTeamsFromFixtures(fixtures: APIFixtureResponse[]): Array<{
  api_id: number;
  name: string;
  logo_url: string | null;
  country: string;
}> {
  const seen = new Map<number, { api_id: number; name: string; logo_url: string | null; country: string }>();
  for (const f of fixtures) {
    const country = f.league.country ?? 'Unknown';
    for (const side of [f.teams.home, f.teams.away]) {
      if (!seen.has(side.id)) {
        seen.set(side.id, {
          api_id: side.id,
          name: side.name,
          logo_url: side.logo ?? null,
          country,
        });
      }
    }
  }
  return Array.from(seen.values());
}

/**
 * Extract unique competitions from a batch of fixtures.
 */
export function extractCompetitionsFromFixtures(fixtures: APIFixtureResponse[]): Array<{
  api_id: number;
  name: string;
  country: string;
  logo_url: string | null;
  season_year: number;
  active: boolean;
}> {
  const seen = new Map<number, { api_id: number; name: string; country: string; logo_url: string | null; season_year: number; active: boolean }>();
  for (const f of fixtures) {
    if (!seen.has(f.league.id)) {
      seen.set(f.league.id, {
        api_id: f.league.id,
        name: f.league.name ?? `League ${f.league.id}`,
        country: f.league.country ?? 'Unknown',
        logo_url: f.league.logo ?? null,
        season_year: f.league.season ?? new Date().getFullYear(),
        active: true,
      });
    }
  }
  return Array.from(seen.values());
}

export async function fetchFixturesByDate(date: string, leagueId: number): Promise<APIFixtureResponse[]> {
  return apiFetch<APIFixtureResponse>('/fixtures', {
    league: String(leagueId),
    season: String(getCurrentSeason()),
    date,
  });
}

export function mapFixture(f: APIFixtureResponse): InsertFixture & { first_goal_team?: string; first_goal_minute?: number; first_goal_player?: string } {
  // Extract first goal from events
  let firstGoalTeam: string | undefined;
  let firstGoalMinute: number | undefined;
  let firstGoalPlayer: string | undefined;

  if (f.events?.length) {
    const goalEvent = f.events.find(e => e.type === 'Goal' && e.detail !== 'Missed Penalty');
    if (goalEvent) {
      firstGoalTeam = goalEvent.team.id === f.teams.home.id ? 'home' : 'away';
      firstGoalMinute = goalEvent.time.elapsed;
      firstGoalPlayer = goalEvent.player.name;
    }
  }

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
    first_goal_team: firstGoalTeam,
    first_goal_minute: firstGoalMinute,
    first_goal_player: firstGoalPlayer,
  };
}
