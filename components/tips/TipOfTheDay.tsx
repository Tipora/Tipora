import type { Tip } from '@/types/tip';
import { MARKET_LABELS, TAG_COLORS } from '@/lib/utils/markets';
import { OddsTag } from '@/components/ui/OddsTag';
import { ConfidenceBar } from './ConfidenceBar';
import Link from 'next/link';

interface TipOfTheDayProps {
  tip: Tip;
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
}

export function TipOfTheDay({ tip, homeTeam, awayTeam, leagueName }: TipOfTheDayProps) {
  const subject = tip.selection.split(' — ')[0];
  const hasVs = subject.includes(' vs ');
  const tagColor = TAG_COLORS[tip.tag];
  const marketLabel = MARKET_LABELS[tip.market_type] ?? tip.market_type;

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-zinc-900 p-6">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Tip of the Day</span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={{ backgroundColor: `${tagColor}20`, color: tagColor }}
        >
          {tip.tag}
        </span>
      </div>

      <p className="text-xs text-zinc-500">{leagueName}</p>
      <p className="mt-1 text-sm text-zinc-400">{homeTeam} vs {awayTeam}</p>

      {!hasVs && (
        <p className="mt-2 text-2xl font-bold text-white">{subject}</p>
      )}
      <p className={`${hasVs ? 'mt-2 text-2xl font-bold' : 'mt-1 text-lg'} text-emerald-400`}>
        {marketLabel}
      </p>

      <div className="mt-4 flex items-center gap-4">
        <OddsTag odds={tip.odds} />
        <ConfidenceBar score={tip.confidence_score} />
      </div>

      {tip.reasons.length > 0 && (
        <ul className="mt-4 space-y-1">
          {tip.reasons.slice(0, 3).map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              {r}
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/tips"
        className="mt-4 inline-block text-xs text-emerald-400 hover:text-emerald-300"
      >
        View all tips &rarr;
      </Link>
    </div>
  );
}
