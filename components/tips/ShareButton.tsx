"use client";

import type { Tip } from '@/types/tip';
import { MARKET_LABELS } from '@/lib/utils/markets';

interface ShareButtonProps {
  tip: Tip;
  homeTeam: string;
  awayTeam: string;
}

export function ShareButton({ tip, homeTeam, awayTeam }: ShareButtonProps) {
  function handleShare() {
    const market = MARKET_LABELS[tip.market_type] ?? tip.market_type;
    const text = `${homeTeam} vs ${awayTeam}\n${market} @ ${tip.odds.toFixed(2)}\nConfidence: ${tip.confidence_score}/100 (${tip.tag})\n\nPowered by tipora.bet`;
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=550,height=420');
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-500 hover:border-zinc-500 hover:text-white transition-colors"
      aria-label="Share on X"
    >
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      Share
    </button>
  );
}
