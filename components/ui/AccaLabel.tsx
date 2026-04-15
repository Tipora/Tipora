interface AccaLabelProps {
  label: string;
  color: string;
}

export function AccaLabel({ label, color }: AccaLabelProps) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
      style={{ backgroundColor: `${color}20`, color, borderColor: color, borderWidth: 1 }}
    >
      {label}
    </span>
  );
}
