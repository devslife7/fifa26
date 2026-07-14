import type { LiveMatch } from '@/types';

export const HOT_MATCH_WINDOW_BEFORE_MS = 15 * 60 * 1000;
export const HOT_MATCH_WINDOW_AFTER_KICKOFF_MS = 195 * 60 * 1000;

/** A final whistle is not settled for scoring until the provider publishes its winner. */
export function isWinnerPending(match: LiveMatch): boolean {
  return match.status === 'FINISHED' && match.actualResult === null;
}

export function getHotUnfinishedMatches(matches: LiveMatch[], now = Date.now()): LiveMatch[] {
  return matches.filter((match) => {
    // Keep a finished match hot until the authoritative winner/result arrives.
    if (match.status === 'FINISHED') return isWinnerPending(match);
    // Keep polling any match the API still reports as actively in progress,
    // regardless of elapsed time, so the status never gets stuck as "Live".
    if (match.status === 'IN_PLAY' || match.status === 'PAUSED') return true;
    const kickoff = new Date(match.utcDate).getTime();
    if (Number.isNaN(kickoff)) return false;
    return now >= kickoff - HOT_MATCH_WINDOW_BEFORE_MS && now <= kickoff + HOT_MATCH_WINDOW_AFTER_KICKOFF_MS;
  });
}

export function getHotUnfinishedApiIds(matches: LiveMatch[] | Record<string, LiveMatch> | undefined, now = Date.now()): number[] {
  if (!matches) return [];
  const list = Array.isArray(matches) ? matches : Object.values(matches);
  const ids = getHotUnfinishedMatches(list, now)
    .map(match => match.apiMatchId)
    .filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
  return Array.from(new Set(ids));
}

export function buildHotMatchRefreshQuery(matches: LiveMatch[] | Record<string, LiveMatch> | undefined): string | null {
  if (!matches) return null;
  const list = Array.isArray(matches) ? matches : Object.values(matches);
  const hotMatches = getHotUnfinishedMatches(list);
  if (hotMatches.length === 0) return null;

  const hotIds = getHotUnfinishedApiIds(hotMatches);
  if (hotIds.length === 0) return 'mode=live';
  return `mode=ids&ids=${encodeURIComponent(hotIds.join(','))}`;
}
