"use client";

import { useState } from 'react';
import { MARKET_LABELS } from '@/lib/utils/markets';
import { penceToPounds } from '@/lib/utils/odds';
import type { Tip, StatType } from '@/types/tip';

interface ResultsClientProps {
  initialDate: string;
  initialTips: Tip[];
  initialWins: number;
  initialLosses: number;
  initialPL: number;
}

export function ResultsClient({ initialDate, initialTips, initialWins, initialLosses, initialPL }: ResultsClientProps) {
  const [date, setDate] = useState(initialDate);
  const [tips, setTips] = useState(initialTips);
  const [wins, setWins] = useState(initialWins);
  const [losses, setLosses] = useState(initialLosses);
  const [pl, setPl] = useState(initialPL);
  const [loading, setLoading] = useState(false);

  async function loadDate(newDate: string) {
    setDate(newDate);
    setLoading(true);
    try {
      const res = await fetch(`/api/results?date=${newDate}`);
      if (res.ok) {
        const data = await res.json();
        setTips(data.tips);
        setWins(data.wins);
        setLosses(data.losses);
        setPl(data.pl);
      }
    } catch { /* keep current */ }
    finally { setLoading(false); }
  }

  function goDay(offset: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    const today = new Date().toISOString().split('T')[0];
    const newDate = d.toISOString().split('T')[0];
    if (newDate > today) return;
    loadDate(newDate);
  }

  const total = wins + losses;
  const strike = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
  const plColor = pl >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div>
      {/* Date nav */}
      <div className="mb-6 flex items-center gap-2">
        <button onClick={() => goDay(-1)} className="rounded-md border border-zinc-700 px-2 py-1 text-sm text-zinc-400 hover:border-zinc-500">&larr;</button>
        <input type="date" value={date} max={new Date().toISOString().split('T')[0]}
          onChange={e => loadDate(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 focus:border-emerald-500 focus:outline-none"
        />
        <button onClick={() => goDay(1)} className="rounded-md border border-zinc-700 px-2 py-1 text-sm text-zinc-400 hover:border-zinc-500">&rarr;</button>
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-zinc-800 p-4 text-center">
          <p className="text-xs text-zinc-500">P&L</p>
          <p className={`mt-1 text-xl font-bold ${plColor}`}>{pl >= 0 ? '+' : ''}&pound;{Math.abs(pl).toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-zinc-800 p-4 text-center">
          <p className="text-xs text-zinc-500">Wins</p>
          <p className="mt-1 text-xl font-bold text-green-400">{wins}</p>
        </div>
        <div className="rounded-xl bg-zinc-800 p-4 text-center">
          <p className="text-xs text-zinc-500">Losses</p>
          <p className="mt-1 text-xl font-bold text-red-400">{losses}</p>
        </div>
        <div className="rounded-xl bg-zinc-800 p-4 text-center">
          <p className="text-xs text-zinc-500">Strike Rate</p>
          <p className="mt-1 text-xl font-bold text-white">{strike}%</p>
        </div>
      </div>

      {/* Results table */}
      {loading ? (
        <div className="py-12 text-center text-zinc-500">Loading...</div>
      ) : tips.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 py-12 text-center">
          <p className="text-zinc-500">No settled tips for {date}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-xs uppercase text-zinc-500">
                <th className="pb-2 pr-4">Selection</th>
                <th className="pb-2 pr-4">Market</th>
                <th className="pb-2 pr-4">Odds</th>
                <th className="pb-2 pr-4">Result</th>
                <th className="pb-2 text-right">P&L</th>
              </tr>
            </thead>
            <tbody>
              {tips.map((tip: Tip) => (
                <tr key={tip.id} className="border-b border-zinc-800">
                  <td className="py-2 pr-4 text-white">{tip.selection.split(' — ')[0]}</td>
                  <td className="py-2 pr-4 text-zinc-400">{MARKET_LABELS[tip.market_type] ?? tip.market_type}</td>
                  <td className="py-2 pr-4 tabular-nums text-zinc-300">{tip.odds.toFixed(2)}</td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs font-bold ${tip.status === 'won' ? 'text-green-400' : tip.status === 'lost' ? 'text-red-400' : 'text-zinc-500'}`}>
                      {tip.status.toUpperCase()}
                    </span>
                  </td>
                  <td className={`py-2 text-right tabular-nums font-medium ${(tip.pl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tip.pl !== null ? `${tip.pl > 0 ? '+' : ''}\u00A3${penceToPounds(Math.abs(tip.pl))}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
