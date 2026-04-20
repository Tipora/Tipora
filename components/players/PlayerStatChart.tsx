"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface PlayerStatChartProps {
  data: Array<{ game: string; shots: number; sot: number; fouls: number }>;
}

export function PlayerStatChart({ data }: PlayerStatChartProps) {
  if (!data.length) return null;

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="game" tick={{ fontSize: 10, fill: '#71717a' }} />
          <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#a1a1aa' }}
          />
          <Bar dataKey="shots" fill="#60a5fa" name="Shots" radius={[2, 2, 0, 0]} />
          <Bar dataKey="sot" fill="#34d399" name="SOT" radius={[2, 2, 0, 0]} />
          <Bar dataKey="fouls" fill="#fb923c" name="Fouls" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
