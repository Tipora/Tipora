"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
      <p className="mt-2 text-sm text-zinc-500">
        {error.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400"
      >
        Try again
      </button>
    </div>
  );
}
