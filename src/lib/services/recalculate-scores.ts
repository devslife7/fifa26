import { createServiceClient } from '@/lib/services/supabase/server';
import { getFinishedActualResults } from '@/lib/services/actual-results';
import { calculateScore } from '@/lib/logic/scoring';
import { applyRankSnapshot } from '@/lib/services/leaderboard-position';

export type RecalculateResult =
  | { ok: true; updated: number }
  | { ok: false; error: string };

/** Timezone whose midnight defines the leaderboard trend arrow's daily baseline. */
const RANK_DAY_TIME_ZONE = 'America/New_York';

/** Today as `YYYY-MM-DD` in the app's rank-day timezone. */
function rankDayToday(): string {
  // en-CA renders dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: RANK_DAY_TIME_ZONE }).format(new Date());
}

export async function recalculateScores(): Promise<RecalculateResult> {
  const supabase = createServiceClient();

  const { data: actualResults, error: resultsError } = await getFinishedActualResults(supabase);
  if (resultsError) return { ok: false, error: resultsError };

  const { data: predictions, error: predError } = await supabase
    .from('predictions')
    .select('id, prediction_number, user_id, name, submitter_name, group_matches, knockout_matches, champion_code, third_place_tiebreaker, profiles(display_name)')
    .eq('is_complete', true);
  if (predError) return { ok: false, error: predError.message };

  if (!predictions || predictions.length === 0) {
    return { ok: true, updated: 0 };
  }

  const scoreRows = predictions.map(pred => {
    const points = calculateScore(
      {
        user_id: pred.user_id ?? pred.id,
        group_matches: pred.group_matches as Record<string, string>,
        knockout_matches: pred.knockout_matches as Record<string, string>,
        champion_code: pred.champion_code,
        third_place_tiebreaker: (pred.third_place_tiebreaker as string[] | null) ?? null,
      },
      actualResults ?? [],
    );

    const profile = pred.profiles as unknown as { display_name: string } | null;

    return {
      prediction_id: pred.id,
      prediction_number: pred.prediction_number,
      user_id: pred.user_id,
      name: pred.name,
      total_points: points,
      champion_code: pred.champion_code,
      display_name: profile?.display_name ?? pred.submitter_name ?? 'Unknown',
      calculated_at: new Date().toISOString(),
    };
  });

  const { data: existingScores, error: existingError } = await supabase
    .from('scores')
    .select('prediction_id, total_points, rank, previous_rank, previous_rank_date');
  if (existingError) return { ok: false, error: existingError.message };

  const rankedRows = applyRankSnapshot(existingScores ?? [], scoreRows, rankDayToday());

  const { error: upsertError } = await supabase
    .from('scores')
    .upsert(rankedRows, { onConflict: 'prediction_id' });
  if (upsertError) return { ok: false, error: upsertError.message };

  return { ok: true, updated: rankedRows.length };
}
