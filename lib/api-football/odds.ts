import { apiFetch } from './client';

interface APIOddsResponse {
  fixture: { id: number };
  bookmakers: Array<{
    id: number;
    name: string;
    bets: Array<{
      id: number;
      name: string;
      values: Array<{ value: string; odd: string }>;
    }>;
  }>;
}

const PREFERRED_BOOKMAKER_ID = 6; // Bet365

export async function fetchOddsForFixture(fixtureId: number): Promise<APIOddsResponse[]> {
  return apiFetch<APIOddsResponse>('/odds', {
    fixture: String(fixtureId),
    bookmaker: String(PREFERRED_BOOKMAKER_ID),
  });
}

export function extractDecimalOdds(
  oddsData: APIOddsResponse[],
  marketName: string,
  selection: string
): number | null {
  for (const resp of oddsData) {
    for (const bm of resp.bookmakers) {
      for (const bet of bm.bets) {
        if (bet.name.toLowerCase().includes(marketName.toLowerCase())) {
          const found = bet.values.find(v => v.value.toLowerCase() === selection.toLowerCase());
          if (found) return parseFloat(found.odd);
        }
      }
    }
  }
  return null;
}
