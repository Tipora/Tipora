import type { Tip } from '@/types/tip';
import { MARKET_LABELS } from '@/lib/utils/markets';
import { penceToPounds } from '@/lib/utils/odds';

interface ResultsTableProps {
  tips: Tip[];
}

export function ResultsTable({ tips }: ResultsTableProps) {
  if (!tips.length) {
    return <p className="py-6 text-center text-sm text-zinc-500">No settled tips</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-700 text-xs uppercase text-zinc-500">
            <th className="pb-2 pr-4">Date</th>
            <th className="pb-2 pr-4">Market</th>
            <th className="pb-2 pr-4">Odds</th>
            <th className="pb-2 pr-4">Result</th>
            <th className="pb-2 text-right">P&L</th>
          </tr>
        </thead>
        <tbody>
          {tips.map(tip => (
            <tr key={tip.id} className="border-b border-zinc-800">
              <td className="py-2 pr-4 text-zinc-400">{tip.tip_date}</td>
              <td className="py-2 pr-4 text-white">{MARKET_LABELS[tip.market_type] ?? tip.market_type}</td>
              <td className="py-2 pr-4 tabular-nums text-zinc-300">{tip.odds.toFixed(2)}</td>
              <td className="py-2 pr-4">
                <span
                  className={`text-xs font-bold ${
                    tip.status === 'won' ? 'text-green-400' : tip.status === 'lost' ? 'text-red-400' : 'text-zinc-500'
                  }`}
                >
                  {tip.status.toUpperCase()}
                </span>
              </td>
              <td className={`py-2 text-right tabular-nums font-medium ${
                (tip.pl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {tip.pl !== null ? `${tip.pl > 0 ? '+' : ''}£${penceToPounds(Math.abs(tip.pl))}` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
