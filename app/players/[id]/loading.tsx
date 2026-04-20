export default function PlayerLoading() {
  return (
    <div>
      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 animate-pulse rounded-full bg-zinc-800" />
          <div>
            <div className="h-7 w-48 animate-pulse rounded bg-zinc-800" />
            <div className="mt-2 h-4 w-32 animate-pulse rounded bg-zinc-800" />
          </div>
        </div>
      </div>
      <div className="mb-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-800" />
        ))}
      </div>
    </div>
  );
}
