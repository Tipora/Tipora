interface TipExplanationProps {
  reasons: string[];
}

export function TipExplanation({ reasons }: TipExplanationProps) {
  return (
    <ul className="mt-3 space-y-1.5 border-t border-zinc-700 pt-3">
      {reasons.slice(0, 4).map((reason, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
          {reason}
        </li>
      ))}
    </ul>
  );
}
