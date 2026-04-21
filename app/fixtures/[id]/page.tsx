import { createSafeServerClient } from '@/lib/supabase/safe-client';
import { redirect } from 'next/navigation';
import { TipCard } from '@/components/tips/TipCard';
import { TeamForm } from '@/components/tips/TeamForm';
import { DifficultyBadge } from '@/components/tips/DifficultyBadge';
import { LiveScore } from '@/components/tips/LiveScore';
import { getTeamForm } from '@/lib/fixtures/get-team-form';
import { getFirstGoalStats } from '@/lib/fixtures/get-first-goal-stats';
import { FirstGoalStats } from '@/components/fixtures/FirstGoalStats';
import { getH2HStats } from '@/lib/fixtures/get-h2h-stats';
import { getSeasonStats } from '@/lib/fixtures/get-season-stats';
import { H2HChart } from '@/components/fixtures/H2HChart';
import { SeasonChart } from '@/components/fixtures/SeasonChart';
import { GoalPeriodChart } from '@/components/fixtures/GoalPeriodChart';
import { getGoalPeriodStats } from '@/lib/fixtures/get-goal-periods';
import { getOpponentStrengthLabel } from '@/lib/trends/confidence';
import { getFixtureContext } from '@/lib/trends/engine';
import { formatKickoff } from '@/lib/utils/dates';
import type { Tip } from '@/types/tip';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Fixture #${id} — Tipora`,
    description: `Top 10 tips and analysis for fixture ${id}`,
  };
}

