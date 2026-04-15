"use client";

import { useState } from 'react';
import { PLDashboard } from '@/components/tracker/PLDashboard';
import type { PLStats, PLPeriod, Tip } from '@/types/tip';

interface TrackerClientProps {
  initialStats: PLStats;
  initialGraphData: Array<{ date: string; cumulative: number }>;
  initialTips: Tip[];
}

export function TrackerClient({ initialStats, initialGraphData, initialTips }: TrackerClientProps) {
  const [stats, setStats] = useState(initialStats);
  const [graphData, setGraphData] = useState(initialGraphData);
  const [tips, setTips] = useState(initialTips);

  async function handlePeriodChange(period: PLPeriod) {
    try {
      const res = await fetch(`/api/tracker?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setGraphData(data.graphData);
        setTips(data.tips);
      }
    } catch {
      // Keep current data on error
    }
  }

  return (
    <PLDashboard
      stats={stats}
      graphData={graphData}
      settledTips={tips}
      isPro={false}
      onPeriodChange={handlePeriodChange}
    />
  );
}
