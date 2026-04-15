"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Sign up failed');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-sm py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Check your email</h1>
        <p className="mt-2 text-sm text-zinc-400">
          We&apos;ve sent a confirmation link to <strong className="text-white">{email}</strong>.
          Click the link to activate your account.
        </p>
        <Link href="/auth/sign-in" className="mt-6 inline-block text-sm text-emerald-400 hover:text-emerald-300">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="text-2xl font-bold text-white">Create an account</h1>
      <p className="mt-1 text-sm text-zinc-500">Start getting data-driven tips</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && (
          <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-400">Email</label>
          <input
            id="email" type="email" required value={email}
            onChange={e => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-400">Password</label>
          <input
            id="password" type="password" required value={password}
            onChange={e => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-zinc-400">Confirm password</label>
          <input
            id="confirm" type="password" required value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
            placeholder="Repeat password"
          />
        </div>

        <button
          type="submit" disabled={loading}
          className="w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>

        <p className="text-center text-xs text-zinc-600">
          By signing up you agree to our{' '}
          <Link href="/terms" className="underline hover:text-zinc-400">Terms</Link> and{' '}
          <Link href="/privacy" className="underline hover:text-zinc-400">Privacy Policy</Link>.
          You must be 18+.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600">
        Already have an account?{' '}
        <Link href="/auth/sign-in" className="text-emerald-400 hover:text-emerald-300">Sign in</Link>
      </p>
    </div>
  );
}
