interface FirstGoalStatsProps {
  homeTeam: string;
  awayTeam: string;
  homeScoredFirstPct: number;
  awayScoredFirstPct: number;
  homeAvgMinute: number;
  awayAvgMinute: number;
  homeScoredFirstWinPct: number;
  awayScoredFirstWinPct: number;
  homeConcededFirstWinPct: number;
  awayConcededFirstWinPct: number;
}

export function FirstGoalStats({
  homeTeam, awayTeam,
  homeScoredFirstPct, awayScoredFirstPct,
  homeAvgMinute, awayAvgMinute,
  homeScoredFirstWinPct, awayScoredFirstWinPct,
  homeConcededFirstWinPct, awayConcededFirstWinPct,
}: FirstGoalStatsProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="mb-4 text-lg font-semibold text-white">First Goal Analysis</h2>

      {/* Score first % bar */}
      <div className="mb-4">
        <div className="mb-1 flex justify-between text-xs text-zinc-500">
          <span>{homeTeam} scores first</span>
          <span>{awayTeam} scores first</span>
        </div>
        <div className="flex h-6 overflow-hidden rounded-full">
          <div
            className="flex items-center justify-center bg-emerald-500 text-[10px] font-bold text-black transition-all"
            style={{ width: `${homeScoredFirstPct}%` }}
          >
            {homeScoredFirstPct}%
          </div>
          <div
            className="flex items-center justify-center bg-blue-500 text-[10px] font-bold text-black transition-all"
            style={{ width: `${awayScoredFirstPct}%` }}
          >
            {awayScoredFirstPct}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Home team */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-300">{homeTeam}</h3>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded bg-zinc-800 py-2">
              <p className="text-lg font-bold text-white">{homeAvgMinute}&apos;</p>
              <p className="text-zinc-500">Avg 1st Goal</p>
            </div>
            <div className="rounded bg-zinc-800 py-2">
              <p className="text-lg font-bold text-emerald-400">{homeScoredFirstWinPct}%</p>
              <p className="text-zinc-500">Win when 1st</p>
            </div>
          </div>
          <div className="rounded bg-zinc-800 py-2 text-center text-xs">
            <p className="text-sm font-bold text-zinc-300">{homeConcededFirstWinPct}%</p>
            <p className="text-zinc-500">Comeback when behind</p>
          </div>
        </div>

        {/* Away team */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-300">{awayTeam}</h3>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded bg-zinc-800 py-2">
              <p className="text-lg font-bold text-white">{awayAvgMinute}&apos;</p>
              <p className="text-zinc-500">Avg 1st Goal</p>
            </div>
            <div className="rounded bg-zinc-800 py-2">
              <p className="text-lg font-bold text-emerald-400">{awayScoredFirstWinPct}%</p>
              <p className="text-zinc-500">Win when 1st</p>
            </div>
          </div>
          <div className="rounded bg-zinc-800 py-2 text-center text-xs">
            <p className="text-sm font-bold text-zinc-300">{awayConcededFirstWinPct}%</p>
            <p className="text-zinc-500">Comeback when behind</p>
          </div>
        </div>
      </div>
    </div>
  );
}
