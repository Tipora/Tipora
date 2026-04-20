"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface H2HMatch {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  homeShots: number;
  awayShots: number;
  homeCorners: number;
  awayCorners: number;
  homeFouls: number;
  awayFouls: number;
  homeCards: number;
  awayCards: number;
}

interface H2HChartProps {
  matches: H2HMatch[];
  teamAName: string;
  teamBName: string;
}

export function H2HChart({ matches, teamAName, teamBName }: H2HChartProps) {
  if (!matches.length) {
    return <p className="py-8 text-center text-sm text-zinc-500">No head-to-head data available</p>;
  }

  const goalData = matches.map((m, i) => ({
    game: `G${i + 1}`,
    date: m.date,
    [teamAName]: m.homeTeam === teamAName ? m.homeGoals : m.awayGoals,
    [teamBName]: m.homeTeam === teamBName ? m.homeGoals : m.awayGoals,
  }));

  const statSummary = matches.reduce(
    (acc, m) => {
      const aIsHome = m.homeTeam === teamAName;
      acc.aGoals += aIsHome ? m.homeGoals : m.awayGoals;
      acc.bGoals += aIsHome ? m.awayGoals : m.homeGoals;
      acc.aShots += aIsHome ? m.homeShots : m.awayShots;
      acc.bShots += aIsHome ? m.awayShots : m.homeShots;
      acc.aFouls += aIsHome ? m.homeFouls : m.awayFouls;
      acc.bFouls += aIsHome ? m.awayFouls : m.homeFouls;
      acc.aCards += aIsHome ? m.homeCards : m.awayCards;
      acc.bCards += aIsHome ? m.awayCards : m.homeCards;
      acc.aCorners += aIsHome ? m.homeCorners : m.awayCorners;
      acc.bCorners += aIsHome ? m.awayCorners : m.homeCorners;
      return acc;
    },
    { aGoals: 0, bGoals: 0, aShots: 0, bShots: 0, aFouls: 0, bFouls: 0, aCards: 0, bCards: 0, aCorners: 0, bCorners: 0 }
  );

  const count = matches.length;
  const comparisonData = [
    { stat: 'Goals/gm', [teamAName]: +(statSummary.aGoals / count).toFixed(1), [teamBName]: +(statSummary.bGoals / count).toFixed(1) },
    { stat: 'Shots/gm', [teamAName]: +(statSummary.aShots / count).toFixed(1), [teamBName]: +(statSummary.bShots / count).toFixed(1) },
    { stat: 'Corners/gm', [teamAName]: +(statSummary.aCorners / count).toFixed(1), [teamBName]: +(statSummary.bCorners / count).toFixed(1) },
    { stat: 'Fouls/gm', [teamAName]: +(statSummary.aFouls / count).toFixed(1), [teamBName]: +(statSummary.bFouls / count).toFixed(1) },
    { stat: 'Cards/gm', [teamAName]: +(statSummary.aCards / count).toFixed(1), [teamBName]: +(statSummary.bCards / count).toFixed(1) },
  ];

  return (
    <div className="space-y-6">
      {/* Goals per game chart */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-zinc-400">Goals per Meeting</h3>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={goalData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="game" tick={{ fontSize: 10, fill: '#71717a' }} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey={teamAName} fill="#34d399" radius={[2, 2, 0, 0]} />
              <Bar dataKey={teamBName} fill="#60a5fa" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Average stat comparison */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-zinc-400">Average Stats (last {count} meetings)</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#71717a' }} />
              <YAxis type="category" dataKey="stat" tick={{ fontSize: 11, fill: '#a1a1aa' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey={teamAName} fill="#34d399" radius={[0, 2, 2, 0]} />
              <Bar dataKey={teamBName} fill="#60a5fa" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Results list */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-zinc-400">Results</h3>
        <div className="space-y-1.5">
          {matches.map((m, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2 text-sm">
              <span className="text-xs text-zinc-500">{m.date}</span>
              <span className="text-zinc-300">{m.homeTeam}</span>
              <span className="font-bold text-white tabular-nums">{m.homeGoals} - {m.awayGoals}</span>
              <span className="text-zinc-300">{m.awayTeam}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
