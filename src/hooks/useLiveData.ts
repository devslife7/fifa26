'use client';

import type { GroupLetter, LiveMatch } from '@/types';
import { archive, archivedFlags, archivedMatchesById } from '@/lib/client/archive';

// Retained name for the existing result and bracket components; data is immutable.
export interface LiveDataRefreshResult {
  ok: boolean;
  status: 'updated' | 'winner_pending' | 'rate_limited' | 'error';
  winnerPendingIds: number[];
  resultsBridged: number;
  scoresUpdated: number;
  message?: string;
}
const groupMatchesByGroup: Partial<Record<GroupLetter, LiveMatch[]>> = {};
for (const match of archive.matches) {
  if (match.stage === 'GROUP' && match.group) {
    const group = match.group as GroupLetter;
    (groupMatchesByGroup[group] ??= []).push(match);
  }
}
const refetch = async (): Promise<LiveDataRefreshResult> => ({
  ok: true, status: 'updated', winnerPendingIds: [], resultsBridged: 0, scoresUpdated: 0,
});
export function useLiveData() {
  return {
    matches: archive.matches, matchesByLocalId: archivedMatchesById,
    groupMatchesByGroup, teamFlagsByCode: archivedFlags,
    loading: false, error: null, rateLimited: false,
    lastUpdated: Date.parse(archive.capturedAt), refetch,
  };
}
