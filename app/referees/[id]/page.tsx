import { createSafeServerClient } from '@/lib/supabase/safe-client';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { formatKickoff } from '@/lib/utils/dates';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSafeServerClient();
  if (!supabase) return { title: 'Referee — Tipora' };
  const { data } = await supabase.from('referees').select('name').eq('id', parseInt(id)).single();
  return { title: `${data?.name ?? 'Referee'} — Tipora` };
}

export default async function RefereePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const refId = parseInt(id, 10);
  if (isNaN(refId)) redirect('/referees');

  const supabase = await createSafeServerClient();
  if (!supabase) redirect('/referees');

  const { data: ref } = await supabase
    .from('referees')
    .select('*')
    .eq('id', refId)
    .single();

  if (!ref) redirect('/referees');

  // Upcoming fixtures officiated by this referee
  const { data: upcomingFixtures } = await supabase
    .from('fixtures')
    .select('id, kickoff_at, status, home_team:teams!fixtures_home_team_id_fkey(name), away_team:teams!fixtures_away_team_id_fkey(name), competitions(name)')
    .eq('referee_id', refId)
    .eq('status', 'NS')
    .order('kickoff_at', { ascending: true })
    .limit(20);

  // Recent finished fixtures
  const { data: recentFixtures } = await supabase
    .from('fixtures')
    .select('id, kickoff_at, status, home_score, away_score, penalty_count, home_team:teams!fixtures_home_team_id_fkey(name), away_team:teams!fixtures_away_team_id_fkey(name), competitions(name)')
    .eq('referee_id', refId)
    .eq('status', 'FT')
    .order('kickoff_at', { ascending: false })
    .limit(10);

  const upcoming = (upcomingFixtures ?? []) as Array<Record<string, unknown>>;
  const recent = (recentFixtures ?? []) as Array<Record<string, unknown>>;

  return (
    <div>
      {/* Referee header */}
      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-2xl font-bold text-yellow-400">
            {ref.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{ref.name}</h1>
            <p className="text-sm text-zinc-400">{ref.games_officiated} games officiated</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl bg-zinc-800 p-4 text-center">
          <p className="text-lg font-bold text-yellow-400 tabular-nums">{Number(ref.avg_yellow_cards).toFixed(2)}</p>
          <p className="text-[10px] uppercase text-zinc-500">Yellow/gm</p>
        </div>
        <div className="rounded-xl bg-zinc-800 p-4 text-center">
          <p className="text-lg font-bold text-red-400 tabular-nums">{Number(ref.avg_red_cards).toFixed(2)}</p>
          <p className="text-[10px] uppercase text-zinc-500">Red/gm</p>
        </div>
        <div className="rounded-xl bg-zinc-800 p-4 text-center">
          <p className="text-lg font-bold text-white tabular-nums">{Number(ref.avg_fouls).toFixed(1)}</p>
          <p className="text-[10px] uppercase text-zinc-500">Fouls/gm</p>
        </div>
        <div className="rounded-xl bg-zinc-800 p-4 text-center">
          <p className="text-lg font-bold text-orange-400 tabular-nums">{Number(ref.avg_penalties ?? 0).toFixed(2)}</p>
          <p className="text-[10px] uppercase text-zinc-500">Penalties/gm</p>
        </div>
        <div className="rounded-xl bg-zinc-800 p-4 text-center">
          <p className="text-lg font-bold text-emerald-400 tabular-nums">{Number(ref.avg_booking_points).toFixed(1)}</p>
          <p className="text-[10px] uppercase text-zinc-500">Booking Pts</p>
        </div>
      </div>

      {/* Upcoming fixtures */}
      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-white">Upcoming Fixtures</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 py-8 text-center text-sm text-zinc-500">
            No upcoming fixtures scheduled.
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map(f => {
              const home = (f.home_team as Record<string, string>)?.name ?? 'Home';
              const away = (f.away_team as Record<string, string>)?.name ?? 'Away';
              const league = (f.competitions as Record<string, string>)?.name ?? '';
              return (
                <Link
                  key={f.id as number}
                  href={`/fixtures/${f.id}`}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition-colors"
                >
                  <div>
                    <p className="text-xs text-zinc-500">{league} &middot; {formatKickoff(f.kickoff_at as string)}</p>
                    <p className="mt-1 text-base font-semibold text-white">
                      {home} <span className="text-zinc-600">vs</span> {away}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                    View tips
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent games */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-white">Recent Matches</h2>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 py-8 text-center text-sm text-zinc-500">
            No recent matches.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-[10px] uppercase text-zinc-500">
                  <th className="pb-2 pr-3">Date</th>
                  <th className="pb-2 pr-3">League</th>
                  <th className="pb-2 pr-3">Match</th>
                  <th className="pb-2 pr-2 text-center">Score</th>
                  <th className="pb-2 text-center">Pens</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(f => {
                  const home = (f.home_team as Record<string, string>)?.name ?? 'Home';
                  const away = (f.away_team as Record<string, string>)?.name ?? 'Away';
                  const league = (f.competitions as Record<string, string>)?.name ?? '';
                  const date = new Date(f.kickoff_at as string).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                  return (
                    <tr key={f.id as number} className="border-b border-zinc-800">
                      <td className="py-2 pr-3 text-xs text-zinc-500">{date}</td>
                      <td className="py-2 pr-3 text-xs text-zinc-400">{league}</td>
                      <td className="py-2 pr-3">
                        <Link href={`/fixtures/${f.id}`} className="text-white hover:text-emerald-400">
                          {home} vs {away}
                        </Link>
                      </td>
                      <td className="py-2 pr-2 text-center tabular-nums font-bold text-emerald-400">
                        {f.home_score as number} - {f.away_score as number}
                      </td>
                      <td className="py-2 text-center tabular-nums text-orange-400">
                        {(f.penalty_count as number) ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
