"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function ProfilePage() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  async function handleSavePrefs() {
    try {
      await fetch('/api/profile/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_alerts: emailAlerts }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    }
  }

  async function handleSignOut() {
    await fetch('/api/auth/sign-out', { method: 'POST' });
    window.location.href = '/';
  }

  async function handleDeleteAccount() {
    if (!confirm('Are you sure? This action cannot be undone.')) return;
    try {
      await fetch('/api/profile/delete', { method: 'POST' });
      window.location.href = '/';
    } catch {
      // silent
    }
  }

  return (
    <div className="mx-auto max-w-lg py-8">
      <h1 className="text-2xl font-bold text-white">Profile</h1>

      <div className="mt-8 space-y-8">
        {/* Subscription */}
        <section className="rounded-xl border border-zinc-800 p-5">
          <h2 className="text-base font-semibold text-white">Subscription</h2>
          <p className="mt-1 text-sm text-zinc-500">Manage your plan</p>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">Free Plan</span>
            </div>
            <Link
              href="/pricing"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
            >
              Upgrade to Pro
            </Link>
          </div>
        </section>

        {/* Email Preferences */}
        <section className="rounded-xl border border-zinc-800 p-5">
          <h2 className="text-base font-semibold text-white">Email Preferences</h2>
          <p className="mt-1 text-sm text-zinc-500">Control what emails you receive</p>
          <div className="mt-4 flex items-center justify-between">
            <label className="flex items-center gap-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={e => setEmailAlerts(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
              />
              Daily tip digest &amp; settlement summaries
            </label>
            <button
              onClick={handleSavePrefs}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-white hover:border-zinc-500"
            >
              {saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </section>

        {/* Saved Tips */}
        <section className="rounded-xl border border-zinc-800 p-5">
          <h2 className="text-base font-semibold text-white">Saved Tips</h2>
          <p className="mt-1 text-sm text-zinc-500">View tips you&apos;ve bookmarked</p>
          <Link
            href="/profile/bookmarks"
            className="mt-4 inline-block rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-white hover:border-zinc-500"
          >
            View saved tips
          </Link>
        </section>

        {/* Account Actions */}
        <section className="rounded-xl border border-zinc-800 p-5">
          <h2 className="text-base font-semibold text-white">Account</h2>
          <div className="mt-4 flex flex-col gap-3">
            <button
              onClick={handleSignOut}
              className="w-full rounded-lg border border-zinc-700 py-2.5 text-sm font-medium text-white hover:border-zinc-500"
            >
              Sign out
            </button>
            <button
              onClick={() => setShowDelete(!showDelete)}
              className="w-full rounded-lg border border-red-900/50 py-2.5 text-sm font-medium text-red-400 hover:border-red-700"
            >
              Delete account
            </button>
            {showDelete && (
              <div className="rounded-lg bg-red-500/10 p-4">
                <p className="text-sm text-red-400">
                  This will permanently delete your account and all data. This cannot be undone.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                >
                  Confirm deletion
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
