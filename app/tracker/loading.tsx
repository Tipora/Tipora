export default function TrackerLoading() {
  return (
    <div>
      <div className="mb-8">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-800" />
        <div className="mt-2 h-4 w-56 animate-pulse rounded bg-zinc-800" />
      </div>
      <div className="mb-6 flex gap-1 rounded-lg bg-zinc-800 p-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 flex-1 animate-pulse rounded-md bg-zinc-700" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-zinc-800 p-4 text-center">
            <div className="mx-auto h-3 w-12 animate-pulse rounded bg-zinc-700" />
            <div className="mx-auto mt-2 h-7 w-16 animate-pulse rounded bg-zinc-700" />
          </div>
        ))}
      </div>
      <div className="mt-6 h-64 animate-pulse rounded-xl bg-zinc-800" />
    </div>
  );
}
