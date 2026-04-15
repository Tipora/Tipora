import { redirect } from 'next/navigation';
import { createSafeServerClient } from '@/lib/supabase/safe-client';
import { isAdmin } from '@/lib/admin';
import { AdminControls } from './admin-controls';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const ok = await isAdmin();
  if (!ok) redirect('/');

  const supabase = await createSafeServerClient();
  if (!supabase) return null;

  const today = new Date().toISOString().split('T')[0];

  const [
    { count: tipsToday },
    { count: totalFixtures },
    { count: totalPlayers },
    { count: totalTrends },
    { count: pendingTips },
    { data: recentRuns },
  ] = await Promise.all([
    supabase.from('tips').select('*', { count: 'exact', head: true }).eq('tip_date', today),
    supabase.from('fixtures').select('*', { count: 'exact', head: true }),
    supabase.from('players').select('*', { count: 'exact', head: true }),
    supabase.from('player_trends').select('*', { count: 'exact', head: true }),
    supabase.from('tips').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('pipeline_runs').select('*').order('created_at', { ascending: false }).limit(15),
  ]);

  const stats = [
    { label: "Tips Today", value: tipsToday ?? 0 },
    { label: "Pending Tips", value: pendingTips ?? 0 },
    { label: "Fixtures", value: totalFixtures ?? 0 },
    { label: "Players", value: totalPlayers ?? 0 },
    { label: "Player Trends", value: totalTrends ?? 0 },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">Pipeline health and controls</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl bg-zinc-800 p-4 text-center">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-white tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <AdminControls />

      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-white">Recent Pipeline Runs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-xs uppercase text-zinc-500">
                <th className="pb-2 pr-4">Job</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Duration</th>
                <th className="pb-2 pr-4">Result</th>
                <th className="pb-2">When</th>
              </tr>
            </thead>
            <tbody>
              {(recentRuns ?? []).map((run: Record<string, unknown>) => (
                <tr key={run.id as number} className="border-b border-zinc-800">
                  <td className="py-2 pr-4 text-white">{run.job as string}</td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs font-bold ${run.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                      {(run.status as string).toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-zinc-400 tabular-nums">{run.duration_ms as number}ms</td>
                  <td className="py-2 pr-4 text-xs text-zinc-500 font-mono truncate max-w-xs">
                    {JSON.stringify(run.result ?? {})}
                  </td>
                  <td className="py-2 text-xs text-zinc-500">
                    {new Date(run.created_at as string).toLocaleString('en-GB')}
                  </td>
                </tr>
              ))}
              {(!recentRuns || recentRuns.length === 0) && (
                <tr><td colSpan={5} className="py-6 text-center text-zinc-500">No pipeline runs logged yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
