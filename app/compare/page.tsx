"use client";

import { useState } from 'react';

interface PlayerStats {
  name: string;
  team: string;
  position: string;
  avgGoals: number;
  avgAssists: number;
  avgShots: number;
  avgSOT: number;
  avgFouls: number;
  avgYellows: number;
  appearances: number;
}

export default function ComparePage() {
  const [playerA, setPlayerA] = useState('');
  const [playerB, setPlayerB] = useState('');
  const [statsA, setStatsA] = useState<PlayerStats | null>(null);
  const [statsB, setStatsB] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCompare() {
    if (!playerA.trim() || !playerB.trim()) return;
    setLoading(true);
    setError('');
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/players/stats?name=${encodeURIComponent(playerA.trim())}`),
        fetch(`/api/players/stats?name=${encodeURIComponent(playerB.trim())}`),
      ]);
      const dataA = await resA.json();
      const dataB = await resB.json();
      if (dataA.error) setError(`Could not find "${playerA}"`);
      else if (dataB.error) setError(`Could not find "${playerB}"`);
      else { setStatsA(dataA); setStatsB(dataB); }
    } catch { setError('Something went wrong'); }
    finally { setLoading(false); }
  }

  const STAT_ROWS: { key: keyof PlayerStats; label: string; format: (v: number) => string; higher: boolean }[] = [
    { key: 'avgGoals', label: 'Goals/gm', format: v => v.toFixed(2), higher: true },
    { key: 'avgAssists', label: 'Assists/gm', format: v => v.toFixed(2), higher: true },
    { key: 'avgShots', label: 'Shots/gm', format: v => v.toFixed(1), higher: true },
    { key: 'avgSOT', label: 'SOT/gm', format: v => v.toFixed(1), higher: true },
    { key: 'avgFouls', label: 'Fouls/gm', format: v => v.toFixed(1), higher: false },
    { key: 'avgYellows', label: 'Yellows/gm', format: v => v.toFixed(2), higher: false },
    { key: 'appearances', label: 'Appearances', format: v => String(v), higher: true },
  ];

  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="text-3xl font-bold text-white">Player Comparison</h1>
      <p className="mt-1 text-sm text-zinc-500">Compare two players side by side</p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <input
          type="text" placeholder="Player A (e.g. Salah)" value={playerA}
          onChange={e => setPlayerA(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
        <span className="self-center text-sm text-zinc-600">vs</span>
        <input
          type="text" placeholder="Player B (e.g. Haaland)" value={playerB}
          onChange={e => setPlayerB(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
        <button
          onClick={handleCompare} disabled={loading}
          className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Compare'}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {statsA && statsB && (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="pb-2 text-left text-xs uppercase text-zinc-500">Stat</th>
                <th className="pb-2 text-center text-xs uppercase text-emerald-400">{statsA.name}</th>
                <th className="pb-2 text-center text-xs uppercase text-emerald-400">{statsB.name}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-zinc-800">
                <td className="py-2 text-zinc-400">Team</td>
                <td className="py-2 text-center text-white">{statsA.team}</td>
                <td className="py-2 text-center text-white">{statsB.team}</td>
              </tr>
              <tr className="border-b border-zinc-800">
                <td className="py-2 text-zinc-400">Position</td>
                <td className="py-2 text-center text-white">{statsA.position}</td>
                <td className="py-2 text-center text-white">{statsB.position}</td>
              </tr>
              {STAT_ROWS.map(row => {
                const valA = statsA[row.key] as number;
                const valB = statsB[row.key] as number;
                const aWins = row.higher ? valA > valB : valA < valB;
                const bWins = row.higher ? valB > valA : valB < valA;
                return (
                  <tr key={row.key} className="border-b border-zinc-800">
                    <td className="py-2 text-zinc-400">{row.label}</td>
                    <td className={`py-2 text-center tabular-nums font-medium ${aWins ? 'text-emerald-400' : 'text-white'}`}>
                      {row.format(valA)}
                    </td>
                    <td className={`py-2 text-center tabular-nums font-medium ${bWins ? 'text-emerald-400' : 'text-white'}`}>
                      {row.format(valB)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
