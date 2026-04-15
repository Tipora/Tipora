"use client";

import { useState } from 'react';
import Link from 'next/link';

const NAV_LINKS = [
  { href: '/tips', label: 'Tips' },
  { href: '/tips/acca/game', label: 'Game Acca' },
  { href: '/tips/acca/weekend', label: 'Weekend Acca' },
  { href: '/tracker', label: 'Tracker' },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 hover:text-white"
        aria-label="Toggle menu"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4l12 12M16 4L4 16" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 border-b border-zinc-800 bg-zinc-950 px-4 pb-4">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              {label}
            </Link>
          ))}
          <Link
            href="/auth/sign-in"
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-lg bg-emerald-500 px-4 py-2.5 text-center text-sm font-semibold text-black"
          >
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
}
