import type { MatchResult } from '@/types';

export const TOTAL_GROUP_MATCHES = 72;

export interface PredictionStats {
  homeWins: number;
  draws: number;
  awayWins: number;
  totalPicked: number;
  totalMatches: number;
}

export function computeStats(
  groupMatches: Record<string, MatchResult>,
): PredictionStats {
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;

  for (const result of Object.values(groupMatches)) {
    if (result === 'home') homeWins += 1;
    else if (result === 'draw') draws += 1;
    else if (result === 'away') awayWins += 1;
  }

  return {
    homeWins,
    draws,
    awayWins,
    totalPicked: homeWins + draws + awayWins,
    totalMatches: TOTAL_GROUP_MATCHES,
  };
}
