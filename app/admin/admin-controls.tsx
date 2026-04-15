"use client";

import { useState } from 'react';

const JOBS = [
  { name: 'Calculate Trends', endpoint: '/api/trends/calculate' },
  { name: 'Generate Tips', endpoint: '/api/tips/generate' },
  { name: 'Build Game Acca', endpoint: '/api/acca/game' },
  { name: 'Build Weekend Acca', endpoint: '/api/acca/weekend' },
  { name: 'Settle Tips', endpoint: '/api/tips/settle' },
];

export function AdminControls() {
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; body: unknown }>>({});

  async function runJob(job: typeof JOBS[number]) {
    setRunning(job.name);
    try {
      const res = await fetch('/api/admin/run-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: job.endpoint }),
      });
      const body = await res.json();
      setResults(prev => ({ ...prev, [job.name]: { ok: res.ok, body } }));
    } catch (err) {
      setResults(prev => ({ ...prev, [job.name]: { ok: false, body: String(err) } }));
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 p-5">
      <h2 className="mb-3 text-lg font-semibold text-white">Manual Controls</h2>
      <p className="mb-4 text-sm text-zinc-500">Trigger pipeline jobs manually</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {JOBS.map(job => (
          <div key={job.name} className="rounded-lg bg-zinc-800/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">{job.name}</span>
              <button
                onClick={() => runJob(job)}
                disabled={running !== null}
                className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
              >
                {running === job.name ? 'Running...' : 'Run'}
              </button>
            </div>
            {results[job.name] && (
              <pre className={`mt-2 overflow-auto rounded bg-zinc-900 p-2 text-[10px] ${results[job.name].ok ? 'text-green-400' : 'text-red-400'}`}>
                {JSON.stringify(results[job.name].body, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
