import type { KnockoutResult, KnockoutRound, MatchResult } from '@/types';
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

export const KNOCKOUT_POINTS: Record<string, number> = {
  R32: 2,
  R16: 3,
  QF: 4,
  SF: 5,
  '3RD': 3,
  F: 6,
  FIN: 6,
};

export const CHAMPION_POINTS = 10;
export const GROUP_POINTS = 1;

export function calculateScore(
  prediction: PredictionRow,
  actualResults: ActualResult[],
  actualChampion: string | null
): number {
  let points = 0;

  // Group stage: +1 per correctly predicted result
  for (const actual of actualResults) {
    if (actual.match_type !== 'group') continue;
    const predicted = prediction.group_matches[actual.match_id];
    if (predicted === actual.result) {
      points += GROUP_POINTS;
    }
  }

  // Knockout: award round points if the team the user predicted to win a
  // match actually advanced from that round in reality.
  const advancedByRound: Partial<Record<KnockoutRound, Set<string>>> = {};
  for (const actual of actualResults) {
    if (actual.match_type !== 'knockout' || !actual.winning_team) continue;
    const round = actual.match_id.split('-')[0] as KnockoutRound;
    (advancedByRound[round] ??= new Set()).add(actual.winning_team);
  }

  const userBracket = generateBracket(
    prediction.group_matches as Record<string, MatchResult>,
    prediction.knockout_matches as Record<string, KnockoutResult>,
    prediction.third_place_tiebreaker ?? undefined
  );

  for (const match of userBracket) {
    const predictedWinner = getMatchWinner(match);
    if (!predictedWinner) continue;
    if (advancedByRound[match.round]?.has(predictedWinner)) {
      points += KNOCKOUT_POINTS[match.round] ?? 0;
    }
  }

  // Champion bonus
  if (actualChampion && prediction.champion_code === actualChampion) {
    points += CHAMPION_POINTS;
  }

  return points;
}
