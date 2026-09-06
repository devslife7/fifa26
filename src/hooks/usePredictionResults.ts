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
import { generateBracket, isPlaceholder } from '@/lib/logic/bracket';
import {
  GROUP_POINTS,
  QUALIFIER_POINTS,
  RUNNER_UP_POINTS,
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
  /** Points attributable to the team named by this row. */
  teamPoints: number;
  /** Points earned by the other team derived from the same placement pick. */
  relatedPoints: number;
  /** Total points sourced by this prediction, including related placement points. */
  points: number;
  utcDate?: string;
  status: LiveMatch['status'] | 'NOT_LIVE';
  score: { home: number; away: number } | null;
  penalties: { home: number; away: number } | null;
}

export interface PointsSummary {
  groupCorrect: number;
  groupTotal: number;
  groupPoints: number;
  r16Pts: number;
  qfPts: number;
  sfPts: number;
  thirdPartPts: number;
  thirdWinPts: number;
  finPartPts: number;
  finWinPts: number;
  runnerUpPts: number;
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
  finalRunnerUp: null,
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
): {
  qualifiers: Qualifiers;
  hasSignal: Record<KnockoutRound | 'thirdWinner' | 'finalWinner', boolean>;
  eliminated: Set<string>;
} {
  const R32 = new Set<string>();
  const R16 = new Set<string>();
  const QF = new Set<string>();
  const SF = new Set<string>();
  const thirdParticipants = new Set<string>();
  const finalParticipants = new Set<string>();
  let thirdWinner: string | null = null;
  let finalWinner: string | null = null;
  let finalRunnerUp: string | null = null;
  // Every team that has lost a finished knockout match (any round). Used to settle
  // a per-match pick as a MISS once the team it sent forward is knocked out of the
  // championship path — independent of which bracket slot that team occupies.
  const eliminated = new Set<string>();

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
    if (loser) eliminated.add(loser);

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
      if (loser) finalRunnerUp = loser;
      hasSignal.finalWinner = true;
    }
  }

  return {
    qualifiers: { R32, R16, QF, SF, thirdParticipants, thirdWinner, finalParticipants, finalWinner, finalRunnerUp },
    hasSignal,
    eliminated,
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
 * badge). Returns the user's per-match outcome for a single knockout match.
 *
 * The outcome is TEAM-centric, not slot-centric: each knockout pick represents a
 * team the user sent forward, and we judge it by whether that team actually reached
 * the next round (a hit) or has been knocked out of the championship path (a miss).
 * This is deliberate — the user's bracket can diverge from reality, so the team they
 * picked may play its real match in a different slot than where their bracket placed
 * it (e.g. Canada predicted as the Group B winner in R32-13 actually plays the real
 * R32-1). Joining live results by slot id would then mis-settle the pick. Comparing
 * the picked team against the actual qualifier sets sidesteps the slot mismatch and
 * mirrors how the leaderboard scores knockout picks (qualifier-set intersection).
 */
