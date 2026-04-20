interface TeamFormProps {
  teamName: string;
  form5: Array<'W' | 'D' | 'L'>;
  form10: Array<'W' | 'D' | 'L'>;
  goalsScored: number;
  goalsConceded: number;
  cleanSheets: number;
  xgAvg: number;
}

export function TeamForm({ teamName, form5, form10, goalsScored, goalsConceded, cleanSheets, xgAvg }: TeamFormProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 className="mb-3 text-base font-semibold text-white">{teamName}</h3>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Last 5</span>
          <div className="flex items-center gap-1">
            {form5.map((r, i) => (
              <span
                key={i}
                className={`h-5 w-5 rounded text-center text-[10px] font-bold leading-5 text-black ${
                  r === 'W' ? 'bg-green-500' : r === 'D' ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Last 10</span>
          <div className="flex items-center gap-1">
            {form10.map((r, i) => (
              <span
                key={i}
                className={`h-5 w-5 rounded text-center text-[10px] font-bold leading-5 text-black ${
                  r === 'W' ? 'bg-green-500' : r === 'D' ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
        <div className="rounded bg-zinc-800 py-1.5">
          <p className="font-bold text-white">{goalsScored.toFixed(1)}</p>
          <p className="text-zinc-500">GF/gm</p>
        </div>
        <div className="rounded bg-zinc-800 py-1.5">
          <p className="font-bold text-white">{goalsConceded.toFixed(1)}</p>
          <p className="text-zinc-500">GA/gm</p>
        </div>
        <div className="rounded bg-zinc-800 py-1.5">
          <p className="font-bold text-white">{cleanSheets}</p>
          <p className="text-zinc-500">CS</p>
        </div>
        <div className="rounded bg-zinc-800 py-1.5">
          <p className="font-bold text-white">{xgAvg.toFixed(1)}</p>
          <p className="text-zinc-500">xG</p>
        </div>
      </div>
    </div>
  );
}
