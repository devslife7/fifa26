import { createServiceClient } from '@/lib/services/supabase/server';
import { calculateScore } from '@/lib/logic/scoring';

export type RecalculateResult =
  | { ok: true; updated: number }
  | { ok: false; error: string };

export async function recalculateScores(): Promise<RecalculateResult> {
  const supabase = createServiceClient();

  const { data: actualResults, error: resultsError } = await supabase
    .from('actual_results')
    .select('*');
  if (resultsError) return { ok: false, error: resultsError.message };

  const finalResult = actualResults?.find(r => r.match_id.startsWith('F-') || r.match_id.startsWith('FIN-'));
  const actualChampion = finalResult?.winning_team ?? null;

  const { data: predictions, error: predError } = await supabase
    .from('predictions')
    .select('user_id, group_matches, knockout_matches, champion_code, third_place_tiebreaker, profiles(display_name)')
    .eq('is_complete', true)
    .eq('is_active', true);
  if (predError) return { ok: false, error: predError.message };

  if (!predictions || predictions.length === 0) {
    return { ok: true, updated: 0 };
  }

  const scoreRows = predictions.map(pred => {
    const points = calculateScore(
      {
        user_id: pred.user_id,
        group_matches: pred.group_matches as Record<string, string>,
        knockout_matches: pred.knockout_matches as Record<string, string>,
        champion_code: pred.champion_code,
        third_place_tiebreaker: (pred.third_place_tiebreaker as string[] | null) ?? null,
      },
      actualResults ?? [],
      actualChampion,
    );

    const profile = pred.profiles as unknown as { display_name: string } | null;

    return {
      user_id: pred.user_id,
      total_points: points,
      champion_code: pred.champion_code,
      display_name: profile?.display_name ?? 'Unknown',
      calculated_at: new Date().toISOString(),
    };
  });

  const { error: upsertError } = await supabase
    .from('scores')
    .upsert(scoreRows, { onConflict: 'user_id' });
  if (upsertError) return { ok: false, error: upsertError.message };

  return { ok: true, updated: scoreRows.length };
}
