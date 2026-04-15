export default function GameAccaLoading() {
  return (
    <div>
      <div className="mb-8">
        <div className="h-8 w-36 animate-pulse rounded-lg bg-zinc-800" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-zinc-800" />
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="mb-4 h-6 w-28 animate-pulse rounded-full bg-zinc-800" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-zinc-800 px-3 py-3">
              <div>
                <div className="h-4 w-36 animate-pulse rounded bg-zinc-700" />
                <div className="mt-1 h-3 w-24 animate-pulse rounded bg-zinc-700" />
              </div>
              <div className="h-5 w-10 animate-pulse rounded bg-zinc-700" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-zinc-700 pt-3">
          <div className="h-8 w-16 animate-pulse rounded bg-zinc-800" />
          <div className="h-6 w-28 animate-pulse rounded bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
