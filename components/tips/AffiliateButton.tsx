"use client";

interface AffiliateButtonProps {
  tipId?: number;
  odds: number;
}

const BOOKMAKERS = [
  { name: 'Bet365', url: 'https://www.bet365.com' },
  { name: 'William Hill', url: 'https://www.williamhill.com' },
  { name: '888sport', url: 'https://www.888sport.com' },
];

export function AffiliateButton({ tipId, odds }: AffiliateButtonProps) {
  const index = Math.floor(odds * 100) % BOOKMAKERS.length;
  const bookie = BOOKMAKERS[index];

  function handleClick() {
    // Fire tracking call (non-blocking)
    fetch('/api/affiliate/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipId, bookmaker: bookie.name }),
    }).catch(() => {});
  }

  return (
    <a
      href={bookie.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
    >
      Bet with {bookie.name}
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}
