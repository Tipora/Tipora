import { createSafeServerClient } from '@/lib/supabase/safe-client';
import { MARKET_LABELS } from '@/lib/utils/markets';
import { penceToPounds } from '@/lib/utils/odds';
import type { Tip, StatType } from '@/types/tip';
import { ResultsClient } from './results-client';

export const dynamic = 'force-dynamic';

export default async function ResultsPage() {
  const supabase = await createSafeServerClient();

  const today = new Date().toISOString().split('T')[0];

  let settledTips: Tip[] = [];
  if (supabase) {
    const { data } = await supabase
      .from('tips')
      .select('*, fixtures(kickoff_at, home_team:teams!fixtures_home_team_id_fkey(name), away_team:teams!fixtures_away_team_id_fkey(name))')
      .in('status', ['won', 'lost', 'void'])
      .eq('tip_date', today)
      .order('settled_at', { ascending: false });
    settledTips = (data ?? []) as unknown as Tip[];
  }

  const wins = settledTips.filter(t => t.status === 'won').length;
  const losses = settledTips.filter(t => t.status === 'lost').length;
  const totalPL = settledTips.reduce((s, t) => s + (t.pl ?? 0), 0) / 100;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Results Archive</h1>
        <p className="mt-1 text-sm text-zinc-500">Every tip, every result, full transparency</p>
      </div>
      <ResultsClient
        initialDate={today}
        initialTips={settledTips}
        initialWins={wins}
        initialLosses={losses}
        initialPL={totalPL}
      />
    </div>
  );
}
