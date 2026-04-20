import { createSafeServerClient } from '@/lib/supabase/safe-client';
import { todayUTC } from '@/lib/utils/dates';
import Link from 'next/link';
import { formatKickoff } from '@/lib/utils/dates';

export const dynamic = 'force-dynamic';

export default async function FixturesPage() {
  const supabase = await createSafeServerClient();
  const date = todayUTC();

  let fixtures: Array<Record<string, unknown>> = [];
  if (supabase) {
    const { data } = await supabase
      .from('fixtures')
      .select('id, kickoff_at, status, home_score, away_score, home_team:teams!fixtures_home_team_id_fkey(name), away_team:teams!fixtures_away_team_id_fkey(name), competitions(name)')
      .gte('kickoff_at', `${date}T00:00:00`)
      .lte('kickoff_at', `${date}T23:59:59`)
      .order('kickoff_at', { ascending: true });
    fixtures = (data ?? []) as Array<Record<string, unknown>>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Today&apos;s Fixtures</h1>
        <p className="mt-1 text-sm text-zinc-500">Click a match to see its top 10 tips and analysis</p>
      </div>

      {fixtures.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 py-16 text-center">
          <p className="text-zinc-500">No fixtures today.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fixtures.map(f => {
            const home = (f.home_team as Record<string, string>)?.name ?? 'Home';
            const away = (f.away_team as Record<string, string>)?.name ?? 'Away';
            const league = (f.competitions as Record<string, string>)?.name ?? '';
            const status = f.status as string;
            const kickoff = f.kickoff_at as string;

            return (
              <Link
                key={f.id as number}
                href={`/fixtures/${f.id}`}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-600"
              >
                <div className="flex-1">
                  <p className="text-xs text-zinc-500">{league} &middot; {formatKickoff(kickoff)}</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {home} <span className="text-zinc-600">vs</span> {away}
                  </p>
                </div>
                <div className="text-right">
                  {status === 'FT' ? (
                    <p className="text-lg font-bold text-emerald-400">{f.home_score as number} - {f.away_score as number}</p>
                  ) : (
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                      View tips
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
