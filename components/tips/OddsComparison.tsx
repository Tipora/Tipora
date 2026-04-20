interface BookmakerOdds {
  name: string;
  odds: number;
  url: string;
}

interface OddsComparisonProps {
  market: string;
  bookmakers: BookmakerOdds[];
}

export function OddsComparison({ market, bookmakers }: OddsComparisonProps) {
  if (!bookmakers.length) return null;

  const best = bookmakers.reduce((a, b) => a.odds > b.odds ? a : b);

  return (
    <div className="rounded-lg border border-zinc-800 p-3">
      <p className="mb-2 text-xs font-medium text-zinc-500">{market} — Odds Comparison</p>
      <div className="space-y-1.5">
        {bookmakers.map(bm => (
          <a
            key={bm.name}
            href={bm.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="flex items-center justify-between rounded-md bg-zinc-800/50 px-3 py-1.5 text-sm hover:bg-zinc-800 transition-colors"
          >
            <span className="text-zinc-300">{bm.name}</span>
            <span className={`tabular-nums font-bold ${bm.name === best.name ? 'text-emerald-400' : 'text-white'}`}>
              {bm.odds.toFixed(2)}
              {bm.name === best.name && <span className="ml-1 text-[9px] text-emerald-400">BEST</span>}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
