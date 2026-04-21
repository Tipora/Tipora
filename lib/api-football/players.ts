import { apiFetch } from './client';

/**
 * Response shape of /fixtures/players?fixture=X
 * Top-level response is an array of teams, each containing a players array.
 */
interface APIFixturePlayersResponse {
  team: { id: number; name: string; logo: string };
  players: Array<{
    player: { id: number; name: string; photo: string };
    statistics: Array<{
      games: { minutes: number | null; position: string | null; rating: string | null };
      goals: { total: number | null; assists: number | null };
      fouls: { committed: number | null; drawn: number | null };
      cards: { yellow: number | null; red: number | null };
      shots: { total: number | null; on: number | null };
      passes: { total: number | null; accuracy: string | null };
      dribbles: { attempts: number | null; success: number | null };
      duels: { total: number | null; won: number | null };
      tackles: { total: number | null; blocks: number | null; interceptions: number | null };
      offsides: number | null;
    }>;
  }>;
}

export async function fetchPlayerStatsByFixture(fixtureId: number): Promise<APIFixturePlayersResponse[]> {
  return apiFetch<APIFixturePlayersResponse>('/fixtures/players', {
    fixture: String(fixtureId),
  });
}

export interface FlattenedPlayerStat {
  player_api_id: number;
  player_name: string;
  nationality: string;
  photo_url: string;
  team_id: number;
  position: string;
  fixture_id: number;
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
  tackles: number;
  interceptions: number;
  blocks: number;
  offsides: number;
}

/**
 * Flatten a /fixtures/players response into per-player stat rows.
 * Each team has multiple players; each player has a single statistics entry.
 */
export function flattenFixturePlayers(
  response: APIFixturePlayersResponse[],
  fixtureDbId: number
): FlattenedPlayerStat[] {
  const rows: FlattenedPlayerStat[] = [];

  for (const teamBlock of response) {
    for (const playerBlock of teamBlock.players) {
      const s = playerBlock.statistics[0];
      if (!s) continue;

      rows.push({
        player_api_id: playerBlock.player.id,
        player_name: playerBlock.player.name,
        nationality: '', // not provided in this endpoint
        photo_url: playerBlock.player.photo ?? '',
        team_id: teamBlock.team.id,
        position: s.games.position ?? '',
        fixture_id: fixtureDbId,
        minutes_played: s.games.minutes ?? 0,
        goals: s.goals.total ?? 0,
        assists: s.goals.assists ?? 0,
        fouls_committed: s.fouls.committed ?? 0,
        fouls_drawn: s.fouls.drawn ?? 0,
        yellow_cards: s.cards.yellow ?? 0,
        red_cards: s.cards.red ?? 0,
        shots: s.shots.total ?? 0,
        shots_on_target: s.shots.on ?? 0,
        passes: s.passes.total ?? 0,
        pass_accuracy: parseFloat(s.passes.accuracy ?? '0') || 0,
        dribbles: s.dribbles.success ?? 0,
        duels_won: s.duels.won ?? 0,
        corners_taken: 0,
        // Advanced
        tackles: s.tackles.total ?? 0,
        interceptions: s.tackles.interceptions ?? 0,
        blocks: s.tackles.blocks ?? 0,
        offsides: s.offsides ?? 0,
      });
    }
  }

  return rows;
}

/** @deprecated — kept for backward compat with any old callers. */
export function mapPlayerStat(): null {
  return null;
}
