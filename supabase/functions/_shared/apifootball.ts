/**
 * Typed API-Football client for Supabase Edge Functions (Deno).
 */

const API_BASE = 'https://v3.football.api-sports.io';

export interface FixtureLive {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string;  // NS, 1H, HT, 2H, FT, AET, PEN, PST, CANC, etc.
      elapsed: number | null;
    };
  };
  league: { id: number; name: string };
  teams: {
    home: { id: number; name: string; winner: boolean | null };
    away: { id: number; name: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
}

export interface OddsResponse {
  fixture: { id: number };
  bookmakers: Array<{
    id: number;
    bets: Array<{
      id: number;
      name: string;
      values: Array<{ value: string; odd: string }>;
    }>;
  }>;
}

export async function fetchFixturesByDate(
  apiKey: string,
  leagueId: number,
  season: number,
  date: string
): Promise<FixtureLive[]> {
  return apiFetch(apiKey, '/fixtures', {
    league: String(leagueId),
    season: String(season),
    date,
  });
}

export async function fetchLiveFixtures(
  apiKey: string,
  fixtureIds: number[]
): Promise<FixtureLive[]> {
  if (!fixtureIds.length) return [];
  // API-Football accepts comma-separated IDs (max ~20 per call)
  const ids = fixtureIds.join('-');
  return apiFetch(apiKey, '/fixtures', { ids });
}

export async function fetchFixtureById(
  apiKey: string,
  fixtureId: number
): Promise<FixtureLive | null> {
  const results = await apiFetch<FixtureLive>(apiKey, '/fixtures', {
    id: String(fixtureId),
  });
  return results[0] ?? null;
}

export async function fetchPreMatchOdds(
  apiKey: string,
  fixtureId: number
): Promise<OddsResponse[]> {
  return apiFetch(apiKey, '/odds', {
    fixture: String(fixtureId),
    bookmaker: '6', // Bet365
  });
}

/**
 * Extract 1X2 (Match Winner) odds and determine the favourite.
 * Returns null if no clear favourite (both > maxOdds).
 */
export function extractFavourite(
  oddsData: OddsResponse[],
  maxOdds: number
): { side: 'home' | 'away'; odds: number } | null {
  for (const resp of oddsData) {
    for (const bm of resp.bookmakers) {
      for (const bet of bm.bets) {
        if (bet.name === 'Match Winner' || bet.name === 'Home/Away') {
          const homeOdd = bet.values.find(v => v.value === 'Home');
          const awayOdd = bet.values.find(v => v.value === 'Away');
          const homeVal = homeOdd ? parseFloat(homeOdd.odd) : 99;
          const awayVal = awayOdd ? parseFloat(awayOdd.odd) : 99;

          if (homeVal <= maxOdds && homeVal < awayVal) {
            return { side: 'home', odds: homeVal };
          }
          if (awayVal <= maxOdds && awayVal < homeVal) {
            return { side: 'away', odds: awayVal };
          }
        }
      }
    }
  }
  return null;
}

async function apiFetch<T>(
  apiKey: string,
  endpoint: string,
  params: Record<string, string>
): Promise<T[]> {
  const url = new URL(`${API_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': apiKey },
  });

  if (!res.ok) {
    throw new Error(`API-Football ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.response as T[];
}
