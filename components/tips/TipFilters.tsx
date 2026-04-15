"use client";

import { useState } from 'react';
import type { StatType, TipTag } from '@/types/tip';

const LEAGUE_OPTIONS = [
  { value: 'all', label: 'All Leagues' },
  { value: 'Premier League', label: 'Premier League' },
  { value: 'La Liga', label: 'La Liga' },
  { value: 'Serie A', label: 'Serie A' },
  { value: 'Bundesliga', label: 'Bundesliga' },
  { value: 'Ligue 1', label: 'Ligue 1' },
  { value: 'Champions League', label: 'Champions League' },
  { value: 'Europa League', label: 'Europa League' },
];

const MARKET_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Markets' },
  { value: 'goals', label: 'Goals' },
  { value: 'cards', label: 'Cards & Fouls' },
  { value: 'shots', label: 'Shots' },
  { value: 'corners', label: 'Corners' },
  { value: 'result', label: 'Match Result' },
  { value: 'player', label: 'Player Props' },
];

const TAG_OPTIONS: { value: TipTag | 'all'; label: string }[] = [
  { value: 'all', label: 'All Tags' },
  { value: 'BANKER', label: 'Banker' },
  { value: 'VALUE', label: 'Value' },
  { value: 'BOLD', label: 'Bold' },
  { value: 'LONGSHOT', label: 'Longshot' },
];

export interface TipFilterState {
  league: string;
  marketGroup: string;
  tag: TipTag | 'all';
  minConfidence: number;
}

interface TipFiltersProps {
  filters: TipFilterState;
  onChange: (filters: TipFilterState) => void;
}

export function TipFilters({ filters, onChange }: TipFiltersProps) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      <select
        value={filters.league}
        onChange={e => onChange({ ...filters, league: e.target.value })}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 focus:border-emerald-500 focus:outline-none"
      >
        {LEAGUE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <select
        value={filters.marketGroup}
        onChange={e => onChange({ ...filters, marketGroup: e.target.value })}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 focus:border-emerald-500 focus:outline-none"
      >
        {MARKET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <select
        value={filters.tag}
        onChange={e => onChange({ ...filters, tag: e.target.value as TipTag | 'all' })}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 focus:border-emerald-500 focus:outline-none"
      >
        {TAG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5">
        <span className="text-xs text-zinc-500">Min:</span>
        <input
          type="range"
          min={70}
          max={100}
          value={filters.minConfidence}
          onChange={e => onChange({ ...filters, minConfidence: Number(e.target.value) })}
          className="h-1 w-20 accent-emerald-500"
        />
        <span className="text-xs font-medium tabular-nums text-zinc-300">{filters.minConfidence}</span>
      </div>
    </div>
  );
}

const GOAL_MARKETS: StatType[] = ['over_0_5_goals', 'over_1_5_goals', 'over_2_5_goals', 'over_3_5_goals', 'btts', 'clean_sheet', 'first_half_goal'];
const CARD_MARKETS: StatType[] = ['yellow_card', 'red_card', 'foul_committed', 'foul_drawn', 'player_1_plus_foul', 'player_2_plus_fouls', 'over_2_5_cards', 'over_3_5_cards', 'over_4_5_cards', 'over_20_5_fouls', 'over_22_5_fouls'];
const SHOT_MARKETS: StatType[] = ['shot', 'shot_on_target', 'player_1_plus_shot', 'player_2_plus_shots', 'player_3_plus_shots', 'player_1_plus_sot', 'player_2_plus_sot'];
const CORNER_MARKETS: StatType[] = ['over_8_5_corners', 'over_9_5_corners', 'over_10_5_corners'];
const RESULT_MARKETS: StatType[] = ['home_win', 'away_win', 'draw'];
const PLAYER_MARKETS: StatType[] = ['goal', 'anytime_goalscorer', 'assist', 'score_or_assist'];

export function matchesMarketGroup(marketType: StatType, group: string): boolean {
  if (group === 'all') return true;
  if (group === 'goals') return GOAL_MARKETS.includes(marketType);
  if (group === 'cards') return CARD_MARKETS.includes(marketType);
  if (group === 'shots') return SHOT_MARKETS.includes(marketType);
  if (group === 'corners') return CORNER_MARKETS.includes(marketType);
  if (group === 'result') return RESULT_MARKETS.includes(marketType);
  if (group === 'player') return PLAYER_MARKETS.includes(marketType);
  return true;
}
