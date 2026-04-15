"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface PLGraphProps {
  data: Array<{ date: string; cumulative: number }>;
}

export function PLGraph({ data }: PLGraphProps) {
  if (!data.length) {
    return <p className="py-10 text-center text-sm text-zinc-500">No data for this period</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} />
          <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v: number) => `£${v}`} />
          <Tooltip
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
            labelStyle={{ color: '#a1a1aa' }}
            formatter={(value) => [`£${Number(value).toFixed(2)}`, 'Cumulative P&L']}
          />
          <ReferenceLine y={0} stroke="#3f3f46" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="cumulative"
            stroke={data[data.length - 1].cumulative >= 0 ? '#4ade80' : '#f87171'}
            strokeWidth={2}
            dot={{ fill: '#fff', r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
