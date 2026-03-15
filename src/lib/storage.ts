import { Predictions, MatchResult, KnockoutResult, SavedPrediction } from '@/types';

const STORAGE_KEY = 'fifa26-predictions';
const EDITING_ID_KEY = 'fifa26-editing-prediction-id';
const EDITING_NAME_KEY = 'fifa26-editing-prediction-name';
const DARK_MODE_KEY = 'fifa26-dark-mode';

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
  const roundOrder = ['R32', 'R16', 'QF', 'SF', '3RD', 'FIN'];
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
  localStorage.removeItem(EDITING_ID_KEY);
  localStorage.removeItem(EDITING_NAME_KEY);
}

export function getEditingPredictionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(EDITING_ID_KEY);
}

export function getEditingPredictionName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(EDITING_NAME_KEY);
}

export function setEditingPrediction(id: string | null, name?: string | null): void {
  if (typeof window === 'undefined') return;
  if (id) {
    localStorage.setItem(EDITING_ID_KEY, id);
    if (name) localStorage.setItem(EDITING_NAME_KEY, name);
  } else {
    localStorage.removeItem(EDITING_ID_KEY);
    localStorage.removeItem(EDITING_NAME_KEY);
  }
}

export function getDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DARK_MODE_KEY) === 'true';
}

export function setDarkMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DARK_MODE_KEY, String(enabled));
}

export function loadFromServer(prediction: SavedPrediction): void {
  if (typeof window === 'undefined') return;
  const hydrated: Predictions = {
    groupMatches: prediction.group_matches ?? {},
    knockoutMatches: prediction.knockout_matches ?? {},
    thirdPlaceTiebreaker: prediction.third_place_tiebreaker ?? undefined,
  };
  savePredictions(hydrated);
  setEditingPrediction(prediction.id, prediction.name);
}
