import { createSafeServerClient } from '@/lib/supabase/safe-client';
import { MARKET_LABELS } from '@/lib/utils/markets';
import type { StatType } from '@/types/tip';

export const dynamic = 'force-dynamic';

interface MarketPerf {
  market: StatType;
  label: string;
  tips: number;
  wins: number;
  losses: number;
  pl: number;
  roi: number;
  strikeRate: number;
}

export default async function PerformancePage() {
  const supabase = await createSafeServerClient();

  let markets: MarketPerf[] = [];

  if (supabase) {
    const { data: tips } = await supabase
      .from('tips')
      .select('market_type, status, pl, odds')
      .in('status', ['won', 'lost']);

    if (tips?.length) {
      const byMarket = new Map<string, { wins: number; losses: number; pl: number }>();
      for (const tip of tips) {
        const existing = byMarket.get(tip.market_type) ?? { wins: 0, losses: 0, pl: 0 };
        if (tip.status === 'won') existing.wins++;
        else existing.losses++;
        existing.pl += (tip.pl ?? 0);
        byMarket.set(tip.market_type, existing);
      }

      markets = Array.from(byMarket.entries()).map(([market, data]) => {
        const total = data.wins + data.losses;
        const staked = total * 1000; // pence
        return {
          market: market as StatType,
          label: MARKET_LABELS[market as StatType] ?? market,
          tips: total,
          wins: data.wins,
          losses: data.losses,
          pl: data.pl / 100,
          roi: staked > 0 ? (data.pl / staked) * 100 : 0,
          strikeRate: total > 0 ? (data.wins / total) * 100 : 0,
        };
      });

      markets.sort((a, b) => b.roi - a.roi);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Market Performance</h1>
        <p className="mt-1 text-sm text-zinc-500">ROI and strike rate by market type — all time</p>
      </div>

      {markets.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 py-16 text-center">
          <p className="text-zinc-500">No settled tips yet. Performance data will appear once tips are settled.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-xs uppercase text-zinc-500">
                <th className="pb-2 pr-4">Market</th>
                <th className="pb-2 pr-4 text-right">Tips</th>
                <th className="pb-2 pr-4 text-right">W</th>
                <th className="pb-2 pr-4 text-right">L</th>
                <th className="pb-2 pr-4 text-right">Strike</th>
                <th className="pb-2 pr-4 text-right">P&L</th>
                <th className="pb-2 text-right">ROI</th>
              </tr>
            </thead>
            <tbody>
              {markets.map(m => (
                <tr key={m.market} className="border-b border-zinc-800">
                  <td className="py-2.5 pr-4 font-medium text-white">{m.label}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-zinc-400">{m.tips}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-green-400">{m.wins}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-red-400">{m.losses}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-zinc-300">{m.strikeRate.toFixed(1)}%</td>
                  <td className={`py-2.5 pr-4 text-right tabular-nums font-medium ${m.pl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {m.pl >= 0 ? '+' : ''}&pound;{Math.abs(m.pl).toFixed(2)}
                  </td>
                  <td className={`py-2.5 text-right tabular-nums font-bold ${m.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {m.roi >= 0 ? '+' : ''}{m.roi.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
