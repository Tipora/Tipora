"use client";

import { useEffect, useState } from 'react';

interface KickoffBadgeProps {
  kickoff: string;
  status?: string; // FT, 1H, 2H, HT, NS, PST, CANC
}

export function KickoffBadge({ kickoff, status }: KickoffBadgeProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Finished
  if (status === 'FT') {
    return <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">FT</span>;
  }

  // Live
  if (status === '1H' || status === '2H' || status === 'HT') {
    const label = status === 'HT' ? 'HT' : 'LIVE';
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
        {label}
      </span>
    );
  }

  if (status === 'PST' || status === 'CANC') {
    return <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{status === 'PST' ? 'Postponed' : 'Cancelled'}</span>;
  }

  // Not started — show countdown
  const kickoffTime = new Date(kickoff).getTime();
  const diffMs = kickoffTime - now;

  if (diffMs <= 0) {
    return <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Starting</span>;
  }

  const diffMins = Math.floor(diffMs / 60_000);
  let label: string;
  if (diffMins < 60) label = `in ${diffMins}m`;
  else if (diffMins < 24 * 60) {
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    label = mins ? `in ${hrs}h ${mins}m` : `in ${hrs}h`;
  } else {
    const days = Math.floor(diffMins / (24 * 60));
    label = `in ${days}d`;
  }

  return <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-400">{label}</span>;
}
