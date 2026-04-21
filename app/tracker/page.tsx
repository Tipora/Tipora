import { TrackerClient } from './tracker-client';
import { createSafeServerClient } from '@/lib/supabase/safe-client';
import type { Tip } from '@/types/tip';

export const dynamic = 'force-dynamic';

export default async function TrackerPage() {
  const supabase = await createSafeServerClient();

  if (!supabase) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">P&L Tracker</h1>
          <p className="mt-1 text-sm text-zinc-500">Full transparency on every tip</p>
        </div>
        <TrackerClient
          initialStats={{ wins: 0, losses: 0, voids: 0, totalPL: 0, staked: 0, roi: 0, period: 'day' }}
          initialGraphData={[]}
          initialTips={[]}
        />
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const { data: tips } = await supabase
    .from('tips')
    .select('*')
    .in('status', ['won', 'lost', 'void'])
    .eq('tip_date', today)
    .order('settled_at', { ascending: false });

  const settledTips = (tips ?? []) as unknown as Tip[];
  const wins = settledTips.filter(t => t.status === 'won').length;
  const losses = settledTips.filter(t => t.status === 'lost').length;
  const voids = settledTips.filter(t => t.status === 'void').length;
  const totalPL = settledTips.reduce((s, t) => s + (t.pl ?? 0), 0) / 100;
  const staked = (wins + losses) * 10;
  const roi = staked > 0 ? +((totalPL / staked) * 100).toFixed(1) : 0;

  let cumulative = 0;
  const graphData = settledTips
    .filter(t => t.status !== 'void')
    .reverse()
    .map(t => {
      cumulative += (t.pl ?? 0) / 100;
      return { date: t.tip_date, cumulative: +cumulative.toFixed(2) };
    });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">P&L Tracker</h1>
        <p className="mt-1 text-sm text-zinc-500">Full transparency on every tip</p>
      </div>
      <TrackerClient
        initialStats={{ wins, losses, voids, totalPL, staked, roi, period: 'day' }}
        initialGraphData={graphData}
        initialTips={settledTips}
      />
    </div>
  );
}
