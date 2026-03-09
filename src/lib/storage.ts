import { Predictions, MatchResult, KnockoutResult } from '@/types';

const STORAGE_KEY = 'fifa26-predictions';

export function loadPredictions(): Predictions {
  if (typeof window === 'undefined') {
    return { groupMatches: {}, knockoutMatches: {} };
  }
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return { groupMatches: {}, knockoutMatches: {} };
}

export function savePredictions(predictions: Predictions): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(predictions));
}

export function setGroupPrediction(matchId: string, result: MatchResult): Predictions {
  const predictions = loadPredictions();
  predictions.groupMatches[matchId] = result;
  savePredictions(predictions);
  return predictions;
}

export function setKnockoutPrediction(matchId: string, result: KnockoutResult): Predictions {
  const predictions = loadPredictions();
  predictions.knockoutMatches[matchId] = result;
  savePredictions(predictions);
  return predictions;
}

export function clearKnockoutDownstream(matchId: string): void {
  const predictions = loadPredictions();
  // Clear all downstream knockout matches when an upstream result changes
  const roundOrder = ['R32', 'R16', 'QF', 'SF', '3RD', 'F'];
  const [round] = matchId.split('-');
  const roundIdx = roundOrder.indexOf(round);

  // Clear all subsequent rounds
  for (let i = roundIdx + 1; i < roundOrder.length; i++) {
    Object.keys(predictions.knockoutMatches).forEach(key => {
      if (key.startsWith(roundOrder[i])) {
        delete predictions.knockoutMatches[key];
      }
    });
  }

  savePredictions(predictions);
}

export function resetAllPredictions(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
