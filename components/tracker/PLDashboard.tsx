"use client";

import { useState } from 'react';
import type { PLStats, PLPeriod } from '@/types/tip';
import { StatsBanner } from './StatsBanner';
import { PLGraph } from './PLGraph';
import { ResultsTable } from './ResultsTable';
import type { Tip } from '@/types/tip';

const PERIODS: { key: PLPeriod; label: string; pro: boolean }[] = [
  { key: 'day', label: 'Day', pro: false },
  { key: 'week', label: 'Week', pro: true },
  { key: 'month', label: 'Month', pro: true },
  { key: 'season', label: 'Season', pro: true },
  { key: 'allTime', label: 'All Time', pro: true },
];

interface PLDashboardProps {
  stats: PLStats;
  graphData: Array<{ date: string; cumulative: number }>;
  settledTips: Tip[];
  isPro: boolean;
  onPeriodChange: (period: PLPeriod) => void;
}

export function PLDashboard({ stats, graphData, settledTips, isPro, onPeriodChange }: PLDashboardProps) {
  const [activePeriod, setActivePeriod] = useState<PLPeriod>('day');

  function handlePeriodChange(period: PLPeriod) {
    setActivePeriod(period);
    onPeriodChange(period);
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-lg bg-zinc-800 p-1">
        {PERIODS.map(({ key, label, pro }) => (
          <button
            key={key}
            onClick={() => (pro && !isPro) ? undefined : handlePeriodChange(key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activePeriod === key
                ? 'bg-zinc-700 text-white'
                : pro && !isPro
                  ? 'cursor-not-allowed text-zinc-600'
                  : 'text-zinc-400 hover:text-white'
            }`}
          >
            {label}
            {pro && !isPro && <span className="ml-1 text-xs text-amber-500">PRO</span>}
          </button>
        ))}
      </div>

      <StatsBanner stats={stats} />
      <PLGraph data={graphData} />

      <div>
        <h3 className="mb-3 text-lg font-semibold text-white">Recent Results</h3>
        <ResultsTable tips={settledTips} />
      </div>
    </div>
  );
}
