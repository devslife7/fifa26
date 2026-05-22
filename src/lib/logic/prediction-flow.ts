import { TabId, MatchResult, KnockoutResult } from '@/types';
import { areThirdPlaceTiesResolved, detectThirdPlaceTie, areAllGroupsComplete } from '@/lib/logic/standings';
import { getChampion } from '@/lib/logic/bracket';

export const GROUP_TOTAL = 72;
export const BRACKET_TOTAL = 32;

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
  const wasSubmitted = localStorage.getItem('prediction_submitted') === 'true';
  if (!wasSubmitted) return false;
  const savedSnapshot = localStorage.getItem('prediction_submitted_snapshot');
  if (savedSnapshot === snapshot) return true;
  localStorage.removeItem('prediction_submitted');
  localStorage.removeItem('prediction_submitted_snapshot');
  return false;
}

export function markSnapshotSubmitted(snapshot: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('prediction_submitted', 'true');
  localStorage.setItem('prediction_submitted_snapshot', snapshot);
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
