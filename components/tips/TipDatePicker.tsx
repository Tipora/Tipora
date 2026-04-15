"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function TipDatePicker() {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);

  function handleChange(newDate: string) {
    setDate(newDate);
    if (newDate === today) {
      router.push('/tips');
    } else {
      router.push(`/tips/${newDate}`);
    }
  }

  function goDay(offset: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    const newDate = d.toISOString().split('T')[0];
    if (newDate > today) return; // can't go into the future
    handleChange(newDate);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => goDay(-1)}
        className="rounded-md border border-zinc-700 px-2 py-1 text-sm text-zinc-400 hover:border-zinc-500 hover:text-white"
        aria-label="Previous day"
      >
        &larr;
      </button>
      <input
        type="date"
        value={date}
        max={today}
        onChange={e => handleChange(e.target.value)}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 focus:border-emerald-500 focus:outline-none"
      />
      <button
        onClick={() => goDay(1)}
        disabled={date >= today}
        className="rounded-md border border-zinc-700 px-2 py-1 text-sm text-zinc-400 hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Next day"
      >
        &rarr;
      </button>
      {date !== today && (
        <button
          onClick={() => handleChange(today)}
          className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
        >
          Today
        </button>
      )}
    </div>
  );
}
