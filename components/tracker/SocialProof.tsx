interface SocialProofProps {
  totalTips: number;
  totalWins: number;
  totalLosses: number;
  allTimePL: number;
  strikeRate: number;
}

export function SocialProof({ totalTips, totalWins, totalLosses, allTimePL, strikeRate }: SocialProofProps) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="flex divide-x divide-zinc-800">
        <div className="flex-1 px-4 py-3 text-center">
          <p className="text-lg font-bold text-white tabular-nums">{totalTips.toLocaleString()}</p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Tips Settled</p>
        </div>
        <div className="flex-1 px-4 py-3 text-center">
          <p className="text-lg font-bold text-white tabular-nums">{strikeRate.toFixed(1)}%</p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Strike Rate</p>
        </div>
        <div className="flex-1 px-4 py-3 text-center">
          <p className={`text-lg font-bold tabular-nums ${allTimePL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {allTimePL >= 0 ? '+' : ''}&pound;{Math.abs(allTimePL).toFixed(0)}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">All-Time P&L</p>
        </div>
        <div className="hidden flex-1 px-4 py-3 text-center sm:block">
          <p className="text-lg font-bold text-green-400 tabular-nums">{totalWins.toLocaleString()}</p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Winners</p>
        </div>
      </div>
    </div>
  );
}
