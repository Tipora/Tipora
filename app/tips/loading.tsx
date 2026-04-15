export default function TipsLoading() {
  return (
    <div>
      <div className="mb-8">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-800" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-zinc-800" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-5 w-24 animate-pulse rounded-full bg-zinc-800" />
              <div className="h-4 w-16 animate-pulse rounded bg-zinc-800" />
            </div>
            <div className="h-5 w-40 animate-pulse rounded bg-zinc-800" />
            <div className="mt-2 h-4 w-28 animate-pulse rounded bg-zinc-800" />
            <div className="mt-3 flex items-center gap-2">
              <div className="h-2 w-24 animate-pulse rounded-full bg-zinc-800" />
              <div className="h-4 w-6 animate-pulse rounded bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
