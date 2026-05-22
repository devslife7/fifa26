import { Predictions, SavedPrediction } from '@/types';

const STORAGE_KEY = 'fifa26-predictions';
const EDITING_ID_KEY = 'fifa26-editing-prediction-id';
const EDITING_NAME_KEY = 'fifa26-editing-prediction-name';

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
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent('predictions-saved'));
  }, 0);
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
