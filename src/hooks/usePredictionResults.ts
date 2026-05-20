'use client';

import { useMemo } from 'react';
import type {
  GroupLetter,
  KnockoutMatch,
  KnockoutResult,
  KnockoutRound,
  LeaderboardPrediction,
  LiveMatch,
  MatchResult,
  SavedPrediction,
} from '@/types';
import { allGroupMatches } from '@/data/matches';
import { generateBracket } from '@/lib/logic/bracket';
import {
  GROUP_POINTS,
  QUALIFIER_POINTS,
  WINNER_POINTS,
  getPredictedQualifiers,
  type Qualifiers,
} from '@/lib/logic/scoring';

export type MatchOutcomeState = 'hit' | 'miss' | 'pending' | 'upcoming' | 'no-pick';

export interface PerMatchOutcome {
  matchId: string;
  kind: 'group' | 'knockout';
  group?: GroupLetter;
  round?: KnockoutRound;
  homeCode: string | null;
  awayCode: string | null;
  picked: MatchResult | KnockoutResult | null;
  pickedTeamCode: string | null;
  actualResult: 'home' | 'draw' | 'away' | null;
  actualWinnerCode: string | null;
  state: MatchOutcomeState;
  points: number;
  utcDate?: string;
  status: LiveMatch['status'] | 'NOT_LIVE';
  score: { home: number; away: number } | null;
}

export interface PointsSummary {
  groupCorrect: number;
  groupTotal: number;
  groupPoints: number;
  r32Pts: number;
  r16Pts: number;
  qfPts: number;
  sfPts: number;
  thirdPartPts: number;
  thirdWinPts: number;
  finPartPts: number;
  finWinPts: number;
  knockoutPoints: number;
  championCorrect: boolean;
  totalPoints: number;
  pendingCount: number;
  pointsToday: number;
  hasAnyResults: boolean;
}

export interface UsePredictionResultsValue {
  bracket: KnockoutMatch[];
  predicted: Qualifiers;
  actual: Qualifiers;
  hasSignal: Record<KnockoutRound | 'thirdWinner' | 'finalWinner', boolean>;
  perMatch: Record<string, PerMatchOutcome>;
  summary: PointsSummary;
}

type PredictionInput = SavedPrediction | LeaderboardPrediction | null | undefined;

const EMPTY_QUALIFIERS: Qualifiers = {
  R32: new Set(),
  R16: new Set(),
  QF: new Set(),
  SF: new Set(),
  thirdParticipants: new Set(),
  thirdWinner: null,
  finalParticipants: new Set(),
  finalWinner: null,
};

const EMPTY_SIGNAL: Record<KnockoutRound | 'thirdWinner' | 'finalWinner', boolean> = {
  R32: false,
  R16: false,
  QF: false,
  SF: false,
  '3RD': false,
  FIN: false,
  thirdWinner: false,
  finalWinner: false,
};

/**
 * Walk the predicted bracket + live data to build:
 * - actual qualifier sets per round
 * - which rounds we have any signal for (i.e. at least one match in that round finished)
 */
function deriveActualFromLive(
  bracket: KnockoutMatch[],
  liveMatches: Record<string, LiveMatch>,
): { qualifiers: Qualifiers; hasSignal: Record<KnockoutRound | 'thirdWinner' | 'finalWinner', boolean> } {
  const R32 = new Set<string>();
  const R16 = new Set<string>();
  const QF = new Set<string>();
  const SF = new Set<string>();
  const thirdParticipants = new Set<string>();
  const finalParticipants = new Set<string>();
  let thirdWinner: string | null = null;
  let finalWinner: string | null = null;

  const hasSignal: Record<KnockoutRound | 'thirdWinner' | 'finalWinner', boolean> = {
    R32: false, R16: false, QF: false, SF: false, '3RD': false, FIN: false,
    thirdWinner: false, finalWinner: false,
  };

  for (const m of bracket) {
    const live = liveMatches[m.id];
    if (!live || live.status !== 'FINISHED' || !live.homeCode || !live.awayCode || !live.actualResult) continue;
    const winner = live.actualResult === 'home' ? live.homeCode : live.actualResult === 'away' ? live.awayCode : null;
    const loser = live.actualResult === 'home' ? live.awayCode : live.actualResult === 'away' ? live.homeCode : null;
    if (!winner) continue;

    if (m.round === 'R32') {
      R32.add(live.homeCode);
      R32.add(live.awayCode);
      R16.add(winner);
      hasSignal.R32 = true;
      hasSignal.R16 = true;
    } else if (m.round === 'R16') {
      QF.add(winner);
      hasSignal.QF = true;
    } else if (m.round === 'QF') {
      SF.add(winner);
      hasSignal.SF = true;
    } else if (m.round === 'SF') {
      finalParticipants.add(winner);
      if (loser) thirdParticipants.add(loser);
      hasSignal.FIN = true;
      hasSignal['3RD'] = true;
    } else if (m.round === '3RD') {
      thirdWinner = winner;
      hasSignal.thirdWinner = true;
    } else if (m.round === 'FIN') {
      finalWinner = winner;
      hasSignal.finalWinner = true;
    }
  }

  return {
    qualifiers: { R32, R16, QF, SF, thirdParticipants, thirdWinner, finalParticipants, finalWinner },
    hasSignal,
  };
}

