import { createSafeServerClient } from '@/lib/supabase/safe-client';
import Link from 'next/link';
import { formatKickoff } from '@/lib/utils/dates';

export const dynamic = 'force-dynamic';

export default async function FixturesPage() {
  const supabase = await createSafeServerClient();

  // Show next 7 days of fixtures, grouped by date
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 6);
  const todayStr = today.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  let fixtures: Array<Record<string, unknown>> = [];
  if (supabase) {
    const { data } = await supabase
      .from('fixtures')
      .select('id, kickoff_at, status, home_score, away_score, home_team:teams!fixtures_home_team_id_fkey(name), away_team:teams!fixtures_away_team_id_fkey(name), competitions(name)')
      .gte('kickoff_at', `${todayStr}T00:00:00`)
      .lte('kickoff_at', `${endStr}T23:59:59`)
      .order('kickoff_at', { ascending: true });
    fixtures = (data ?? []) as Array<Record<string, unknown>>;
  }

  // Group by date
  const grouped = new Map<string, typeof fixtures>();
  for (const f of fixtures) {
    const dateKey = new Date(f.kickoff_at as string).toISOString().split('T')[0];
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(f);
  }

  const dateLabel = (iso: string) => {
    const d = new Date(iso + 'T12:00:00Z');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((d.getTime() - today.getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Fixtures</h1>
        <p className="mt-1 text-sm text-zinc-500">Next 7 days — click a match for top 10 tips and analysis</p>
      </div>

      {fixtures.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 py-16 text-center">
          <p className="text-zinc-500">No fixtures in the next 7 days.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([date, dayFixtures]) => (
            <div key={date}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                {dateLabel(date)} <span className="text-zinc-600">· {dayFixtures.length} {dayFixtures.length === 1 ? 'match' : 'matches'}</span>
              </h2>
              <div className="space-y-2">
                {dayFixtures.map(f => {
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