function computeKnockoutOutcome(
  m: KnockoutMatch,
  live: LiveMatch | undefined,
  actual: Qualifiers,
  eliminated: Set<string>,
  r32Field: Set<string>,
  r32FieldKnown: boolean,
  predictionPick: KnockoutResult | undefined,
): Pick<PerMatchOutcome, 'state' | 'teamPoints' | 'relatedPoints' | 'points' | 'actualResult' | 'actualWinnerCode' | 'pickedTeamCode' | 'homeCode' | 'awayCode' | 'utcDate' | 'status' | 'score' | 'penalties'> {
  const homeCode = live?.homeCode ?? m.home ?? null;
  const awayCode = live?.awayCode ?? m.away ?? null;
  const utcDate = live?.utcDate;
  const status = (live?.status ?? 'NOT_LIVE') as LiveMatch['status'] | 'NOT_LIVE';
  const score = live?.score ?? null;
  const penalties = live?.penalties ?? null;
  const actualResult = live?.actualResult ?? null;

  const isFinished = live?.status === 'FINISHED' && actualResult && live?.homeCode && live?.awayCode;
  const actualWinnerCode = isFinished
    ? (actualResult === 'home' ? live.homeCode : actualResult === 'away' ? live.awayCode : null)
    : null;

  let pickedTeamCode: string | null = null;
  if (predictionPick === 'home') pickedTeamCode = m.home ?? null;
  else if (predictionPick === 'away') pickedTeamCode = m.away ?? null;

  const base = {
    actualResult,
    actualWinnerCode,
    pickedTeamCode,
    homeCode,
    awayCode,
    utcDate,
    status,
    score,
    penalties,
  };

  if (!predictionPick || !pickedTeamCode) {
    return { ...base, state: isFinished ? 'no-pick' : utcDate ? 'upcoming' : 'pending', teamPoints: 0, relatedPoints: 0, points: 0 };
  }

  // The picked team advances if it appears in the actual qualifier set for the round
  // it should have reached; it has missed once it is knocked out of the path. The
  // loser of the user's predicted SF/Final also carries a bonus (3rd-place / runner-up
  // participant), keyed off the OTHER team in their predicted matchup.
  const reached = (set: Set<string>) => set.has(pickedTeamCode!);
  const predictedLoser = predictionPick === 'home' ? (m.away ?? null) : (m.home ?? null);
  const knockedOut = eliminated.has(pickedTeamCode);
  // Once the full 32-team Round-of-32 field is known, a picked team missing from it
  // was eliminated in the group stage and can never advance — an immediate miss for
  // any knockout pick, regardless of round (e.g. Uruguay picked deep into the bracket
  // after failing to escape its group).
  const groupEliminated = r32FieldKnown && !isPlaceholder(pickedTeamCode) && !r32Field.has(pickedTeamCode);

  let teamPoints = 0;
  let relatedPoints = 0;
  let isHit = false;
  let decided = false;

  if (m.round === 'R32') {
    if (reached(actual.R16)) { teamPoints += QUALIFIER_POINTS.R16; isHit = true; decided = true; }
    else if (knockedOut || groupEliminated) decided = true;
  } else if (m.round === 'R16') {
    if (reached(actual.QF)) { teamPoints += QUALIFIER_POINTS.QF; isHit = true; decided = true; }
    else if (knockedOut || groupEliminated) decided = true;
  } else if (m.round === 'QF') {
    if (reached(actual.SF)) { teamPoints += QUALIFIER_POINTS.SF; isHit = true; decided = true; }
    else if (knockedOut || groupEliminated) decided = true;
  } else if (m.round === 'SF') {
    if (reached(actual.finalParticipants)) { teamPoints += QUALIFIER_POINTS.FIN; isHit = true; decided = true; }
    if (predictedLoser && actual.thirdParticipants.has(predictedLoser)) { relatedPoints += QUALIFIER_POINTS['3RD']; }
    if (!isHit && (knockedOut || groupEliminated)) decided = true;
  } else if (m.round === '3RD') {
    if (actual.thirdWinner === pickedTeamCode) { teamPoints += WINNER_POINTS['3RD']; isHit = true; decided = true; }
    else if (actual.thirdWinner || groupEliminated) decided = true;
  } else if (m.round === 'FIN') {
    if (actual.finalWinner === pickedTeamCode) { teamPoints += WINNER_POINTS.FIN; isHit = true; decided = true; }
    if (predictedLoser && actual.finalRunnerUp && actual.finalRunnerUp === predictedLoser) { relatedPoints += RUNNER_UP_POINTS; }
    if (!isHit && (actual.finalWinner || groupEliminated)) decided = true;
  }

  let state: MatchOutcomeState;
  if (isHit) state = 'hit';
  else if (decided) state = 'miss';
  else state = utcDate ? 'upcoming' : 'pending';

  return { ...base, state, teamPoints, relatedPoints, points: teamPoints + relatedPoints };
}

