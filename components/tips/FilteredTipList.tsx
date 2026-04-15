"use client";

import { useState } from 'react';
import type { Tip } from '@/types/tip';
import { TipCard } from './TipCard';
import { TipFilters, matchesMarketGroup } from './TipFilters';
import type { TipFilterState } from './TipFilters';

export interface TipMeta {
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
  leagueLogo?: string | null;
  kickoff: string;
  fixtureStatus?: string;
}

interface FilteredTipListProps {
  tips: Tip[];
  meta: Record<number, TipMeta>;
  showBreakdown?: boolean;
  bookmarkedIds?: Set<number>;
}

export function FilteredTipList({ tips, meta, showBreakdown = false, bookmarkedIds }: FilteredTipListProps) {
  const [filters, setFilters] = useState<TipFilterState>({
    league: 'all',
    marketGroup: 'all',
    tag: 'all',
    minConfidence: 70,
  });

  const filtered = tips.filter(tip => {
    if (filters.tag !== 'all' && tip.tag !== filters.tag) return false;
    if (tip.confidence_score < filters.minConfidence) return false;
    if (!matchesMarketGroup(tip.market_type, filters.marketGroup)) return false;
    if (filters.league !== 'all') {
      const tipLeague = meta[tip.id]?.leagueName ?? '';
      if (tipLeague !== filters.league) return false;
    }
    return true;
  });

  return (
    <div>
      <TipFilters filters={filters} onChange={setFilters} />

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 py-12 text-center">
          <p className="text-zinc-500">No tips match your filters.</p>
          <button
            onClick={() => setFilters({ league: 'all', marketGroup: 'all', tag: 'all', minConfidence: 70 })}
            className="mt-2 text-xs text-emerald-400 hover:text-emerald-300"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-zinc-600">{filtered.length} tip{filtered.length !== 1 ? 's' : ''} found</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map(tip => {
              const m = meta[tip.id] ?? {
                homeTeam: 'Home',
                awayTeam: 'Away',
                leagueName: 'Premier League',
                leagueLogo: null,
                kickoff: new Date().toISOString(),
              };
              return (
                <TipCard
                  key={tip.id}
                  tip={tip}
                  homeTeam={m.homeTeam}
                  awayTeam={m.awayTeam}
                  leagueName={m.leagueName}
                  leagueLogo={m.leagueLogo}
                  kickoff={m.kickoff}
                  fixtureStatus={m.fixtureStatus}
                  showBreakdown={showBreakdown}
                  initialBookmarked={bookmarkedIds?.has(tip.id) ?? false}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
