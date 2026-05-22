import { TabId, MatchResult, KnockoutResult } from '@/types';
import { areThirdPlaceTiesResolved, detectThirdPlaceTie, areAllGroupsComplete } from '@/lib/logic/standings';
import { getChampion } from '@/lib/logic/bracket';

export const GROUP_TOTAL = 72;
export const BRACKET_TOTAL = 32;
const SUBMITTED_KEY = 'prediction_submitted';
const SUBMITTED_SNAPSHOT_KEY = 'prediction_submitted_snapshot';
const SUBMITTED_CONFIRMATION_KEY = 'prediction_submitted_confirmation';
const HAS_SUBMITTED_KEY = 'prediction_has_submitted';

export interface SubmittedPredictionConfirmation {
  predictionNumber: number | null;
  shareToken: string | null;
  createdAt: string | null;
  email: string;
}

export interface PredictionFlowState {
  groupCount: number;
  knockoutCount: number;
  groupMatchesComplete: boolean;
  groupsComplete: boolean;
  thirdPlaceRequired: boolean;
  thirdPlaceComplete: boolean;
  thirdPlacePickCount: number;
  thirdPlaceSlotsToFill: number;
  bracketComplete: boolean;
  hasChampion: boolean;
  championCode: string | null;
  submitAvailable: boolean;
  nextPredictionTab: TabId;
  groupProgressLabel: string;
  thirdPlaceProgressLabel: string;
  bracketProgressLabel: string;
}

export function createPredictionSnapshot(
  groupPredictions: Record<string, MatchResult>,
  knockoutPredictions: Record<string, KnockoutResult>,
  thirdPlaceTiebreaker?: string[],
): string {
  return JSON.stringify(groupPredictions) + JSON.stringify(knockoutPredictions) + JSON.stringify(thirdPlaceTiebreaker ?? []);
}

export function getSubmittedForSnapshot(snapshot: string): boolean {
  if (typeof window === 'undefined') return false;
  const wasSubmitted = localStorage.getItem(SUBMITTED_KEY) === 'true';
  if (!wasSubmitted) return false;
  const savedSnapshot = localStorage.getItem(SUBMITTED_SNAPSHOT_KEY);
  if (savedSnapshot === snapshot) return true;
  localStorage.removeItem(SUBMITTED_KEY);
  localStorage.removeItem(SUBMITTED_SNAPSHOT_KEY);
  localStorage.removeItem(SUBMITTED_CONFIRMATION_KEY);
  return false;
}

export function getHasSubmittedBefore(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(HAS_SUBMITTED_KEY) === 'true'
    || localStorage.getItem(SUBMITTED_KEY) === 'true';
}

export function getSubmittedConfirmationForSnapshot(snapshot: string): SubmittedPredictionConfirmation | null {
  if (typeof window === 'undefined') return null;
  if (!getSubmittedForSnapshot(snapshot)) return null;

  try {
    const value = localStorage.getItem(SUBMITTED_CONFIRMATION_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as SubmittedPredictionConfirmation & { snapshot?: string };
    if (parsed.snapshot !== snapshot) return null;
    return {
      predictionNumber: parsed.predictionNumber ?? null,
      shareToken: parsed.shareToken ?? null,
      createdAt: parsed.createdAt ?? null,
      email: parsed.email ?? '',
    };
  } catch {
    localStorage.removeItem(SUBMITTED_CONFIRMATION_KEY);
    return null;
  }
}

export function markSnapshotSubmitted(snapshot: string, confirmation?: SubmittedPredictionConfirmation): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SUBMITTED_KEY, 'true');
  localStorage.setItem(SUBMITTED_SNAPSHOT_KEY, snapshot);
  localStorage.setItem(HAS_SUBMITTED_KEY, 'true');
  if (confirmation) {
    localStorage.setItem(SUBMITTED_CONFIRMATION_KEY, JSON.stringify({ ...confirmation, snapshot }));
  }
}

export function getPredictionFlowState(
  groupPredictions: Record<string, MatchResult>,
  knockoutPredictions: Record<string, KnockoutResult>,
  thirdPlaceTiebreaker: string[] = [],
): PredictionFlowState {
  const groupCount = Object.keys(groupPredictions).length;
  const knockoutCount = Object.keys(knockoutPredictions).length;
  const groupMatchesComplete = groupCount >= GROUP_TOTAL;
  const groupsComplete = groupMatchesComplete && areAllGroupsComplete(groupPredictions);
  const tieInfo = groupsComplete ? detectThirdPlaceTie(groupPredictions) : null;
  const thirdPlaceSlotsToFill = tieInfo?.slotsToFill ?? 0;
  const thirdPlaceRequired = thirdPlaceSlotsToFill > 0;
  const thirdPlacePickCount = thirdPlaceTiebreaker.length;
  const thirdPlaceComplete = !thirdPlaceRequired || areThirdPlaceTiesResolved(groupPredictions, thirdPlaceTiebreaker);
  const bracketComplete = knockoutCount >= BRACKET_TOTAL;
  const championCode = getChampion(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker) ?? null;
  const hasChampion = !!championCode;
  const submitAvailable = hasChampion && groupsComplete && thirdPlaceComplete;

  let nextPredictionTab: TabId = 'groups';
  if (!groupsComplete) {
    nextPredictionTab = 'groups';
  } else if (thirdPlaceRequired && !thirdPlaceComplete) {
    nextPredictionTab = 'thirdplace';
  } else if (hasChampion) {
    nextPredictionTab = 'submit';
  } else {
    nextPredictionTab = 'bracket';
  }

  return {
    groupCount,
    knockoutCount,
    groupMatchesComplete,
    groupsComplete,
    thirdPlaceRequired,
    thirdPlaceComplete,
    thirdPlacePickCount,
    thirdPlaceSlotsToFill,
    bracketComplete,
    hasChampion,
    championCode,
    submitAvailable,
    nextPredictionTab,
    groupProgressLabel: `${Math.min(groupCount, GROUP_TOTAL)}/${GROUP_TOTAL}`,
    thirdPlaceProgressLabel: thirdPlaceRequired ? `${Math.min(thirdPlacePickCount, thirdPlaceSlotsToFill)}/${thirdPlaceSlotsToFill}` : '',
    bracketProgressLabel: `${Math.min(knockoutCount, BRACKET_TOTAL)}/${BRACKET_TOTAL}`,
  };
}
