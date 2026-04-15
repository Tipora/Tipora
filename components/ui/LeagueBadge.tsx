import Image from 'next/image';

interface LeagueBadgeProps {
  name: string;
  logoUrl?: string | null;
}

export function LeagueBadge({ name, logoUrl }: LeagueBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
      {logoUrl && (
        <Image src={logoUrl} alt={name} width={14} height={14} className="rounded-full" />
      )}
      {name}
    </span>
  );
}
