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

export interface ScoreRowForRanking {
  prediction_id: string;
  total_points: number;
  display_name: string;
  name?: string | null;
}

export interface ExistingRankRow {
  prediction_id: string;
  total_points: number | null;
  rank: number | null;
  previous_rank: number | null;
  previous_rank_date: string | null;
}

/**
 * Compute the dense rank for each freshly-scored prediction and decide what its
 * `previous_rank` should be, by comparing against the previously cached scores.
 *
 * `previous_rank` is a once-per-day snapshot: the rank a prediction held at the
 * start of `today`. The trend arrow therefore reads "positions moved today",
 * and stays stable across the many recalcs a single day produces — unrelated
 * scoring no longer wipes a user's arrow, and a multi-step climb shows the full
 * move rather than just the last step. `today` is supplied by the caller (a
 * `YYYY-MM-DD` string) to keep this function pure and deterministic.
 */
export function applyRankSnapshot<T extends ScoreRowForRanking>(
  existingRows: readonly ExistingRankRow[],
  newScoreRows: readonly T[],
  today: string,
): (T & { rank: number; previous_rank: number | null; previous_rank_date: string })[] {
  const existingById = new Map<string, ExistingRankRow>();
  for (const row of existingRows) existingById.set(row.prediction_id, row);

  const newRanks = rankByPoints(
    newScoreRows.map(row => ({
      prediction_id: row.prediction_id,
      total_points: row.total_points,
      display_name: row.display_name,
      name: row.name,
    })),
  );

  return newScoreRows.map(row => {
    const rank = newRanks.get(row.prediction_id) ?? 0;
    const existing = existingById.get(row.prediction_id);

    // Baseline already captured for today → preserve it so the arrow holds
    // steady across the day's later recalcs.
    if (existing && existing.previous_rank_date === today) {
      return { ...row, rank, previous_rank: existing.previous_rank, previous_rank_date: today };
    }

    // First recalc of a new day (or a prediction that existed before today):
    // re-baseline to yesterday's final rank. A brand-new prediction with no
    // prior rank baselines to its own current rank, so it renders "—".
    const previous_rank = existing?.rank ?? rank;
    return { ...row, rank, previous_rank, previous_rank_date: today };
  });
}

/** Positive = moved up, negative = moved down, undefined = no baseline (renders "—"). */
export function positionChangeFromRanks(
  rank: number | null | undefined,
  previousRank: number | null | undefined,
): number | undefined {
  if (rank == null || previousRank == null) return undefined;
  return previousRank - rank;
}
