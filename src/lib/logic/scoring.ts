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

  for (const actual of actualResults) {
    if (actual.match_type === 'group') {
      // Group match: correct result prediction = 1 pt
      const predicted = prediction.group_matches[actual.match_id];
      if (predicted === actual.result) {
        points += GROUP_POINTS;
      }
    } else {
      // Knockout match: correct winner prediction
      const predicted = prediction.knockout_matches[actual.match_id];
      if (predicted === actual.result) {
        const round = actual.match_id.split('-')[0];
        points += KNOCKOUT_POINTS[round] ?? 0;
      }
    }
  }

  // Champion bonus
  if (actualChampion && prediction.champion_code === actualChampion) {
    points += CHAMPION_POINTS;
  }

  return points;
}
