import { penceToPounds } from '@/lib/utils/odds';
import type { PLStats } from '@/types/tip';

interface StatsBannerProps {
  stats: PLStats;
}

export function StatsBanner({ stats }: StatsBannerProps) {
  const plColor = stats.totalPL >= 0 ? 'text-green-400' : 'text-red-400';
  const strikeRate = stats.wins + stats.losses > 0
    ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <div className="rounded-xl bg-zinc-800 p-4 text-center">
        <p className="text-xs text-zinc-500">Total P&L</p>
        <p className={`text-2xl font-bold ${plColor}`}>
          {stats.totalPL >= 0 ? '+' : ''}£{Math.abs(stats.totalPL).toFixed(2)}
        </p>
      </div>
      <div className="rounded-xl bg-zinc-800 p-4 text-center">
        <p className="text-xs text-zinc-500">ROI</p>
        <p className={`text-2xl font-bold ${plColor}`}>{stats.roi}%</p>
      </div>
      <div className="rounded-xl bg-zinc-800 p-4 text-center">
        <p className="text-xs text-zinc-500">Wins</p>
        <p className="text-2xl font-bold text-white">{stats.wins}</p>
      </div>
      <div className="rounded-xl bg-zinc-800 p-4 text-center">
        <p className="text-xs text-zinc-500">Losses</p>
        <p className="text-2xl font-bold text-white">{stats.losses}</p>
      </div>
      <div className="rounded-xl bg-zinc-800 p-4 text-center">
        <p className="text-xs text-zinc-500">Strike Rate</p>
        <p className="text-2xl font-bold text-white">{strikeRate}%</p>
      </div>
    </div>
  );
}
