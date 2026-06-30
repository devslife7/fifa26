import type { KnockoutMatch, KnockoutResult, KnockoutRound, MatchResult } from '@/types';
import { generateBracket, getMatchWinner } from './bracket';

interface ActualResult {
  match_id: string;
  match_type: 'group' | 'knockout';
  result: 'home' | 'draw' | 'away';
  winning_team: string | null;
}

interface PredictionRow {
  user_id: string;
  group_matches: Record<string, string>;
  knockout_matches: Record<string, string>;
  champion_code: string | null;
  third_place_tiebreaker: string[] | null;
}

export const GROUP_POINTS = 1;

export const QUALIFIER_POINTS = {
  R16: 3,
  QF: 4,
  SF: 5,
  '3RD': 3,
  FIN: 6,
} as const satisfies Partial<Record<KnockoutRound, number>>;

export const WINNER_POINTS = {
  '3RD': 4,
  FIN: 10,
} as const;

/** Bonus for correctly predicting the tournament runner-up (the team that loses the Final). */
export const RUNNER_UP_POINTS = 6;

const ROUND_NAME: Record<KnockoutRound, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  '3RD': '3rd-place match',
  FIN: 'Final',
};

const NEXT_ROUND: Partial<Record<KnockoutRound, KnockoutRound>> = {
  R32: 'R16',
  R16: 'QF',
  QF: 'SF',
  SF: 'FIN',
};

/** Human-readable point stakes for a knockout match, derived from the scoring constants. */
export function getMatchStakes(round: KnockoutRound): { perTeam: string | null; winner: string } {
  // Reaching the Round of 32 is not worth points on its own, so it has no per-team stake.
  const roundPts = (QUALIFIER_POINTS as Partial<Record<KnockoutRound, number>>)[round];
  const perTeam = roundPts != null
    ? `+${roundPts} pts per team you correctly send to the ${ROUND_NAME[round]}`
    : null;
  if (round === 'FIN') {
    return {
      perTeam,
      winner: `+${WINNER_POINTS.FIN} pts for the champion · +${RUNNER_UP_POINTS} for the runner-up`,
    };
  }
  if (round === '3RD') {
    return { perTeam, winner: `+${WINNER_POINTS['3RD']} pts for picking the 3rd-place winner` };
  }
  const next = NEXT_ROUND[round]!;
  const nextPts = (QUALIFIER_POINTS as Partial<Record<KnockoutRound, number>>)[next];
  return { perTeam, winner: `+${nextPts} pts for picking who advances to the ${ROUND_NAME[next]}` };
}

export interface Qualifiers {
  R32: Set<string>;
  R16: Set<string>;
  QF: Set<string>;
  SF: Set<string>;
  thirdParticipants: Set<string>;
  thirdWinner: string | null;
  finalParticipants: Set<string>;
  finalWinner: string | null;
  finalRunnerUp: string | null;
}

function isRealCode(code: string | undefined | null): code is string {
  return !!code && !code.startsWith('PH:');
}

function addReal(set: Set<string>, code: string | undefined | null) {
  if (isRealCode(code)) set.add(code);
}

function qualifiersFromBracket(
  bracket: KnockoutMatch[],
  explicitChampion?: string | null,
  // Recorded match winners (by match id). When a real winner is recorded we trust
  // it over the reconstructed bracket — the bracket can fail to resolve a side
  // (e.g. an unresolved best-third placeholder), but the recorded result is ground
  // truth for who actually advanced.
  winnerOverrides?: Map<string, string>,
): Qualifiers {
  const byRound = (round: KnockoutRound) => bracket.filter((m) => m.round === round);
  const winnerOf = (m: KnockoutMatch): string | undefined => {
    const recorded = winnerOverrides?.get(m.id);
    return isRealCode(recorded) ? recorded : getMatchWinner(m);
  };

  const R32 = new Set<string>();
  for (const m of byRound('R32')) {
    addReal(R32, m.home);
    addReal(R32, m.away);
  }

  const R16 = new Set<string>();
  for (const m of byRound('R32')) addReal(R16, winnerOf(m));

  const QF = new Set<string>();
  for (const m of byRound('R16')) addReal(QF, winnerOf(m));

  const SF = new Set<string>();
  for (const m of byRound('QF')) addReal(SF, winnerOf(m));

  const thirdMatch = bracket.find((m) => m.id === '3RD-1');
  const thirdParticipants = new Set<string>();
  addReal(thirdParticipants, thirdMatch?.home);
  addReal(thirdParticipants, thirdMatch?.away);
  const thirdWinner = thirdMatch ? winnerOf(thirdMatch) ?? null : null;

  const finalMatch = bracket.find((m) => m.id === 'FIN-1');
  const finalParticipants = new Set<string>();
  addReal(finalParticipants, finalMatch?.home);
  addReal(finalParticipants, finalMatch?.away);
  const finalWinnerFromBracket = finalMatch ? winnerOf(finalMatch) ?? null : null;
  const finalWinner = isRealCode(explicitChampion) ? explicitChampion : finalWinnerFromBracket;

  // The runner-up is the finalist who is not the champion.
  let finalRunnerUp: string | null = null;
  if (finalWinner) {
    if (isRealCode(finalMatch?.home) && finalMatch?.home !== finalWinner) finalRunnerUp = finalMatch!.home;
    else if (isRealCode(finalMatch?.away) && finalMatch?.away !== finalWinner) finalRunnerUp = finalMatch!.away;
  }

  return { R32, R16, QF, SF, thirdParticipants, thirdWinner, finalParticipants, finalWinner, finalRunnerUp };
}

