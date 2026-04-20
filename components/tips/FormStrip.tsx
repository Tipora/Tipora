interface FormStripProps {
  results: Array<'W' | 'D' | 'L'>;
  label?: string;
}

const COLORS = {
  W: 'bg-green-500',
  D: 'bg-yellow-500',
  L: 'bg-red-500',
};

export function FormStrip({ results, label }: FormStripProps) {
  if (!results.length) return null;

  return (
    <div className="flex items-center gap-1.5">
      {label && <span className="w-5 text-[10px] font-medium uppercase text-zinc-500">{label}</span>}
      {results.map((r, i) => (
        <span
          key={i}
          className={`h-4 w-4 rounded-sm text-center text-[9px] font-bold leading-4 text-black ${COLORS[r]}`}
          title={r === 'W' ? 'Win' : r === 'D' ? 'Draw' : 'Loss'}
        >
          {r}
        </span>
      ))}
      <span className="ml-1 text-[10px] tabular-nums text-zinc-500">
        {results.filter(r => r === 'W').length}W {results.filter(r => r === 'D').length}D {results.filter(r => r === 'L').length}L
      </span>
    </div>
  );
}
