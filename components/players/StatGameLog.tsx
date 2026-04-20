interface GameLogEntry {
  date: string;
  opponent: string;
  result: string;
  minutes: number;
  shots: number;
  shotsOnTarget: number;
  foulsCommitted: number;
  foulsDrawn: number;
  yellowCards: number;
  goals: number;
  assists: number;
}

interface StatGameLogProps {
  entries: GameLogEntry[];
  playerName: string;
}

export function StatGameLog({ entries, playerName }: StatGameLogProps) {
  if (!entries.length) {
    return <p className="py-6 text-center text-sm text-zinc-500">No match data for {playerName}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-700 text-[10px] uppercase text-zinc-500">
            <th className="pb-2 pr-3">Date</th>
            <th className="pb-2 pr-3">Opp</th>
            <th className="pb-2 pr-3">Result</th>
            <th className="pb-2 pr-2 text-center">Min</th>
            <th className="pb-2 pr-2 text-center">Sh</th>
            <th className="pb-2 pr-2 text-center">SOT</th>
            <th className="pb-2 pr-2 text-center">FC</th>
            <th className="pb-2 pr-2 text-center">FW</th>
            <th className="pb-2 pr-2 text-center">YC</th>
            <th className="pb-2 pr-2 text-center">G</th>
            <th className="pb-2 text-center">A</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i} className="border-b border-zinc-800">
              <td className="py-1.5 pr-3 text-xs text-zinc-500">{e.date}</td>
              <td className="py-1.5 pr-3 text-xs text-zinc-300">{e.opponent}</td>
              <td className="py-1.5 pr-3 text-xs">
                <span className={e.result.startsWith('W') ? 'text-green-400' : e.result.startsWith('L') ? 'text-red-400' : 'text-yellow-400'}>
                  {e.result}
                </span>
              </td>
              <td className="py-1.5 pr-2 text-center tabular-nums text-zinc-400">{e.minutes}</td>
              <td className="py-1.5 pr-2 text-center tabular-nums text-white font-medium">{e.shots}</td>
              <td className="py-1.5 pr-2 text-center tabular-nums text-white font-medium">{e.shotsOnTarget}</td>
              <td className="py-1.5 pr-2 text-center tabular-nums text-white font-medium">{e.foulsCommitted}</td>
              <td className="py-1.5 pr-2 text-center tabular-nums text-white font-medium">{e.foulsDrawn}</td>
              <td className="py-1.5 pr-2 text-center tabular-nums text-yellow-400">{e.yellowCards || ''}</td>
              <td className="py-1.5 pr-2 text-center tabular-nums text-emerald-400">{e.goals || ''}</td>
              <td className="py-1.5 text-center tabular-nums text-emerald-400">{e.assists || ''}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-zinc-700 text-xs font-bold">
            <td className="pt-2 pr-3 text-zinc-400" colSpan={3}>Average</td>
            <td className="pt-2 pr-2 text-center tabular-nums text-zinc-300">{avg(entries, 'minutes')}</td>
            <td className="pt-2 pr-2 text-center tabular-nums text-white">{avg(entries, 'shots')}</td>
            <td className="pt-2 pr-2 text-center tabular-nums text-white">{avg(entries, 'shotsOnTarget')}</td>
            <td className="pt-2 pr-2 text-center tabular-nums text-white">{avg(entries, 'foulsCommitted')}</td>
            <td className="pt-2 pr-2 text-center tabular-nums text-white">{avg(entries, 'foulsDrawn')}</td>
            <td className="pt-2 pr-2 text-center tabular-nums text-yellow-400">{avg(entries, 'yellowCards')}</td>
            <td className="pt-2 pr-2 text-center tabular-nums text-emerald-400">{avg(entries, 'goals')}</td>
            <td className="pt-2 text-center tabular-nums text-emerald-400">{avg(entries, 'assists')}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function avg(entries: GameLogEntry[], key: keyof GameLogEntry): string {
  const values = entries.map(e => Number(e[key]) || 0);
  if (!values.length) return '0.0';
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
}
