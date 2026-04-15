import type { TipStatus } from './tip';

export type AccaType = 'game' | 'weekend';

export interface AccaLabel {
  label: string;
  color: string;
}

export interface Accumulator {
  id?: number;
  acca_type: AccaType;
  tip_ids: number[];
  combined_odds: number;
  stake: number;
  potential_return: number;
  status: TipStatus;
  acca_date: string;
  pl?: number | null;
  label?: AccaLabel;
  created_at?: string;
}
