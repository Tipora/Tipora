"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface GoalPeriodChartProps {
  teamName: string;
  scoredByPeriod: Record<string, number>;
  concededByPeriod: Record<string, number>;
  gamesAnalysed: number;
}

export function GoalPeriodChart({ teamName, scoredByPeriod, concededByPeriod, gamesAnalysed }: GoalPeriodChartProps) {
  const periods = ['0-15', '16-30', '31-45', '46-60', '61-75', '76-90'];
  const data = periods.map(p => ({
    period: p,
    Scored: scoredByPeriod[p] ?? 0,
    Conceded: concededByPeriod[p] ?? 0,
  }));

  const totalScored = Object.values(scoredByPeriod).reduce((a, b) => a + b, 0);
  const totalConceded = Object.values(concededByPeriod).reduce((a, b) => a + b, 0);

  if (gamesAnalysed === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="text-base font-semibold text-white">{teamName} — Goals by Period</h3>
        <p className="mt-4 text-sm text-zinc-500">No goal period data available yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">{teamName} — Goals by Period</h3>
        <span className="text-[10px] text-zinc-500">Last {gamesAnalysed} games</span>
      </div>

      <div className="mb-3 flex gap-4 text-sm">
        <div>
          <span className="text-zinc-500">Scored: </span>
          <span className="font-bold text-emerald-400">{totalScored}</span>
        </div>
        <div>
          <span className="text-zinc-500">Conceded: </span>
          <span className="font-bold text-red-400">{totalConceded}</span>
        </div>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#71717a' }} />
            <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#a1a1aa' }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Scored" fill="#34d399" radius={[2, 2, 0, 0]} />
            <Bar dataKey="Conceded" fill="#f87171" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
