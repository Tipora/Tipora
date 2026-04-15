"use client";

import { useState } from 'react';

interface BookmarkButtonProps {
  tipId: number;
  initialBookmarked?: boolean;
}

export function BookmarkButton({ tipId, initialBookmarked = false }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipId }),
      });

      if (res.status === 401) {
        // Not signed in — redirect to sign in
        window.location.href = '/auth/sign-in';
        return;
      }

      const data = await res.json();
      setBookmarked(!!data.bookmarked);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark tip'}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
        bookmarked
          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
          : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-white'
      }`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M5 4v16l7-4 7 4V4a1 1 0 00-1-1H6a1 1 0 00-1 1z" />
      </svg>
      {bookmarked ? 'Saved' : 'Save'}
    </button>
  );
}
