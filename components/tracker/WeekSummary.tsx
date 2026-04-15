import Link from 'next/link';

interface WeekSummaryProps {
  wins: number;
  losses: number;
  voids: number;
  totalPL: number;
  staked: number;
}

export function WeekSummary({ wins, losses, voids, totalPL, staked }: WeekSummaryProps) {
  const total = wins + losses;
  const strikeRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
  const roi = staked > 0 ? ((totalPL / staked) * 100).toFixed(1) : '0.0';
  const plColor = totalPL >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Last 7 Days</h2>
        <Link href="/tracker" className="text-xs text-emerald-400 hover:text-emerald-300">
          Full tracker &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl bg-zinc-800/70 p-3 text-center">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">P&L</p>
          <p className={`mt-1 text-xl font-bold ${plColor}`}>
            {totalPL >= 0 ? '+' : ''}&pound;{Math.abs(totalPL).toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl bg-zinc-800/70 p-3 text-center">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">ROI</p>
          <p className={`mt-1 text-xl font-bold ${plColor}`}>{roi}%</p>
        </div>
        <div className="rounded-xl bg-zinc-800/70 p-3 text-center">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">Wins</p>
          <p className="mt-1 text-xl font-bold text-white">{wins}</p>
        </div>
        <div className="rounded-xl bg-zinc-800/70 p-3 text-center">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">Losses</p>
          <p className="mt-1 text-xl font-bold text-white">{losses}</p>
        </div>
        <div className="rounded-xl bg-zinc-800/70 p-3 text-center">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">Strike Rate</p>
          <p className="mt-1 text-xl font-bold text-white">{strikeRate}%</p>
        </div>
      </div>

      {total === 0 && voids === 0 && (
        <p className="mt-3 text-center text-xs text-zinc-600">
          No settled tips this week yet — check back soon.
        </p>
      )}
    </div>
  );
}
