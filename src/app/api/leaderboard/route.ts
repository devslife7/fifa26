import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/services/supabase/server';
import { getFinishedActualResults } from '@/lib/services/actual-results';
import {
  computeLeaderboardPositionChanges,
  getLastFinishedMatch,
  positionChangesByKey,
} from '@/lib/services/leaderboard-position';

export async function GET() {
  const supabase = createServiceClient();

  const [
    { data: scores, error: scoresError },
    { data: predictions, error: predictionsError },
    actualResultsResult,
  ] = await Promise.all([
    supabase
      .from('scores')
      .select('*')
      .order('total_points', { ascending: false })
      .limit(100),
    supabase
      .from('predictions')
      .select('id, prediction_number, user_id, name, submitter_name, group_matches, knockout_matches, champion_code, third_place_tiebreaker, completed_at, profiles(display_name)')
      .eq('is_complete', true),
    getFinishedActualResults(supabase),
  ]);

  if (scoresError) {
    return NextResponse.json({ error: scoresError.message }, { status: 500 });
  }
  if (predictionsError) {
    return NextResponse.json({ error: predictionsError.message }, { status: 500 });
  }
  if (actualResultsResult.error) {
    return NextResponse.json({ error: actualResultsResult.error }, { status: 500 });
  }

  const predictionRows = (predictions ?? []).map(pred => {
    const profile = pred.profiles as unknown as { display_name: string } | null;
    return {
      id: pred.id,
      prediction_number: pred.prediction_number,
      user_id: pred.user_id,
      name: pred.name,
      display_name: profile?.display_name ?? pred.submitter_name ?? 'Unknown',
      group_matches: (pred.group_matches as Record<string, string>) ?? {},
      knockout_matches: (pred.knockout_matches as Record<string, string>) ?? {},
      champion_code: pred.champion_code,
      third_place_tiebreaker: (pred.third_place_tiebreaker as string[] | null) ?? null,
      completed_at: pred.completed_at,
    };
  });

  const actualResults = actualResultsResult.data;
  const lastMatch = await getLastFinishedMatch(supabase, actualResults);
  const positionChanges = computeLeaderboardPositionChanges(
    predictionRows,
    actualResults,
    lastMatch,
  );
  const changesByPredictionId = positionChangesByKey(positionChanges);

  const leaderboard = (scores ?? []).map(row => {
    const key = row.prediction_id ?? (row.prediction_number != null ? `num-${row.prediction_number}` : '');
    return {
      ...row,
      position_change: changesByPredictionId.get(key),
    };
  });

  return NextResponse.json({ leaderboard });
}