export default async function FixturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fixtureId = parseInt(id, 10);
  if (isNaN(fixtureId)) redirect('/tips');

  const supabase = await createSafeServerClient();
  if (!supabase) redirect('/tips');

  const { data: fixture } = await supabase
    .from('fixtures')
    .select('*, home_team:teams!fixtures_home_team_id_fkey(api_id, name, logo_url), away_team:teams!fixtures_away_team_id_fkey(api_id, name, logo_url), competitions(name, logo_url)')
    .eq('id', fixtureId)
    .single();

  if (!fixture) redirect('/tips');

  const homeName = fixture.home_team?.name ?? 'Home';
  const awayName = fixture.away_team?.name ?? 'Away';
  const leagueName = fixture.competitions?.name ?? 'League';

  const { data: tips } = await supabase
    .from('tips')
    .select('*')
    .eq('fixture_id', fixtureId)
    .order('confidence_score', { ascending: false })
    .limit(10);

  const tipList = (tips ?? []) as Tip[];

  const [homeForm, awayForm] = await Promise.all([
    getTeamForm(fixture.home_team_id, supabase),
    getTeamForm(fixture.away_team_id, supabase),
  ]);

  const [homeFirstGoal, awayFirstGoal] = await Promise.all([
    getFirstGoalStats(fixture.home_team_id, true, supabase),
    getFirstGoalStats(fixture.away_team_id, false, supabase),
  ]);

  const [h2hMatches, homeSeasonStats, awaySeasonStats] = await Promise.all([
    getH2HStats(fixture.home_team_id, fixture.away_team_id, supabase, 10),
    getSeasonStats(fixture.home_team_id, supabase),
    getSeasonStats(fixture.away_team_id, supabase),
  ]);

  const [homeGoalPeriods, awayGoalPeriods] = await Promise.all([
    getGoalPeriodStats(fixture.home_team_id, supabase, 10),
    getGoalPeriodStats(fixture.away_team_id, supabase, 10),
  ]);

  const context = await getFixtureContext(
    fixture.home_team_id, fixture.away_team_id, fixture.kickoff_at, supabase
  );
  const homeDifficulty = getOpponentStrengthLabel(context, true);
  const awayDifficulty = getOpponentStrengthLabel(context, false);

  let refereeName: string | null = null;
  if (fixture.referee_id) {
    const { data: ref } = await supabase
      .from('referees')
      .select('name, avg_yellow_cards, avg_fouls')
      .eq('id', fixture.referee_id)
      .single();
    refereeName = ref ? `${ref.name} (${Number(ref.avg_yellow_cards).toFixed(1)} cards/gm, ${Number(ref.avg_fouls).toFixed(0)} fouls/gm)` : null;
  }

  return (
    <div>
      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
        <p className="mb-1 text-xs text-zinc-500">{leagueName} &middot; {formatKickoff(fixture.kickoff_at)}</p>
        <h1 className="text-3xl font-bold text-white">
          {homeName} <span className="text-zinc-600">vs</span> {awayName}
        </h1>
        <div className="mt-2">
          <LiveScore
            fixtureId={fixtureId}
            initialHomeScore={fixture.home_score}
            initialAwayScore={fixture.away_score}
            initialStatus={fixture.status}
          />
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">{homeName} faces:</span>
            <DifficultyBadge label={homeDifficulty.label} color={homeDifficulty.color} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">{awayName} faces:</span>
            <DifficultyBadge label={awayDifficulty.label} color={awayDifficulty.color} />
          </div>
        </div>
        {refereeName && (
          <p className="mt-2 text-xs text-zinc-500">Referee: {refereeName}</p>
        )}
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <TeamForm
          teamName={homeName}
          form5={homeForm.form5}
          form10={homeForm.form10}
          goalsScored={homeForm.goalsScored}
          goalsConceded={homeForm.goalsConceded}
          cleanSheets={homeForm.cleanSheets}
          xgAvg={homeForm.xgAvg}
        />
        <TeamForm
          teamName={awayName}
          form5={awayForm.form5}
          form10={awayForm.form10}
          goalsScored={awayForm.goalsScored}
          goalsConceded={awayForm.goalsConceded}
          cleanSheets={awayForm.cleanSheets}
          xgAvg={awayForm.xgAvg}
        />
      </div>

      {/* First Goal Analysis */}
      <div className="mb-8">
        <FirstGoalStats
          homeTeam={homeName}
          awayTeam={awayName}
          homeScoredFirstPct={homeFirstGoal.scoredFirstPct}
          awayScoredFirstPct={awayFirstGoal.scoredFirstPct}
          homeAvgMinute={homeFirstGoal.avgFirstGoalMinute}
          awayAvgMinute={awayFirstGoal.avgFirstGoalMinute}
          homeScoredFirstWinPct={homeFirstGoal.scoredFirstWinPct}
          awayScoredFirstWinPct={awayFirstGoal.scoredFirstWinPct}
          homeConcededFirstWinPct={homeFirstGoal.concededFirstWinPct}
          awayConcededFirstWinPct={awayFirstGoal.concededFirstWinPct}
        />
      </div>

      {/* Head-to-Head */}
      {h2hMatches.length > 0 && (
        <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Head-to-Head</h2>
          <H2HChart matches={h2hMatches} teamAName={homeName} teamBName={awayName} />
        </div>
      )}

      {/* Season Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {homeSeasonStats.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">{homeName} — Season</h2>
            <SeasonChart data={homeSeasonStats} teamName={homeName} />
          </div>
        )}
        {awaySeasonStats.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">{awayName} — Season</h2>
            <SeasonChart data={awaySeasonStats} teamName={awayName} />
          </div>
        )}
      </div>

      {/* Goal timing */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <GoalPeriodChart
          teamName={homeName}
          scoredByPeriod={homeGoalPeriods.scoredByPeriod}
          concededByPeriod={homeGoalPeriods.concededByPeriod}
          gamesAnalysed={homeGoalPeriods.gamesAnalysed}
        />
        <GoalPeriodChart
          teamName={awayName}
          scoredByPeriod={awayGoalPeriods.scoredByPeriod}
          concededByPeriod={awayGoalPeriods.concededByPeriod}
          gamesAnalysed={awayGoalPeriods.gamesAnalysed}
        />
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">Top 10 Tips</h2>
        <p className="mt-1 text-sm text-zinc-500">Ranked by confidence score for this fixture</p>
      </div>

      {tipList.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 py-16 text-center">
          <p className="text-zinc-500">No tips generated for this fixture yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tipList.map(tip => (
            <TipCard
              key={tip.id}
              tip={tip}
              homeTeam={homeName}
              awayTeam={awayName}
              leagueName={leagueName}
              kickoff={fixture.kickoff_at}
              fixtureStatus={fixture.status}
              showBreakdown
            />
          ))}
        </div>
      )}
    </div>
  );
}
