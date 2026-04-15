import { apiFetch } from './client';

interface APIPlayerStatResponse {
  player: { id: number; name: string; nationality: string; photo: string };
  statistics: Array<{
    team: { id: number };
    games: { minutes: number | null; position: string };
    goals: { total: number | null; assists: number | null };
    fouls: { committed: number | null; drawn: number | null };
    cards: { yellow: number | null; red: number | null };
    shots: { total: number | null; on: number | null };
    passes: { total: number | null; accuracy: string | null };
    dribbles: { attempts: number | null };
    duels: { won: number | null };
  }>;
}

export async function fetchPlayerStatsByFixture(fixtureId: number): Promise<APIPlayerStatResponse[]> {
  return apiFetch<APIPlayerStatResponse>('/players', {
    fixture: String(fixtureId),
  });
}

export function mapPlayerStat(p: APIPlayerStatResponse, fixtureId: number) {
  const s = p.statistics[0];
  if (!s) return null;
  return {
    player_api_id: p.player.id,
    player_name: p.player.name,
    nationality: p.player.nationality,
    photo_url: p.player.photo,
    team_id: s.team.id,
    position: s.games.position,
    fixture_id: fixtureId,
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
    dribbles: s.dribbles.attempts ?? 0,
    duels_won: s.duels.won ?? 0,
    corners_taken: 0,
  };
}
