import type { SupabaseClient } from '@supabase/supabase-js';

export interface ActualResult {
  match_id: string;
  match_type: 'group' | 'knockout';
  result: 'home' | 'draw' | 'away';
  winning_team: string | null;
}

interface FixtureStatusRow {
  local_match_id: string | null;
  status: string | null;
}

export function filterFinishedActualResults(
  actualResults: ActualResult[],
  fixtures: FixtureStatusRow[],
): ActualResult[] {
  const finishedMatchIds = new Set(
    fixtures
      .filter(fixture => fixture.local_match_id && fixture.status === 'FINISHED')
      .map(fixture => fixture.local_match_id as string),
  );

  return actualResults.filter(result => finishedMatchIds.has(result.match_id));
}

export async function getFinishedActualResults(
  supabase: SupabaseClient,
): Promise<{ data: ActualResult[]; error: string | null }> {
  const { data: actualResults, error: resultsError } = await supabase
    .from('actual_results')
    .select('match_id, match_type, result, winning_team');

  if (resultsError) {
    return { data: [], error: resultsError.message };
  }

  const rows = (actualResults ?? []) as ActualResult[];
  if (rows.length === 0) {
    return { data: [], error: null };
  }

  const matchIds = Array.from(new Set(rows.map(row => row.match_id)));
  const { data: fixtures, error: fixturesError } = await supabase
    .from('fixtures')
    .select('local_match_id, status')
    .in('local_match_id', matchIds);

  if (fixturesError) {
    return { data: [], error: fixturesError.message };
  }

  return {
    data: filterFinishedActualResults(rows, fixtures ?? []),
    error: null,
  };
}
