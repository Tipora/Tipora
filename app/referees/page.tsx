import { createSafeServerClient } from '@/lib/supabase/safe-client';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface RefereeWithNext {
  id: number;
  name: string;
  avg_yellow_cards: number;
  avg_red_cards: number;
  avg_fouls: number;
  avg_penalties: number;
  avg_booking_points: number;
  games_officiated: number;
}

export default async function RefereesPage() {
  const supabase = await createSafeServerClient();

  let referees: RefereeWithNext[] = [];
  if (supabase) {
    const { data } = await supabase
      .from('referees')
      .select('id, name, avg_yellow_cards, avg_red_cards, avg_fouls, avg_penalties, avg_booking_points, games_officiated')
      .gt('games_officiated', 0)
      .order('games_officiated', { ascending: false });
    referees = (data ?? []) as RefereeWithNext[];
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Referees</h1>
        <p className="mt-1 text-sm text-zinc-500">Click a referee to see their stats and upcoming fixtures</p>
      </div>

      {referees.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 py-16 text-center">
          <p className="text-zinc-500">No referee data yet.</p>
          <p className="mt-1 text-xs text-zinc-600">Referee stats build up as matches finish and team stats are ingested.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-[10px] uppercase text-zinc-500">
                <th className="pb-2 pr-3">Referee</th>
                <th className="pb-2 pr-2 text-center">Games</th>
                <th className="pb-2 pr-2 text-center">Yellow/gm</th>
                <th className="pb-2 pr-2 text-center">Red/gm</th>
                <th className="pb-2 pr-2 text-center">Fouls/gm</th>
                <th className="pb-2 pr-2 text-center">Pens/gm</th>
                <th className="pb-2 text-center">Booking Pts</th>
              </tr>
            </thead>
            <tbody>
              {referees.map(r => (
                <tr key={r.id} className="border-b border-zinc-800">
                  <td className="py-2.5 pr-3 font-medium text-white">
                    <Link href={`/referees/${r.id}`} className="hover:text-emerald-400">{r.name}</Link>
                  </td>
                  <td className="py-2.5 pr-2 text-center tabular-nums text-zinc-400">{r.games_officiated}</td>
                  <td className="py-2.5 pr-2 text-center tabular-nums text-yellow-400">{Number(r.avg_yellow_cards).toFixed(2)}</td>
                  <td className="py-2.5 pr-2 text-center tabular-nums text-red-400">{Number(r.avg_red_cards).toFixed(2)}</td>
                  <td className="py-2.5 pr-2 text-center tabular-nums text-zinc-300">{Number(r.avg_fouls).toFixed(1)}</td>
                  <td className="py-2.5 pr-2 text-center tabular-nums text-orange-400">{Number(r.avg_penalties).toFixed(2)}</td>
                  <td className="py-2.5 text-center tabular-nums font-bold text-white">{Number(r.avg_booking_points).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
