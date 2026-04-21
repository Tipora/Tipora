"use client";

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface AdvancedStatsChartProps {
  playerName: string;
  avgTackles: number;
  avgInterceptions: number;
  avgAerialDuelsWon: number;
  avgCrossesCompleted: number;
  avgProgressiveCarries: number;
  avgExpectedAssists: number;
}

export function AdvancedStatsChart({
  playerName,
  avgTackles,
  avgInterceptions,
  avgAerialDuelsWon,
  avgCrossesCompleted,
  avgProgressiveCarries,
  avgExpectedAssists,
}: AdvancedStatsChartProps) {
  const data = [
    { metric: 'Tackles', value: avgTackles },
    { metric: 'Intercepts', value: avgInterceptions },
    { metric: 'Aerial', value: avgAerialDuelsWon },
    { metric: 'Crosses', value: avgCrossesCompleted },
    { metric: 'Carries', value: avgProgressiveCarries },
    { metric: 'xA', value: avgExpectedAssists * 4 }, // scale up for visibility
  ];

  const hasData = data.some(d => d.value > 0);
  if (!hasData) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="mb-3 text-base font-semibold text-white">{playerName} — Profile</h3>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="#3f3f46" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#a1a1aa' }} />
            <PolarRadiusAxis tick={{ fontSize: 9, fill: '#52525b' }} stroke="#52525b" />
            <Radar
              name={playerName}
              dataKey="value"
              stroke="#34d399"
              fill="#34d399"
              fillOpacity={0.35}
              strokeWidth={2}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
