"use client";

import { useState } from 'react';
import type { Tip } from '@/types/tip';
import { ConfidenceBar } from './ConfidenceBar';
import { TipExplanation } from './TipExplanation';
import { ShareButton } from './ShareButton';
import { BookmarkButton } from './BookmarkButton';
import { KickoffBadge } from './KickoffBadge';
import { AffiliateButton } from '@/components/tips/AffiliateButton';
import { OddsTag } from '@/components/ui/OddsTag';
import { LeagueBadge } from '@/components/ui/LeagueBadge';
import { MARKET_LABELS, TAG_COLORS } from '@/lib/utils/markets';
import { formatKickoff } from '@/lib/utils/dates';
import { penceToPounds } from '@/lib/utils/odds';

interface TipCardProps {
  tip: Tip;
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
  leagueLogo?: string | null;
  kickoff: string;
  fixtureStatus?: string;
  showBreakdown?: boolean;
  initialBookmarked?: boolean;
}

/**
 * Extract the tip subject — the player or team the tip is about.
 * - "Casemiro — 1+ Fouls"          → "Casemiro"
 * - "Arsenal vs Tottenham — BTTS"  → null (match-level, redundant with header)
 * - "Liverpool to beat Man Utd"    → null (the match header covers it)
 * - "Manchester United — Clean Sheet" → "Manchester United"
 */
function getTipSubject(selection: string): string | null {
  const parts = selection.split(' — ');
  if (parts.length < 2) return null;
  const prefix = parts[0].trim();
  if (prefix.includes(' vs ')) return null;
  return prefix;
}

export function TipCard({ tip, homeTeam, awayTeam, leagueName, leagueLogo, kickoff, fixtureStatus, showBreakdown = false, initialBookmarked = false }: TipCardProps) {
  const [expanded, setExpanded] = useState(false);
  const tagColor = TAG_COLORS[tip.tag];
  const isSettled = tip.status !== 'pending';
  const subject = getTipSubject(tip.selection);
  const marketLabel = MARKET_LABELS[tip.market_type] ?? tip.market_type;

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 transition-colors hover:border-zinc-600">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <LeagueBadge name={leagueName} logoUrl={leagueLogo} />
            <span className="text-xs text-zinc-500">{formatKickoff(kickoff)}</span>
            <KickoffBadge kickoff={kickoff} status={fixtureStatus} />
          </div>
          <a
            href={`/fixtures/${tip.fixture_id}`}
            className="block text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors"
          >
            {homeTeam} vs {awayTeam} →
          </a>
          {subject && (
            <p className="mt-1 text-lg font-bold text-white">{subject}</p>
          )}
          <p className={`${subject ? 'mt-0.5 text-sm' : 'mt-1 text-lg font-bold'} text-emerald-400`}>
            {marketLabel}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-bold"
            style={{ backgroundColor: `${tagColor}20`, color: tagColor }}
          >
            {tip.tag}
          </span>
          <OddsTag odds={tip.odds} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <ConfidenceBar score={tip.confidence_score} />
        {isSettled && (
          <span
            className={`text-sm font-bold ${
              tip.status === 'won' ? 'text-green-400' : tip.status === 'lost' ? 'text-red-400' : 'text-zinc-500'
            }`}
          >
            {tip.status.toUpperCase()}
            {tip.pl !== null && ` ${tip.pl > 0 ? '+' : ''}£${penceToPounds(Math.abs(tip.pl))}`}
          </span>
        )}
      </div>

      {showBreakdown && tip.confidence_breakdown && (
        <div className="mt-3 grid grid-cols-5 gap-1.5 text-center text-xs">
          {Object.entries(tip.confidence_breakdown).map(([key, val]) => (
            <div key={key} className="rounded bg-zinc-800 py-1">
              <div className="font-bold text-white">{val as number}</div>
              <div className="text-zinc-500">{key}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <BookmarkButton tipId={tip.id} initialBookmarked={initialBookmarked} />
        <AffiliateButton odds={tip.odds} />
        <ShareButton tip={tip} homeTeam={homeTeam} awayTeam={awayTeam} />
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 text-xs text-zinc-500 hover:text-zinc-300"
      >
        {expanded ? 'Hide reasons' : 'Show reasons'}
      </button>

      {expanded && <TipExplanation reasons={tip.reasons} />}
    </div>
  );
}