export function getPredictedQualifiers(prediction: PredictionRow): Qualifiers {
  const bracket = generateBracket(
    prediction.group_matches as Record<string, MatchResult>,
    prediction.knockout_matches as Record<string, KnockoutResult>,
    prediction.third_place_tiebreaker ?? undefined,
  );
  return qualifiersFromBracket(bracket, prediction.champion_code);
}

export function getActualQualifiers(
  actualResults: ActualResult[],
  tiebreakerFallback?: string[] | null,
): Qualifiers {
  const groupMatches: Record<string, MatchResult> = {};
  const knockoutMatches: Record<string, KnockoutResult> = {};
  const winnerOverrides = new Map<string, string>();
  let actualChampion: string | null = null;

  for (const row of actualResults) {
    if (row.match_type === 'group') {
      groupMatches[row.match_id] = row.result as MatchResult;
    } else if (row.match_type === 'knockout') {
      if (row.result === 'home' || row.result === 'away') {
        knockoutMatches[row.match_id] = row.result;
      }
      // The recorded winner is the source of truth for who advanced — this credits
      // matches whose loser/winner can't be reconstructed from the bracket (e.g. a
      // best-third team whose qualification depends on an unresolved third-place tie).
      if (isRealCode(row.winning_team)) {
        winnerOverrides.set(row.match_id, row.winning_team);
      }
      if (row.match_id === 'FIN-1') {
        actualChampion = row.winning_team;
      }
    }
  }

  const bracket = generateBracket(groupMatches, knockoutMatches, tiebreakerFallback ?? undefined);
  return qualifiersFromBracket(bracket, actualChampion, winnerOverrides);
}

function intersectionSize(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const x of a) if (b.has(x)) count++;
  return count;
}

export function calculateScore(
  prediction: PredictionRow,
  actualResults: ActualResult[],
): number {
  let points = 0;

  // Group stage — per-match exact result.
  for (const actual of actualResults) {
    if (actual.match_type !== 'group') continue;
    const predicted = prediction.group_matches[actual.match_id];
    if (predicted === actual.result) points += GROUP_POINTS;
  }

  // Knockout — qualifier-based.
  const predicted = getPredictedQualifiers(prediction);
  const actual = getActualQualifiers(actualResults, prediction.third_place_tiebreaker);

  points += intersectionSize(predicted.R16, actual.R16) * QUALIFIER_POINTS.R16;
  points += intersectionSize(predicted.QF, actual.QF) * QUALIFIER_POINTS.QF;
  points += intersectionSize(predicted.SF, actual.SF) * QUALIFIER_POINTS.SF;

  points += intersectionSize(predicted.thirdParticipants, actual.thirdParticipants) * QUALIFIER_POINTS['3RD'];
  if (predicted.thirdWinner && actual.thirdWinner && predicted.thirdWinner === actual.thirdWinner) {
    points += WINNER_POINTS['3RD'];
  }

  points += intersectionSize(predicted.finalParticipants, actual.finalParticipants) * QUALIFIER_POINTS.FIN;
  if (predicted.finalWinner && actual.finalWinner && predicted.finalWinner === actual.finalWinner) {
    points += WINNER_POINTS.FIN;
  }
  if (predicted.finalRunnerUp && actual.finalRunnerUp && predicted.finalRunnerUp === actual.finalRunnerUp) {
    points += RUNNER_UP_POINTS;
  }

  return points;
}
