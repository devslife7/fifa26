import type { GroupTiebreakers, KnockoutMatch, KnockoutResult, KnockoutRound, MatchResult } from '@/types';
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
  group_tiebreakers?: GroupTiebreakers | null;
  third_place_tiebreaker: string[] | null;
}

export const GROUP_POINTS = 1;

export const QUALIFIER_POINTS: Record<KnockoutRound, number> = {
  R32: 2,
  R16: 3,
  QF: 4,
  SF: 5,
  '3RD': 3,
  FIN: 6,
};

export const WINNER_POINTS = {
  '3RD': 4,
  FIN: 10,
} as const;

export interface Qualifiers {
  R32: Set<string>;
  R16: Set<string>;
  QF: Set<string>;
  SF: Set<string>;
  thirdParticipants: Set<string>;
  thirdWinner: string | null;
  finalParticipants: Set<string>;
  finalWinner: string | null;
}

function isRealCode(code: string | undefined | null): code is string {
  return !!code && !code.startsWith('PH:');
}

function addReal(set: Set<string>, code: string | undefined | null) {
  if (isRealCode(code)) set.add(code);
}

function qualifiersFromBracket(bracket: KnockoutMatch[], explicitChampion?: string | null): Qualifiers {
  const byRound = (round: KnockoutRound) => bracket.filter((m) => m.round === round);

  const R32 = new Set<string>();
  for (const m of byRound('R32')) {
    addReal(R32, m.home);
    addReal(R32, m.away);
  }

  const R16 = new Set<string>();
  for (const m of byRound('R32')) addReal(R16, getMatchWinner(m));

  const QF = new Set<string>();
  for (const m of byRound('R16')) addReal(QF, getMatchWinner(m));

  const SF = new Set<string>();
  for (const m of byRound('QF')) addReal(SF, getMatchWinner(m));

  const thirdMatch = bracket.find((m) => m.id === '3RD-1');
  const thirdParticipants = new Set<string>();
  addReal(thirdParticipants, thirdMatch?.home);
  addReal(thirdParticipants, thirdMatch?.away);
  const thirdWinner = thirdMatch ? getMatchWinner(thirdMatch) ?? null : null;

  const finalMatch = bracket.find((m) => m.id === 'FIN-1');
  const finalParticipants = new Set<string>();
  addReal(finalParticipants, finalMatch?.home);
  addReal(finalParticipants, finalMatch?.away);
  const finalWinnerFromBracket = finalMatch ? getMatchWinner(finalMatch) ?? null : null;
  const finalWinner = isRealCode(explicitChampion) ? explicitChampion : finalWinnerFromBracket;

  return { R32, R16, QF, SF, thirdParticipants, thirdWinner, finalParticipants, finalWinner };
}

export function getPredictedQualifiers(prediction: PredictionRow): Qualifiers {
  const bracket = generateBracket(
    prediction.group_matches as Record<string, MatchResult>,
    prediction.knockout_matches as Record<string, KnockoutResult>,
    prediction.third_place_tiebreaker ?? undefined,
    prediction.group_tiebreakers ?? {},
  );
  return qualifiersFromBracket(bracket, prediction.champion_code);
}

export function getActualQualifiers(
  actualResults: ActualResult[],
  tiebreakerFallback?: string[] | null,
  groupTiebreakerFallback?: GroupTiebreakers | null,
): Qualifiers {
  const groupMatches: Record<string, MatchResult> = {};
  const knockoutMatches: Record<string, KnockoutResult> = {};
  let actualChampion: string | null = null;

  for (const row of actualResults) {
    if (row.match_type === 'group') {
      groupMatches[row.match_id] = row.result as MatchResult;
    } else if (row.match_type === 'knockout') {
      if (row.result === 'home' || row.result === 'away') {
        knockoutMatches[row.match_id] = row.result;
      }
      if (row.match_id === 'FIN-1') {
        actualChampion = row.winning_team;
      }
    }
  }

  const bracket = generateBracket(groupMatches, knockoutMatches, tiebreakerFallback ?? undefined, groupTiebreakerFallback ?? {});
  return qualifiersFromBracket(bracket, actualChampion);
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
  const actual = getActualQualifiers(actualResults, prediction.third_place_tiebreaker, prediction.group_tiebreakers);

  points += intersectionSize(predicted.R32, actual.R32) * QUALIFIER_POINTS.R32;
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

  return points;
}
