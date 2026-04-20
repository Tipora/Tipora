export default function FixtureLoading() {
  return (
    <div>
      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
        <div className="mx-auto h-4 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="mx-auto mt-3 h-9 w-64 animate-pulse rounded bg-zinc-800" />
        <div className="mx-auto mt-3 h-5 w-48 animate-pulse rounded bg-zinc-800" />
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="h-44 animate-pulse rounded-xl bg-zinc-800" />
        <div className="h-44 animate-pulse rounded-xl bg-zinc-800" />
      </div>
      <div className="mb-4">
        <div className="h-7 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="mt-2 h-4 w-56 animate-pulse rounded bg-zinc-800" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
        ))}
      </div>
    </div>
  );
}
