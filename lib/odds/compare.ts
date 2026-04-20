import { apiFetch } from '@/lib/api-football/client';

interface BookmakerOdds {
  name: string;
  odds: number;
  url: string;
}

const BOOKMAKER_URLS: Record<string, string> = {
  'Bet365': 'https://www.bet365.com',
  'William Hill': 'https://www.williamhill.com',
  '1xBet': 'https://www.1xbet.com',
  'Unibet': 'https://www.unibet.com',
  '888sport': 'https://www.888sport.com',
  'Betway': 'https://www.betway.com',
  'Bwin': 'https://www.bwin.com',
  'Betfair': 'https://www.betfair.com',
};

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

export async function getOddsComparison(
  fixtureApiId: number,
  marketName: string,
  selection: string
): Promise<BookmakerOdds[]> {
  try {
    const data = await apiFetch<APIOddsResponse>('/odds', {
      fixture: String(fixtureApiId),
    });

    const results: BookmakerOdds[] = [];

    for (const resp of data) {
      for (const bm of resp.bookmakers) {
        for (const bet of bm.bets) {
          if (!bet.name.toLowerCase().includes(marketName.toLowerCase())) continue;
          const found = bet.values.find(v => v.value.toLowerCase() === selection.toLowerCase());
          if (found) {
            results.push({
              name: bm.name,
              odds: parseFloat(found.odd),
              url: BOOKMAKER_URLS[bm.name] ?? '#',
            });
          }
        }
      }
    }

    return results.sort((a, b) => b.odds - a.odds).slice(0, 6);
  } catch {
    return [];
  }
}

/**
 * Generate estimated odds from multiple bookmakers for demo/fallback.
 * Simulates slight variation around a base odds value.
 */
export function estimateMultiBookmakerOdds(baseOdds: number): BookmakerOdds[] {
  const bookmakers = ['Bet365', 'William Hill', '888sport', 'Unibet', 'Betfair', 'Betway'];
  return bookmakers.map(name => ({
    name,
    odds: +(baseOdds + (Math.random() - 0.5) * 0.3).toFixed(2),
    url: BOOKMAKER_URLS[name] ?? '#',
  })).sort((a, b) => b.odds - a.odds);
}
