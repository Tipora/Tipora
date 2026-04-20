"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface LiveScoreProps {
  fixtureId: number;
  initialHomeScore: number | null;
  initialAwayScore: number | null;
  initialStatus: string;
}

export function LiveScore({ fixtureId, initialHomeScore, initialAwayScore, initialStatus }: LiveScoreProps) {
  const [homeScore, setHomeScore] = useState(initialHomeScore);
  const [awayScore, setAwayScore] = useState(initialAwayScore);
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createClient(url, key);

    const channel = supabase
      .channel(`fixture-${fixtureId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fixtures',
          filter: `id=eq.${fixtureId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          setHomeScore(row.home_score as number | null);
          setAwayScore(row.away_score as number | null);
          setStatus(row.status as string);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fixtureId]);

  const isLive = ['1H', '2H', 'HT', 'ET'].includes(status);
  const isFinished = status === 'FT' || status === 'AET' || status === 'PEN';

  if (homeScore === null || awayScore === null) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <p className={`text-2xl font-bold ${isLive ? 'text-emerald-400 animate-pulse' : isFinished ? 'text-emerald-400' : 'text-zinc-400'}`}>
        {homeScore} - {awayScore}
      </p>
      {isLive && (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
          LIVE
        </span>
      )}
    </div>
  );
}
