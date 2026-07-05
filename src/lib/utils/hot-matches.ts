import type { LiveMatch } from '@/types';

export const HOT_MATCH_WINDOW_BEFORE_MS = 15 * 60 * 1000;
export const HOT_MATCH_WINDOW_AFTER_KICKOFF_MS = 195 * 60 * 1000;

/**
 * Matches worth polling on the fast (20–60s) path. A match is "hot" if it is
 * inside the [kickoff-15min, kickoff+195min] window OR the API currently
 * reports it as actively in progress. Notably, FINISHED matches inside the
 * post-kickoff window stay hot — the football-data.org feed sometimes settles
 * the winner (and the shootout tally) minutes after the final whistle, so we
 * keep polling briefly after status flips to catch those updates. Once the
 * post-kickoff window closes the match falls off and the sync reverts to the
 * slow `full` cadence.
 */
export function getHotMatches(matches: LiveMatch[], now = Date.now()): LiveMatch[] {
  return matches.filter((match) => {
    // Actively in progress — always hot, regardless of clock.
    if (match.status === 'IN_PLAY' || match.status === 'PAUSED') return true;
    const kickoff = new Date(match.utcDate).getTime();
    if (Number.isNaN(kickoff)) return false;
    return now >= kickoff - HOT_MATCH_WINDOW_BEFORE_MS && now <= kickoff + HOT_MATCH_WINDOW_AFTER_KICKOFF_MS;
  });
}

export function getHotMatchApiIds(matches: LiveMatch[] | Record<string, LiveMatch> | undefined, now = Date.now()): number[] {
  if (!matches) return [];
  const list = Array.isArray(matches) ? matches : Object.values(matches);
  const ids = getHotMatches(list, now)
    .map(match => match.apiMatchId)
    .filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
  return Array.from(new Set(ids));
}

export function buildHotMatchRefreshQuery(matches: LiveMatch[] | Record<string, LiveMatch> | undefined): string | null {
  if (!matches) return null;
  const list = Array.isArray(matches) ? matches : Object.values(matches);
  const hotMatches = getHotMatches(list);
  if (hotMatches.length === 0) return null;

  const hotIds = getHotMatchApiIds(hotMatches);
  if (hotIds.length === 0) return 'mode=live';
  return `mode=ids&ids=${encodeURIComponent(hotIds.join(','))}`;
}
