import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/services/supabase/server';
import { arePredictionDetailsPublic, isLateSubmission } from '@/data/tournament';
import { getFinishedActualResults } from '@/lib/services/actual-results';
import { positionChangeFromRanks } from '@/lib/services/leaderboard-position';
import { calculateScore } from '@/lib/logic/scoring';

export async function GET(request: Request) {
  try {
    const supabase = createServiceClient();
    const detailsAvailable = arePredictionDetailsPublic();
    const includePreview = new URL(request.url).searchParams.get('preview') === '1';

    let query = supabase
      .from('predictions')
      .select('id, prediction_number, user_id, name, submitter_name, group_matches, knockout_matches, third_place_tiebreaker, champion_code, completed_at, created_at, updated_at, is_approved')
      .eq('is_complete', true);

    // Non-approved predictions are normally hidden. The "just for fun" preview
    // mode opts in to also receive them (each row stays tagged with is_approved
    // so the client can mark them as non-competing).
    if (!includePreview) {
      query = query.eq('is_approved', true);
    }

    const { data, error } = await query.order('completed_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const [
      { data: scoreRows, error: scoresError },
      actualResultsResult,
    ] = await Promise.all([
      supabase
        .from('scores')
        .select('prediction_id, prediction_number, total_points, rank, previous_rank'),
      getFinishedActualResults(supabase),
    ]);

    if (actualResultsResult.error) {
      return NextResponse.json({ error: actualResultsResult.error }, { status: 500 });
    }

    const normalizePoints = (value: unknown): number | null => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const normalizeRank = (value: unknown): number | null => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    type RankInfo = { rank: number | null; previous_rank: number | null };
    const pointsByPredictionId = new Map<string, number>();
    const pointsByPredictionNumber = new Map<number, number>();
    const rankByPredictionId = new Map<string, RankInfo>();
    const rankByPredictionNumber = new Map<number, RankInfo>();
    const scoreCacheRows = scoresError ? [] : (scoreRows ?? []);
    for (const row of scoreCacheRows) {
      const rankInfo: RankInfo = {
        rank: normalizeRank(row.rank),
        previous_rank: normalizeRank(row.previous_rank),
      };
      const predictionNumber = typeof row.prediction_number === 'number'
        ? row.prediction_number
        : Number(row.prediction_number);
      if (typeof row.prediction_id === 'string') {
        rankByPredictionId.set(row.prediction_id, rankInfo);
      }
      if (Number.isFinite(predictionNumber)) {
        rankByPredictionNumber.set(predictionNumber, rankInfo);
      }

      const totalPoints = normalizePoints(row.total_points);
      if (totalPoints == null) continue;
      if (typeof row.prediction_id === 'string') {
        pointsByPredictionId.set(row.prediction_id, totalPoints);
      }
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

    const actualResults = actualResultsResult.data;

    const predictions = (data ?? []).map((row: Record<string, unknown>) => {
      const userId = typeof row.user_id === 'string' ? row.user_id : null;
      const predictionId = typeof row.id === 'string' ? row.id : null;
      const predictionNumber = typeof row.prediction_number === 'number'
        ? row.prediction_number
        : Number(row.prediction_number);
      const cachedTotalPoints = predictionId && pointsByPredictionId.has(predictionId)
        ? pointsByPredictionId.get(predictionId)!
        : Number.isFinite(predictionNumber) && pointsByPredictionNumber.has(predictionNumber)
          ? pointsByPredictionNumber.get(predictionNumber)!
          : null;
      const computedTotalPoints = calculateScore(
        {
          user_id: userId ?? predictionId ?? `prediction-${row.prediction_number}`,
          group_matches: (row.group_matches as Record<string, string>) ?? {},
          knockout_matches: (row.knockout_matches as Record<string, string>) ?? {},
          champion_code: (row.champion_code as string | null) ?? null,
          third_place_tiebreaker: (row.third_place_tiebreaker as string[] | null) ?? null,
        },
        actualResults,
      );
      const totalPoints = cachedTotalPoints ?? computedTotalPoints;
      const rankInfo = (predictionId && rankByPredictionId.get(predictionId))
        || (Number.isFinite(predictionNumber) ? rankByPredictionNumber.get(predictionNumber) : undefined);

      return {
        prediction_number: row.prediction_number,
        user_id: `prediction-${row.prediction_number}`,
        name: (row.name as string) ?? null,
        display_name: (row.submitter_name as string | null) || (userId ? profilesById.get(userId) : null) || 'Unknown',
        champion_code: row.champion_code,
        total_points: totalPoints,
        position_change: positionChangeFromRanks(rankInfo?.rank, rankInfo?.previous_rank),
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

    const approvedCount = predictions.filter(prediction => prediction.is_approved).length;
    return NextResponse.json({ predictions, total_users: approvedCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load leaderboard predictions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
