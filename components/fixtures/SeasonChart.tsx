"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface SeasonDataPoint {
  matchday: number;
  date: string;
  goals: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  fouls: number;
  cards: number;
  xg: number;
}

interface SeasonChartProps {
  data: SeasonDataPoint[];
  teamName: string;
}

export function SeasonChart({ data, teamName }: SeasonChartProps) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-zinc-500">No season data for {teamName}</p>;
  }

  return (
    <div className="space-y-6">
      {/* Goals + xG trend */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-zinc-400">Goals &amp; xG per Match</h3>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="matchday" tick={{ fontSize: 10, fill: '#71717a' }} label={{ value: 'Matchday', position: 'bottom', fontSize: 10, fill: '#71717a' }} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="goals" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} name="Goals" />
              <Line type="monotone" dataKey="xg" stroke="#60a5fa" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} name="xG" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Shots trend */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-zinc-400">Shots &amp; Shots on Target</h3>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="matchday" tick={{ fontSize: 10, fill: '#71717a' }} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="shots" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} name="Shots" />
              <Line type="monotone" dataKey="shotsOnTarget" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="SOT" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fouls & Cards */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-zinc-400">Fouls &amp; Cards</h3>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="matchday" tick={{ fontSize: 10, fill: '#71717a' }} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="fouls" stroke="#fb923c" strokeWidth={2} dot={{ r: 3 }} name="Fouls" />
              <Line type="monotone" dataKey="cards" stroke="#f87171" strokeWidth={2} dot={{ r: 3 }} name="Cards" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
