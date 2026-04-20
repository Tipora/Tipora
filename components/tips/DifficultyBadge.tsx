interface DifficultyBadgeProps {
  label: string;
  color: string;
}

export function DifficultyBadge({ label, color }: DifficultyBadgeProps) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: `${color}15`, color }}
    >
      {label}
    </span>
  );
}