export function computePredictionResults(
  prediction: PredictionInput,
  liveMatches: Record<string, LiveMatch> | undefined,
): UsePredictionResultsValue {
  const safeLive = liveMatches ?? {};

  let bracket: KnockoutMatch[] = [];
  if (prediction) {
    try {
      bracket = generateBracket(
        (prediction.group_matches ?? {}) as Record<string, MatchResult>,
        (prediction.knockout_matches ?? {}) as Record<string, KnockoutResult>,
        prediction.third_place_tiebreaker ?? undefined,
      );
    } catch {
      bracket = [];
    }
  }

  let predicted = EMPTY_QUALIFIERS;
  if (prediction) {
    try {
      predicted = getPredictedQualifiers({
        user_id: '',
        group_matches: prediction.group_matches ?? {},
        knockout_matches: prediction.knockout_matches ?? {},
        champion_code: prediction.champion_code,
        third_place_tiebreaker: prediction.third_place_tiebreaker ?? null,
      });
    } catch {
      predicted = EMPTY_QUALIFIERS;
    }
  }

  const { qualifiers: actual, hasSignal, eliminated } = prediction
    ? deriveActualFromLive(bracket, safeLive)
    : { qualifiers: EMPTY_QUALIFIERS, hasSignal: EMPTY_SIGNAL, eliminated: new Set<string>() };

  // The set of teams that actually reached the Round of 32 (both sides of every
  // resolved R32 fixture). Once all 16 fixtures carry real teams, the field is "known"
  // and any picked knockout team absent from it was eliminated in the group stage.
  const r32Field = new Set<string>();
  let resolvedR32Slots = 0;
  for (const lm of Object.values(safeLive)) {
    if (lm.stage !== 'R32') continue;
    const { homeCode, awayCode } = lm;
    if (homeCode && awayCode && !isPlaceholder(homeCode) && !isPlaceholder(awayCode)) {
      r32Field.add(homeCode);
      r32Field.add(awayCode);
      resolvedR32Slots++;
    }
  }
  const r32FieldKnown = resolvedR32Slots >= 16;

  const perMatch: Record<string, PerMatchOutcome> = {};
  const now = new Date();
  let pointsToday = 0;
  let pendingCount = 0;
  let hasAnyResults = false;

    // ── Group matches ──
    let groupCorrect = 0;
    let groupTotal = 0;
    const groupMatches = prediction?.group_matches ?? {};
    const knockoutMatches = prediction?.knockout_matches ?? {};
    for (const gm of allGroupMatches) {
      const live = safeLive[gm.id];
      const picked = groupMatches[gm.id];
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
        teamPoints: points,
        relatedPoints: 0,
        points,
        utcDate: live?.utcDate,
        status: (live?.status ?? 'NOT_LIVE') as LiveMatch['status'] | 'NOT_LIVE',
        score: live?.score ?? null,
        penalties: live?.penalties ?? null,
      };
    }
    const groupPoints = groupCorrect * GROUP_POINTS;

    // ── Knockout matches ──
    for (const m of bracket) {
      const live = safeLive[m.id];
      const pick = knockoutMatches[m.id] as KnockoutResult | undefined;
      const partial = computeKnockoutOutcome(m, live, actual, eliminated, r32Field, r32FieldKnown, pick);
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
    // Reaching the Round of 32 is not worth points on its own, so it is not scored here.
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
    const runnerUpPts = predicted.finalRunnerUp && actual.finalRunnerUp && predicted.finalRunnerUp === actual.finalRunnerUp
      ? RUNNER_UP_POINTS
      : 0;
    const knockoutPoints = r16Pts + qfPts + sfPts + thirdPartPts + thirdWinPts + finPartPts + finWinPts + runnerUpPts;
    const championCorrect = Boolean(predicted.finalWinner && actual.finalWinner && predicted.finalWinner === actual.finalWinner);

  return {
    bracket,
    predicted,
    actual,
    hasSignal,
    perMatch,
    summary: {
      groupCorrect, groupTotal, groupPoints,
      r16Pts, qfPts, sfPts,
      thirdPartPts, thirdWinPts, finPartPts, finWinPts, runnerUpPts,
      knockoutPoints,
      championCorrect,
      totalPoints: groupPoints + knockoutPoints,
      pendingCount,
      pointsToday,
      hasAnyResults,
    },
  };
}

export function usePredictionResults(
  prediction: PredictionInput,
  liveMatches: Record<string, LiveMatch> | undefined,
): UsePredictionResultsValue {
  return useMemo(
    () => computePredictionResults(prediction, liveMatches),
    [prediction, liveMatches],
  );
}

// Re-export for callers that just need the round mapping
export { GROUP_POINTS, QUALIFIER_POINTS, RUNNER_UP_POINTS, WINNER_POINTS };

// Helper exposed so the bracket card can compute a single-match outcome without
// calling the full hook (it doesn't need group results, just the one match). Takes
// the actual qualifier sets + eliminated teams (see deriveActualFromLive) so it can
// settle the pick team-centrically, the same way the full hook does.
export function getKnockoutMatchOutcome(
  m: KnockoutMatch,
  live: LiveMatch | undefined,
  actual: Qualifiers,
  eliminated: Set<string>,
  r32Field: Set<string>,
  r32FieldKnown: boolean,
  pick: KnockoutResult | undefined,
): MatchOutcomeState {
  return computeKnockoutOutcome(m, live, actual, eliminated, r32Field, r32FieldKnown, pick).state;
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
