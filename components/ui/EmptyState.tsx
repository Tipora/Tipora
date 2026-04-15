import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
  action?: { label: string; href: string };
}

export function EmptyState({ title, description, icon = '🎯', action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-zinc-800 py-16 text-center">
      <div className="mb-4 text-4xl">{icon}</div>
      <p className="text-lg font-medium text-zinc-300">{title}</p>
      {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-6 inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
