/**
 * schedule-matches — runs every 30 minutes via pg_cron.
 *
 * For each monitored league, fetches today's fixtures from API-Football,
 * checks pre-match odds to identify favourites (odds ≤ threshold),
 * and inserts qualifying matches into watched_matches.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchFixturesByDate, fetchPreMatchOdds, extractFavourite } from '../_shared/apifootball.ts';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiKey = Deno.env.get('API_FOOTBALL_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get config
    const { data: config } = await supabase
      .from('rule_config')
      .select('*')
      .eq('id', 1)
      .single();

    if (!config?.enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Bot disabled' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const maxOdds = Number(config.favourite_max_odds);

    // Get active leagues
    const { data: leagues } = await supabase
      .from('monitored_leagues')
      .select('api_football_id, current_season')
      .eq('active', true);

    if (!leagues?.length) {
      return new Response(JSON.stringify({ scheduled: 0, reason: 'No active leagues' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const today = new Date().toISOString().split('T')[0];
    let scheduled = 0;

    for (const league of leagues) {
      // Fetch today's fixtures for this league
      const fixtures = await fetchFixturesByDate(
        apiKey, league.api_football_id, league.current_season, today
      );

      for (const fixture of fixtures) {
        // Skip already-started or finished matches
        if (fixture.fixture.status.short !== 'NS') continue;

        // Check if already watched
        const { data: existing } = await supabase
          .from('watched_matches')
          .select('id')
          .eq('fixture_api_id', fixture.fixture.id)
          .single();

        if (existing) continue;

        // Fetch odds to find favourite
        const oddsData = await fetchPreMatchOdds(apiKey, fixture.fixture.id);
        const fav = extractFavourite(oddsData, maxOdds);

        if (!fav) continue; // No clear favourite within threshold

        // Insert into watchlist
        const { error } = await supabase.from('watched_matches').insert({
          fixture_api_id: fixture.fixture.id,
          league_id: league.api_football_id,
          home_team: fixture.teams.home.name,
          away_team: fixture.teams.away.name,
          favourite: fav.side,
          favourite_odds: fav.odds,
          kickoff_at: fixture.fixture.date,
          status: 'scheduled',
        });

        if (error) {
          console.error(`Failed to insert fixture ${fixture.fixture.id}:`, error);
        } else {
          scheduled++;
          console.log(`Scheduled: ${fixture.teams.home.name} vs ${fixture.teams.away.name} — fav: ${fav.side} @ ${fav.odds}`);
        }
      }
    }

    return new Response(JSON.stringify({ scheduled, date: today }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('schedule-matches error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
