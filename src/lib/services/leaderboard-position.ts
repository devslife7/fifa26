import { calculateScore } from '@/lib/logic/scoring';
import type { ActualResult } from '@/lib/services/actual-results';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface LeaderboardPredictionRow {
  id: string;
  prediction_number?: number | null;
  user_id?: string | null;
  name?: string | null;
  display_name: string;
  group_matches: Record<string, string>;
  knockout_matches: Record<string, string>;
  champion_code: string | null;
  third_place_tiebreaker: string[] | null;
  completed_at?: string | null;
}

export interface LeaderboardPositionEntry {
  prediction_id: string;
  prediction_number?: number | null;
  position_change?: number;
}

function getEntryKey(predictionId: string, predictionNumber?: number | null): string {
  return predictionId || (predictionNumber != null ? `num-${predictionNumber}` : '');
}

function compareLeaderboardEntries(
  a: { total_points: number; display_name: string; name?: string | null },
  b: { total_points: number; display_name: string; name?: string | null },
): number {
  if (b.total_points !== a.total_points) return b.total_points - a.total_points;
  const nameA = (a.name?.trim() || a.display_name).toLocaleLowerCase();
  const nameB = (b.name?.trim() || b.display_name).toLocaleLowerCase();
  return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
}

/** Dense ranking: tied scores share the same rank; next distinct score gets the next rank (e.g. 1, 1, 2, 2, 3). */
export function computeTiedRanks<T>(
  sortedItems: readonly T[],
  getPoints: (item: T) => number,
): number[] {
  const ranks: number[] = [];
  let currentRank = 1;
  for (let i = 0; i < sortedItems.length; i++) {
    if (i > 0 && getPoints(sortedItems[i]) !== getPoints(sortedItems[i - 1])) {
      currentRank++;
    }
    ranks.push(currentRank);
  }
  return ranks;
}

function rankByPoints<T extends { total_points: number; display_name: string; name?: string | null; prediction_id: string }>(
  entries: T[],
): Map<string, number> {
  const sorted = [...entries].sort(compareLeaderboardEntries);
  const ranks = computeTiedRanks(sorted, entry => entry.total_points);
  const ranksById = new Map<string, number>();
  sorted.forEach((entry, index) => {
    ranksById.set(entry.prediction_id, ranks[index]);
  });
  return ranksById;
}

export async function getLastFinishedMatch(
  supabase: SupabaseClient,
  actualResults: ActualResult[],
): Promise<{ matchId: string; utcDate: string } | null> {
  if (actualResults.length === 0) return null;

  const matchIds = actualResults.map(row => row.match_id);
  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('local_match_id, utc_date, status')
    .in('local_match_id', matchIds)
    .eq('status', 'FINISHED')
    .order('utc_date', { ascending: false })
    .limit(1);

  const latest = fixtures?.[0];
  if (latest?.local_match_id && latest.utc_date) {
    return { matchId: latest.local_match_id, utcDate: latest.utc_date };
  }

  // Fallback when fixture metadata is unavailable.
  return { matchId: actualResults[actualResults.length - 1].match_id, utcDate: '' };
}

export function computeLeaderboardPositionChanges(
  predictions: LeaderboardPredictionRow[],
  actualResults: ActualResult[],
  lastMatch: { matchId: string; utcDate: string } | null,
): LeaderboardPositionEntry[] {
  if (!lastMatch || predictions.length === 0) {
    return predictions.map(prediction => ({
      prediction_id: prediction.id,
      prediction_number: prediction.prediction_number,
      position_change: undefined,
    }));
  }

  const resultsBeforeLastMatch = actualResults.filter(row => row.match_id !== lastMatch.matchId);
  const hasPreviousSnapshot = resultsBeforeLastMatch.length < actualResults.length;

  const currentEntries = predictions.map(prediction => ({
    prediction_id: prediction.id,
    prediction_number: prediction.prediction_number,
    display_name: prediction.display_name,
    name: prediction.name,
    total_points: calculateScore(
      {
        user_id: prediction.user_id ?? prediction.id,
        group_matches: prediction.group_matches,
        knockout_matches: prediction.knockout_matches,
        champion_code: prediction.champion_code,
        third_place_tiebreaker: prediction.third_place_tiebreaker,
      },
      actualResults,
    ),
    completed_at: prediction.completed_at,
  }));

  const previousEntries = predictions.map(prediction => ({
    prediction_id: prediction.id,
    prediction_number: prediction.prediction_number,
    display_name: prediction.display_name,
    name: prediction.name,
    total_points: calculateScore(
      {
        user_id: prediction.user_id ?? prediction.id,
        group_matches: prediction.group_matches,
        knockout_matches: prediction.knockout_matches,
        champion_code: prediction.champion_code,
        third_place_tiebreaker: prediction.third_place_tiebreaker,
      },
      resultsBeforeLastMatch,
    ),
    completed_at: prediction.completed_at,
  }));

  const currentRanks = rankByPoints(currentEntries);
  const previousRanks = rankByPoints(previousEntries);

  return predictions.map(prediction => {
    const joinedAfterLastMatch = !!(
      lastMatch.utcDate
      && prediction.completed_at
      && new Date(prediction.completed_at).getTime() > new Date(lastMatch.utcDate).getTime()
    );

    if (!hasPreviousSnapshot || joinedAfterLastMatch) {
      return {
        prediction_id: prediction.id,
        prediction_number: prediction.prediction_number,
        position_change: undefined,
      };
    }

    const previousRank = previousRanks.get(prediction.id);
    const currentRank = currentRanks.get(prediction.id);
    if (previousRank == null || currentRank == null) {
      return {
        prediction_id: prediction.id,
        prediction_number: prediction.prediction_number,
        position_change: undefined,
      };
    }

    return {
      prediction_id: prediction.id,
      prediction_number: prediction.prediction_number,
      position_change: previousRank - currentRank,
    };
  });
}

export function positionChangesByKey(
  changes: LeaderboardPositionEntry[],
): Map<string, number | undefined> {
  const map = new Map<string, number | undefined>();
  for (const change of changes) {
    map.set(getEntryKey(change.prediction_id, change.prediction_number), change.position_change);
  }
  return map;
}
