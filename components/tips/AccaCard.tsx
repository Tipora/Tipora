"use client";

import { useState } from 'react';
import type { Tip } from '@/types/tip';
import type { Accumulator } from '@/types/acca';
import { AccaLabel } from '@/components/ui/AccaLabel';
import { OddsTag } from '@/components/ui/OddsTag';
import { MARKET_LABELS } from '@/lib/utils/markets';
import { penceToPounds } from '@/lib/utils/odds';

interface AccaLeg {
  tip: Tip;
  homeTeam: string;
  awayTeam: string;
}

interface AccaCardProps {
  acca: Accumulator;
  legs: AccaLeg[];
}

export function AccaCard({ acca, legs }: AccaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isSettled = acca.status !== 'pending';
  const labelInfo = acca.label ?? { label: 'Acca', color: '#60efff' };

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <AccaLabel label={labelInfo.label} color={labelInfo.color} />
        {isSettled && (
          <span
            className={`text-sm font-bold ${
              acca.status === 'won' ? 'text-green-400' : acca.status === 'lost' ? 'text-red-400' : 'text-zinc-500'
            }`}
          >
            {acca.status.toUpperCase()}
            {acca.pl != null && ` ${acca.pl > 0 ? '+' : ''}£${penceToPounds(Math.abs(acca.pl))}`}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {legs.map(({ tip, homeTeam, awayTeam }) => (
          <div key={tip.id} className="flex items-center justify-between rounded-lg bg-zinc-800 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">{homeTeam} vs {awayTeam}</p>
              <p className="text-xs text-zinc-400">{MARKET_LABELS[tip.market_type] ?? tip.market_type}</p>
            </div>
            <OddsTag odds={tip.odds} />
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-700 pt-3">
        <div>
          <span className="text-xs text-zinc-500">Combined Odds</span>
          <p className="text-2xl font-bold text-white">{acca.combined_odds.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-zinc-500">£10 stake</span>
          <p className="text-lg font-bold text-emerald-400">
            £{(acca.combined_odds * 10).toFixed(2)} return
          </p>
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 text-xs text-zinc-500 hover:text-zinc-300"
      >
        {expanded ? 'Hide details' : 'Show reasons'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-zinc-700 pt-3">
          {legs.map(({ tip }) => (
            <div key={tip.id}>
              <p className="text-xs font-medium text-zinc-300">{MARKET_LABELS[tip.market_type]}</p>
              <ul className="ml-3">
                {tip.reasons.slice(0, 2).map((r, i) => (
                  <li key={i} className="text-xs text-zinc-500">- {r}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
