'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLatestPrediction } from '@/hooks/useLatestPrediction';
import { usePredictionResults, type PerMatchOutcome } from '@/hooks/usePredictionResults';
import { computeTiedRanks } from '@/lib/services/leaderboard-position';
import type { LeaderboardEntry, LiveMatch } from '@/types';

const RECAP_ANCHOR_KEY = 'fifa26_home_recap_anchor';
const DAY_MS = 24 * 60 * 60 * 1000;

export type DailyRecapStatus = 'signed-out' | 'loading' | 'empty' | 'ready';

export interface DailyRecapStandout {
  matchId: string;
  actualWinnerCode: string | null;
  homeCode: string | null;
  awayCode: string | null;
  points: number;
}

export interface DailyRecap {
  status: DailyRecapStatus;
  /** Matches the user predicted that finished since their last visit. */
  newResultCount: number;
  hitCount: number;
  pointsGained: number;
  /** Current leaderboard rank (dense), or null when unavailable. */
  rank: number | null;
  totalUsers: number | null;
  /** previousRank - currentRank: positive = climbed, negative = slipped, undefined = no signal. */
  positionChange: number | undefined;
  standout: DailyRecapStandout | null;
}

function readAnchor(): number {
  if (typeof window === 'undefined') return Date.now() - DAY_MS;
  const stored = window.localStorage.getItem(RECAP_ANCHOR_KEY);
  const parsed = stored ? Number(stored) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now() - DAY_MS;
}

/**
 * Builds the "since you were last here" recap for the home tab. Reuses the same
 * per-match scoring the rest of the app trusts (`usePredictionResults`) and the
 * leaderboard's authoritative `position_change`, so it never diverges from the
 * ranking screen.
 */
export function useDailyRecap(liveMatches: Record<string, LiveMatch> | undefined): DailyRecap {
  const { user } = useAuth();
  const { prediction, loading: predictionLoading } = useLatestPrediction();
  const { perMatch } = usePredictionResults(prediction, liveMatches);

  // Anchor is captured once for this mount. It is only advanced once a recap has
  // actually been shown (see effect below), so the window survives signed-out
  // visits, loading states, and quiet periods until there's something to surface.
  const [sinceAnchor] = useState<number>(readAnchor);

  const [board, setBoard] = useState<LeaderboardEntry[] | null>(null);
  const [boardLoading, setBoardLoading] = useState<boolean>(Boolean(user));

  useEffect(() => {
    if (!user) {
      setBoard(null);
      setBoardLoading(false);
      return;
    }
    let cancelled = false;
    setBoardLoading(true);
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setBoard((data.leaderboard ?? []) as LeaderboardEntry[]);
      })
      .catch(() => {
        if (!cancelled) setBoard([]);
      })
      .finally(() => {
        if (!cancelled) setBoardLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const recap = useMemo<DailyRecap>(() => {
    if (!user) {
      return { status: 'signed-out', newResultCount: 0, hitCount: 0, pointsGained: 0, rank: null, totalUsers: null, positionChange: undefined, standout: null };
    }

    if (predictionLoading || boardLoading) {
      return { status: 'loading', newResultCount: 0, hitCount: 0, pointsGained: 0, rank: null, totalUsers: null, positionChange: undefined, standout: null };
    }

    // Results the user predicted that finished since the previous visit. We use
    // kickoff time as a proxy for "you hadn't seen this result yet".
    const newly: PerMatchOutcome[] = Object.values(perMatch).filter(o =>
      o.status === 'FINISHED' &&
      o.picked != null &&
      o.utcDate != null &&
      new Date(o.utcDate).getTime() > sinceAnchor,
    );

    const hits = newly.filter(o => o.state === 'hit');
    const pointsGained = newly.reduce((sum, o) => sum + o.points, 0);

    const standout = hits.reduce<DailyRecapStandout | null>((best, o) => {
      if (best && o.points <= best.points) return best;
      return {
        matchId: o.matchId,
        actualWinnerCode: o.actualWinnerCode,
        homeCode: o.homeCode,
        awayCode: o.awayCode,
        points: o.points,
      };
    }, null);

    // Locate the user's leaderboard row and derive their dense rank.
    let rank: number | null = null;
    let totalUsers: number | null = null;
    let positionChange: number | undefined;
    if (board && board.length > 0) {
      const isMine = (e: LeaderboardEntry) =>
        (prediction?.id != null && e.prediction_id === prediction.id) ||
        (prediction?.prediction_number != null && e.prediction_number === prediction.prediction_number) ||
        (e.user_id != null && e.user_id === user.id);

      const sorted = [...board].sort((a, b) => b.total_points - a.total_points);
      const ranks = computeTiedRanks(sorted, e => e.total_points);
      const myIndex = sorted.findIndex(isMine);
      if (myIndex >= 0) {
        rank = ranks[myIndex];
        totalUsers = board.length;
        positionChange = sorted[myIndex].position_change;
      }
    }

    const status: DailyRecapStatus = prediction && newly.length > 0 ? 'ready' : 'empty';

    return {
      status,
      newResultCount: newly.length,
      hitCount: hits.length,
      pointsGained,
      rank,
      totalUsers,
      positionChange,
      standout,
    };
  }, [user, predictionLoading, boardLoading, perMatch, sinceAnchor, board, prediction]);

  // Advance the anchor only after a recap was actually surfaced, so the next
  // visit starts from "now" and we never re-show the same results.
  useEffect(() => {
    if (recap.status === 'ready' && typeof window !== 'undefined') {
      window.localStorage.setItem(RECAP_ANCHOR_KEY, String(Date.now()));
    }
  }, [recap.status]);

  return recap;
}
