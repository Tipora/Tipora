import { apiFetch } from './client';

/**
 * Response shape of /fixtures/statistics?fixture=X
 * Top-level array of teams, each with a statistics array.
 */
interface APITeamStatsResponse {
  team: { id: number; name: string };
  statistics: Array<{
    type: string;   // e.g. "Shots on Goal", "Total Shots", "Corner Kicks", "Fouls", "Yellow Cards", "Red Cards", "ball Possession", "Offsides", "Goalkeeper Saves", "expected_goals"
    value: number | string | null;
  }>;
}

export async function fetchTeamStatsByFixture(fixtureId: number): Promise<APITeamStatsResponse[]> {
  return apiFetch<APITeamStatsResponse>('/fixtures/statistics', {
    fixture: String(fixtureId),
  });
}

export interface TeamMatchStatRow {
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
  offsides: number;
  goalkeeper_saves: number;
  shots_inside_box: number;
  shots_outside_box: number;
  big_chances_missed: number;
}

/**
 * Parse API-Football team stats response into a row per team.
 * Stat type names can vary — we map the common ones.
 */
export function parseTeamStats(
  response: APITeamStatsResponse[],
  fixtureDbId: number
): TeamMatchStatRow[] {
  // Build an xG lookup first so we can populate xg_against as the opponent's xg
  const byTeamId = new Map<number, APITeamStatsResponse>();
  for (const team of response) byTeamId.set(team.team.id, team);

  const xgByTeamId = new Map<number, number>();
  for (const team of response) {
    const xg = findStat(team.statistics, ['expected_goals', 'Expected Goals']);
    xgByTeamId.set(team.team.id, toNumber(xg) ?? 0);
  }

  const rows: TeamMatchStatRow[] = [];

  for (const team of response) {
    const s = team.statistics;
    const ownXg = xgByTeamId.get(team.team.id) ?? 0;
    const oppXg = Array.from(xgByTeamId.entries())
      .find(([tid]) => tid !== team.team.id)?.[1] ?? 0;

    // Possession comes as "52%" — strip the percent sign
    const possessionRaw = findStat(s, ['Ball Possession', 'ball Possession']);
    const possession = possessionRaw
      ? parseInt(String(possessionRaw).replace('%', ''), 10) || 0
      : 0;

    rows.push({
      team_id: team.team.id,
      fixture_id: fixtureDbId,
      possession,
      shots: toNumber(findStat(s, ['Total Shots', 'Shots total'])) ?? 0,
      shots_on_target: toNumber(findStat(s, ['Shots on Goal', 'Shots on target'])) ?? 0,
      corners: toNumber(findStat(s, ['Corner Kicks', 'Corners'])) ?? 0,
      fouls: toNumber(findStat(s, ['Fouls'])) ?? 0,
      yellow_cards: toNumber(findStat(s, ['Yellow Cards'])) ?? 0,
      red_cards: toNumber(findStat(s, ['Red Cards'])) ?? 0,
      xg: ownXg || null,
      xg_against: oppXg || null,
      offsides: toNumber(findStat(s, ['Offsides'])) ?? 0,
      goalkeeper_saves: toNumber(findStat(s, ['Goalkeeper Saves'])) ?? 0,
      shots_inside_box: toNumber(findStat(s, ['Shots insidebox', 'Shots inside box'])) ?? 0,
      shots_outside_box: toNumber(findStat(s, ['Shots outsidebox', 'Shots outside box'])) ?? 0,
      big_chances_missed: toNumber(findStat(s, ['Big chances missed', 'Big Chances Missed'])) ?? 0,
    });
  }

  return rows;
}

function findStat(stats: APITeamStatsResponse['statistics'], names: string[]): number | string | null {
  for (const name of names) {
    const entry = stats.find(s => s.type === name);
    if (entry && entry.value != null) return entry.value;
  }
  return null;
}

function toNumber(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace('%', ''));
  return isNaN(n) ? null : n;
}
