interface OddsTagProps {
  odds: number;
}

export function OddsTag({ odds }: OddsTagProps) {
  return (
    <span className="inline-flex items-center rounded-md bg-zinc-700 px-2 py-0.5 text-sm font-bold text-white tabular-nums">
      {odds.toFixed(2)}
    </span>
  );
}