function intersectionSize(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}

function isSameLocalDay(utcDate: string | undefined, now: Date): boolean {
  if (!utcDate) return false;
  const d = new Date(utcDate);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

/**
 * Pure helper used by both this hook and standalone callers (e.g. the knockout card
 * badge). Returns the user's per-match outcome for a single knockout match, given
 * the predicted bracket entry + live data.
 *
 * For knockout matches, we treat a pick as "correct" when the actual winner of the
 * match was in the user's predicted qualifier set for the *next* round (which is
 * exactly how the underlying scoring engine awards points). This avoids tying the
 * outcome to whether the user even predicted the right two teams to meet.
 */
function computeKnockoutOutcome(
  m: KnockoutMatch,
  live: LiveMatch | undefined,
  predicted: Qualifiers,
  predictionPick: KnockoutResult | undefined,
): Pick<PerMatchOutcome, 'state' | 'points' | 'actualResult' | 'actualWinnerCode' | 'pickedTeamCode' | 'homeCode' | 'awayCode' | 'utcDate' | 'status' | 'score'> {
  const homeCode = live?.homeCode ?? m.home ?? null;
  const awayCode = live?.awayCode ?? m.away ?? null;
  const utcDate = live?.utcDate;
  const status = (live?.status ?? 'NOT_LIVE') as LiveMatch['status'] | 'NOT_LIVE';
  const score = live?.score ?? null;
  const actualResult = live?.actualResult ?? null;

  const isFinished = live?.status === 'FINISHED' && actualResult && live?.homeCode && live?.awayCode;
  const actualWinnerCode = isFinished
    ? (actualResult === 'home' ? live.homeCode : actualResult === 'away' ? live.awayCode : null)
    : null;

  let pickedTeamCode: string | null = null;
  if (predictionPick === 'home') pickedTeamCode = m.home ?? null;
  else if (predictionPick === 'away') pickedTeamCode = m.away ?? null;

  if (!predictionPick) {
    return {
      state: isFinished ? 'no-pick' : utcDate ? 'upcoming' : 'pending',
      points: 0,
      actualResult,
      actualWinnerCode,
      pickedTeamCode,
      homeCode,
      awayCode,
      utcDate,
      status,
      score,
    };
  }

  if (!isFinished || !actualWinnerCode) {
    return {
      state: utcDate ? 'upcoming' : 'pending',
      points: 0,
      actualResult,
      actualWinnerCode,
      pickedTeamCode,
      homeCode,
      awayCode,
      utcDate,
      status,
      score,
    };
  }

  // The team that advances from this match is `actualWinnerCode` (or the loser of
  // SF for the 3rd-place participant). Award points if that team was in the user's
  // predicted set for the round that team advanced *into*.
  let earned = 0;
  let isHit = false;

  if (m.round === 'R32') {
    if (predicted.R16.has(actualWinnerCode)) { earned += QUALIFIER_POINTS.R16; isHit = true; }
  } else if (m.round === 'R16') {
    if (predicted.QF.has(actualWinnerCode)) { earned += QUALIFIER_POINTS.QF; isHit = true; }
  } else if (m.round === 'QF') {
    if (predicted.SF.has(actualWinnerCode)) { earned += QUALIFIER_POINTS.SF; isHit = true; }
  } else if (m.round === 'SF') {
    if (predicted.finalParticipants.has(actualWinnerCode)) { earned += QUALIFIER_POINTS.FIN; isHit = true; }
    const loserCode = actualResult === 'home' ? live.awayCode : actualResult === 'away' ? live.homeCode : null;
    if (loserCode && predicted.thirdParticipants.has(loserCode)) { earned += QUALIFIER_POINTS['3RD']; isHit = true; }
  } else if (m.round === '3RD') {
    if (predicted.thirdWinner && predicted.thirdWinner === actualWinnerCode) {
      earned += WINNER_POINTS['3RD'];
      isHit = true;
    }
  } else if (m.round === 'FIN') {
    if (predicted.finalWinner && predicted.finalWinner === actualWinnerCode) {
      earned += WINNER_POINTS.FIN;
      isHit = true;
    }
  }

  return {
    state: isHit ? 'hit' : 'miss',
    points: earned,
    actualResult,
    actualWinnerCode,
    pickedTeamCode,
    homeCode,
    awayCode,
    utcDate,
    status,
    score,
  };
}

export function usePredictionResults(
  prediction: PredictionInput,
  liveMatches: Record<string, LiveMatch> | undefined,
): UsePredictionResultsValue {
  const safeLive = liveMatches ?? {};

  const bracket = useMemo<KnockoutMatch[]>(() => {
    if (!prediction) return [];
    try {
      return generateBracket(
        prediction.group_matches as Record<string, MatchResult>,
        prediction.knockout_matches as Record<string, KnockoutResult>,
        prediction.third_place_tiebreaker ?? undefined,
        prediction.group_tiebreakers ?? {},
      );
    } catch {
      return [];
    }
  }, [prediction]);

  const predicted = useMemo<Qualifiers>(() => {
    if (!prediction) return EMPTY_QUALIFIERS;
    try {
      return getPredictedQualifiers({
        user_id: '',
        group_matches: prediction.group_matches,
        knockout_matches: prediction.knockout_matches,
        champion_code: prediction.champion_code,
        group_tiebreakers: prediction.group_tiebreakers ?? null,
        third_place_tiebreaker: prediction.third_place_tiebreaker ?? null,
      });
    } catch {
      return EMPTY_QUALIFIERS;
    }
  }, [prediction]);

  const { actual, hasSignal } = useMemo(() => {
    if (!prediction) return { actual: EMPTY_QUALIFIERS, hasSignal: EMPTY_SIGNAL };
    const { qualifiers, hasSignal } = deriveActualFromLive(bracket, safeLive);
    return { actual: qualifiers, hasSignal };
  }, [prediction, bracket, safeLive]);

  return useMemo<UsePredictionResultsValue>(() => {
    const perMatch: Record<string, PerMatchOutcome> = {};
    const now = new Date();
    let pointsToday = 0;
    let pendingCount = 0;
    let hasAnyResults = false;

    // ── Group matches ──
    let groupCorrect = 0;
    let groupTotal = 0;
    for (const gm of allGroupMatches) {
      const live = safeLive[gm.id];
      const picked = prediction?.group_matches[gm.id];
      const isFinished = live?.status === 'FINISHED' && !!live.actualResult;
      if (isFinished) hasAnyResults = true;

      let state: MatchOutcomeState;
      let points = 0;
      if (isFinished && picked) {
        const correct = picked === live!.actualResult;
        state = correct ? 'hit' : 'miss';
        if (correct) {
          points = GROUP_POINTS;
          groupCorrect++;
        }
        groupTotal++;
      } else if (isFinished && !picked) {
        state = 'no-pick';
        groupTotal++;
      } else if (live?.utcDate && !isFinished) {
        state = picked ? 'upcoming' : 'no-pick';
      } else {
        state = picked ? 'pending' : 'no-pick';
      }

      if (state === 'upcoming' || state === 'pending') pendingCount++;
      if (points > 0 && isSameLocalDay(live?.utcDate, now)) pointsToday += points;

      const pickedTeamCode = picked === 'home' ? gm.home : picked === 'away' ? gm.away : null;

      perMatch[gm.id] = {
        matchId: gm.id,
        kind: 'group',
        group: gm.group,
        homeCode: gm.home,
        awayCode: gm.away,
        picked: picked ?? null,
        pickedTeamCode,
        actualResult: live?.actualResult ?? null,
        actualWinnerCode: isFinished
          ? (live!.actualResult === 'home' ? gm.home : live!.actualResult === 'away' ? gm.away : null)
          : null,
        state,
        points,
        utcDate: live?.utcDate,
        status: (live?.status ?? 'NOT_LIVE') as LiveMatch['status'] | 'NOT_LIVE',
        score: live?.score ?? null,
      };
    }
    const groupPoints = groupCorrect * GROUP_POINTS;

    // ── Knockout matches ──
    for (const m of bracket) {
      const live = safeLive[m.id];
      const pick = prediction?.knockout_matches[m.id] as KnockoutResult | undefined;
      const partial = computeKnockoutOutcome(m, live, predicted, pick);
      if (partial.status === 'FINISHED') hasAnyResults = true;
      if (partial.state === 'pending' || partial.state === 'upcoming') pendingCount++;
      if (partial.points > 0 && isSameLocalDay(partial.utcDate, now)) pointsToday += partial.points;

      perMatch[m.id] = {
        matchId: m.id,
        kind: 'knockout',
        round: m.round,
        picked: pick ?? null,
        ...partial,
      };
    }

    // ── Knockout aggregate points (qualifier intersections — authoritative) ──
    const r32Pts = intersectionSize(predicted.R32, actual.R32) * QUALIFIER_POINTS.R32;
    const r16Pts = intersectionSize(predicted.R16, actual.R16) * QUALIFIER_POINTS.R16;
    const qfPts = intersectionSize(predicted.QF, actual.QF) * QUALIFIER_POINTS.QF;
    const sfPts = intersectionSize(predicted.SF, actual.SF) * QUALIFIER_POINTS.SF;
    const thirdPartPts = intersectionSize(predicted.thirdParticipants, actual.thirdParticipants) * QUALIFIER_POINTS['3RD'];
    const thirdWinPts = predicted.thirdWinner && actual.thirdWinner && predicted.thirdWinner === actual.thirdWinner
      ? WINNER_POINTS['3RD']
      : 0;
    const finPartPts = intersectionSize(predicted.finalParticipants, actual.finalParticipants) * QUALIFIER_POINTS.FIN;
    const finWinPts = predicted.finalWinner && actual.finalWinner && predicted.finalWinner === actual.finalWinner
      ? WINNER_POINTS.FIN
      : 0;
    const knockoutPoints = r32Pts + r16Pts + qfPts + sfPts + thirdPartPts + thirdWinPts + finPartPts + finWinPts;
    const championCorrect = Boolean(predicted.finalWinner && actual.finalWinner && predicted.finalWinner === actual.finalWinner);

    return {
      bracket,
      predicted,
      actual,
      hasSignal,
      perMatch,
      summary: {
        groupCorrect, groupTotal, groupPoints,
        r32Pts, r16Pts, qfPts, sfPts,
        thirdPartPts, thirdWinPts, finPartPts, finWinPts,
        knockoutPoints,
        championCorrect,
        totalPoints: groupPoints + knockoutPoints,
        pendingCount,
        pointsToday,
        hasAnyResults,
      },
    };
  }, [prediction, safeLive, bracket, predicted, actual, hasSignal]);
}

// Re-export for callers that just need the round mapping
export { GROUP_POINTS, QUALIFIER_POINTS, WINNER_POINTS };

// Helper exposed so the bracket card can compute a single-match outcome without
// calling the full hook (it doesn't need group results, just the one match).
export function getKnockoutMatchOutcome(
  m: KnockoutMatch,
  live: LiveMatch | undefined,
  predicted: Qualifiers,
  pick: KnockoutResult | undefined,
): MatchOutcomeState {
  return computeKnockoutOutcome(m, live, predicted, pick).state;
}

// Group helper for the same reason — single match, no full hook needed.
export function getGroupMatchState(
  pick: MatchResult | undefined,
  live: LiveMatch | undefined,
): MatchOutcomeState {
  const isFinished = live?.status === 'FINISHED' && !!live.actualResult;
  if (isFinished && pick) return pick === live!.actualResult ? 'hit' : 'miss';
  if (isFinished && !pick) return 'no-pick';
  if (live?.utcDate) return pick ? 'upcoming' : 'no-pick';
  return pick ? 'pending' : 'no-pick';
}
