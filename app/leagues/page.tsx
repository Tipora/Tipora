import { createSafeServerClient } from '@/lib/supabase/safe-client';
import { TRACKED_COMPETITIONS } from '@/types/fixture';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface TeamStanding {
  teamId: number;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

async function getLeagueTable(competitionApiId: number, supabase: NonNullable<Awaited<ReturnType<typeof createSafeServerClient>>>): Promise<TeamStanding[]> {
  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('home_team_id, away_team_id, home_score, away_score')
    .eq('competition_id', competitionApiId)
    .eq('status', 'FT');

  if (!fixtures?.length) return [];

  // Get team names
  const teamIds = new Set<number>();
  fixtures.forEach(f => { teamIds.add(f.home_team_id); teamIds.add(f.away_team_id); });
  const { data: teams } = await supabase
    .from('teams')
    .select('api_id, name')
    .in('api_id', Array.from(teamIds));
  const nameMap = new Map((teams ?? []).map(t => [t.api_id, t.name]));

  // Compute standings
  const standings = new Map<number, TeamStanding>();
  for (const f of fixtures) {
    for (const side of ['home', 'away'] as const) {
      const teamId = side === 'home' ? f.home_team_id : f.away_team_id;
      const gf = side === 'home' ? (f.home_score ?? 0) : (f.away_score ?? 0);
      const ga = side === 'home' ? (f.away_score ?? 0) : (f.home_score ?? 0);

      const existing = standings.get(teamId) ?? {
        teamId, teamName: nameMap.get(teamId) ?? `Team ${teamId}`,
        played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0,
      };

      existing.played++;
      existing.gf += gf;
      existing.ga += ga;
      existing.gd = existing.gf - existing.ga;

      if (gf > ga) { existing.won++; existing.points += 3; }
      else if (gf === ga) { existing.drawn++; existing.points += 1; }
      else { existing.lost++; }

      standings.set(teamId, existing);
    }
  }

  return Array.from(standings.values()).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
}

export default async function LeaguesPage() {
  const supabase = await createSafeServerClient();

  const leagues = Object.entries(TRACKED_COMPETITIONS).map(([key, val]) => ({
    key,
    ...val,
  }));

  let tables: Record<string, TeamStanding[]> = {};
  if (supabase) {
    const results = await Promise.all(
      leagues.map(async league => ({
        key: league.key,
        table: await getLeagueTable(league.api_id, supabase),
      }))
    );
    tables = Object.fromEntries(results.map(r => [r.key, r.table]));
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">League Tables</h1>
        <p className="mt-1 text-sm text-zinc-500">Standings computed from our fixture data</p>
      </div>

      <div className="space-y-10">
        {leagues.map(league => {
          const table = tables[league.key] ?? [];
          if (!table.length) return null;

          return (
            <div key={league.key}>
              <h2 className="mb-3 text-lg font-semibold text-white">{league.name}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700 text-[10px] uppercase text-zinc-500">
                      <th className="pb-2 pr-2 w-6">#</th>
                      <th className="pb-2 pr-4">Team</th>
                      <th className="pb-2 pr-2 text-center">P</th>
                      <th className="pb-2 pr-2 text-center">W</th>
                      <th className="pb-2 pr-2 text-center">D</th>
                      <th className="pb-2 pr-2 text-center">L</th>
                      <th className="pb-2 pr-2 text-center">GF</th>
                      <th className="pb-2 pr-2 text-center">GA</th>
                      <th className="pb-2 pr-2 text-center">GD</th>
                      <th className="pb-2 text-center font-bold">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.map((team, i) => (
                      <tr key={team.teamId} className="border-b border-zinc-800">
                        <td className="py-1.5 pr-2 text-zinc-500 tabular-nums">{i + 1}</td>
                        <td className="py-1.5 pr-4 font-medium text-white">
                          <Link href={`/players?team=${team.teamId}`} className="hover:text-emerald-400">{team.teamName}</Link>
                        </td>
                        <td className="py-1.5 pr-2 text-center tabular-nums text-zinc-400">{team.played}</td>
                        <td className="py-1.5 pr-2 text-center tabular-nums text-zinc-400">{team.won}</td>
                        <td className="py-1.5 pr-2 text-center tabular-nums text-zinc-400">{team.drawn}</td>
                        <td className="py-1.5 pr-2 text-center tabular-nums text-zinc-400">{team.lost}</td>
                        <td className="py-1.5 pr-2 text-center tabular-nums text-zinc-400">{team.gf}</td>
                        <td className="py-1.5 pr-2 text-center tabular-nums text-zinc-400">{team.ga}</td>
                        <td className={`py-1.5 pr-2 text-center tabular-nums ${team.gd >= 0 ? 'text-green-400' : 'text-red-400'}`}>{team.gd > 0 ? '+' : ''}{team.gd}</td>
                        <td className="py-1.5 text-center tabular-nums font-bold text-white">{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
