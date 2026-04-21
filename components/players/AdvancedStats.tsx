interface AdvancedStatsProps {
  avgExpectedAssists: number;
  avgProgressiveCarries: number;
  avgCrossesTotal: number;
  avgCrossesCompleted: number;
  avgTackles: number;
  avgInterceptions: number;
  avgAerialDuelsWon: number;
  avgSaves: number;
  avgBigChancesMissed: number;
  position: string;
}

export function AdvancedStats({
  avgExpectedAssists,
  avgProgressiveCarries,
  avgCrossesTotal,
  avgCrossesCompleted,
  avgTackles,
  avgInterceptions,
  avgAerialDuelsWon,
  avgSaves,
  avgBigChancesMissed,
  position,
}: AdvancedStatsProps) {
  const isGK = position === 'Goalkeeper';

  // Build cells based on position
  const cells: Array<{ label: string; value: number; format?: (v: number) => string }> = [];

  if (isGK) {
    cells.push(
      { label: 'Saves/gm', value: avgSaves },
      { label: 'Aerial Wins', value: avgAerialDuelsWon },
    );
  } else {
    cells.push(
      { label: 'xA/gm', value: avgExpectedAssists, format: v => v.toFixed(2) },
      { label: 'Prog Carries', value: avgProgressiveCarries },
      { label: 'Crosses', value: avgCrossesTotal },
      { label: 'Cross Acc %', value: avgCrossesTotal > 0 ? (avgCrossesCompleted / avgCrossesTotal) * 100 : 0, format: v => `${v.toFixed(0)}%` },
      { label: 'Tackles', value: avgTackles },
      { label: 'Intercepts', value: avgInterceptions },
      { label: 'Aerial Wins', value: avgAerialDuelsWon },
      { label: 'Big Chances Missed', value: avgBigChancesMissed, format: v => v.toFixed(2) },
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="mb-3 text-lg font-semibold text-white">Advanced Stats</h2>
      <p className="mb-4 text-xs text-zinc-500">Per-game averages from the last 10 matches</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cells.map(c => (
          <div key={c.label} className="rounded-lg bg-zinc-800 p-3 text-center">
            <p className="text-lg font-bold text-white tabular-nums">
              {c.format ? c.format(c.value) : c.value.toFixed(1)}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
