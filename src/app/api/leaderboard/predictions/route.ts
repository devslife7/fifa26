import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/services/supabase/server';
import { arePredictionDetailsPublic, isLateSubmission } from '@/data/tournament';
import {
  computeLeaderboardPositionChanges,
  getLastFinishedMatch,
  positionChangesByKey,
} from '@/lib/services/leaderboard-position';

export async function GET() {
  try {
    const supabase = createServiceClient();
    const detailsAvailable = arePredictionDetailsPublic();

    const { data, error } = await supabase
      .from('predictions')
      .select('id, prediction_number, user_id, name, submitter_name, group_matches, knockout_matches, third_place_tiebreaker, champion_code, completed_at, created_at, updated_at, is_approved')
      .eq('is_complete', true)
      .eq('is_approved', true)
      .order('completed_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const [
      { data: scoreRows },
      { data: actualResults, error: resultsError },
    ] = await Promise.all([
      supabase
        .from('scores')
        .select('prediction_id, prediction_number, total_points'),
      supabase
        .from('actual_results')
        .select('match_id, match_type, result, winning_team'),
    ]);

    if (resultsError) {
      return NextResponse.json({ error: resultsError.message }, { status: 500 });
    }

    const normalizePoints = (value: unknown): number | null => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const pointsByPredictionId = new Map<string, number>();
    const pointsByPredictionNumber = new Map<number, number>();
    for (const row of scoreRows ?? []) {
      const totalPoints = normalizePoints(row.total_points);
      if (totalPoints == null) continue;
      if (typeof row.prediction_id === 'string') {
        pointsByPredictionId.set(row.prediction_id, totalPoints);
      }
      const predictionNumber = typeof row.prediction_number === 'number'
        ? row.prediction_number
        : Number(row.prediction_number);
      if (Number.isFinite(predictionNumber)) {
        pointsByPredictionNumber.set(predictionNumber, totalPoints);
      }
    }

    const userIds = Array.from(new Set(
      (data ?? [])
        .map((row: Record<string, unknown>) => row.user_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ));

    const profilesById = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);

      for (const profile of profiles ?? []) {
        if (profile.id && profile.display_name) {
          profilesById.set(profile.id, profile.display_name);
        }
      }
    }

    const predictionRows = (data ?? []).map((row: Record<string, unknown>) => {
      const userId = typeof row.user_id === 'string' ? row.user_id : null;
      const predictionId = typeof row.id === 'string' ? row.id : '';
      const predictionNumber = typeof row.prediction_number === 'number'
        ? row.prediction_number
        : Number(row.prediction_number);
      return {
        id: predictionId,
        prediction_number: Number.isFinite(predictionNumber) ? predictionNumber : null,
        user_id: userId,
        name: (row.name as string) ?? null,
        display_name: (row.submitter_name as string | null) || (userId ? profilesById.get(userId) : null) || 'Unknown',
        group_matches: (row.group_matches as Record<string, string>) ?? {},
        knockout_matches: (row.knockout_matches as Record<string, string>) ?? {},
        champion_code: (row.champion_code as string | null) ?? null,
        third_place_tiebreaker: (row.third_place_tiebreaker as string[] | null) ?? null,
        completed_at: (row.completed_at as string | null) ?? null,
      };
    });

    const lastMatch = await getLastFinishedMatch(supabase, actualResults ?? []);
    const positionChanges = computeLeaderboardPositionChanges(
      predictionRows,
      actualResults ?? [],
      lastMatch,
    );
    const changesByPredictionId = positionChangesByKey(positionChanges);

    const predictions = (data ?? []).map((row: Record<string, unknown>) => {
      const userId = typeof row.user_id === 'string' ? row.user_id : null;
      const predictionId = typeof row.id === 'string' ? row.id : null;
      const predictionNumber = typeof row.prediction_number === 'number'
        ? row.prediction_number
        : Number(row.prediction_number);
      const totalPoints = predictionId && pointsByPredictionId.has(predictionId)
        ? pointsByPredictionId.get(predictionId)!
        : Number.isFinite(predictionNumber) && pointsByPredictionNumber.has(predictionNumber)
          ? pointsByPredictionNumber.get(predictionNumber)!
          : null;
      const changeKey = predictionId
        ?? (Number.isFinite(predictionNumber) ? `num-${predictionNumber}` : '');

      return {
        prediction_number: row.prediction_number,
        user_id: `prediction-${row.prediction_number}`,
        name: (row.name as string) ?? null,
        display_name: (row.submitter_name as string | null) || (userId ? profilesById.get(userId) : null) || 'Unknown',
        champion_code: row.champion_code,
        total_points: totalPoints,
        position_change: changesByPredictionId.get(changeKey),
        ...(detailsAvailable
          ? {
              group_matches: row.group_matches ?? {},
              knockout_matches: row.knockout_matches ?? {},
              third_place_tiebreaker: row.third_place_tiebreaker ?? null,
            }
          : {}),
        is_approved: row.is_approved ?? false,
        details_available: detailsAvailable,
        is_late_submission: isLateSubmission(row.completed_at as string | null, row.prediction_number as number | null),
        completed_at: row.completed_at ?? null,
        created_at: row.created_at ?? null,
        updated_at: row.updated_at ?? null,
      };
    });

    return NextResponse.json({ predictions, total_users: predictions.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load leaderboard predictions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
