import type { LiveMatch } from '@/types';

export const LIVE_DATA_LS_KEY = 'fifa26_live_data';
export const FAKE_LIVE_DATA_LS_KEY = 'fifa26_fake_live_data';

export interface CachedLiveData {
  matches: LiveMatch[];
  fetchedAt: number;
}

export function readCachedLiveData(key = LIVE_DATA_LS_KEY): CachedLiveData | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedLiveData>;
    return {
      matches: parsed.matches ?? [],
      fetchedAt: parsed.fetchedAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeCachedLiveData(matches: LiveMatch[], key = LIVE_DATA_LS_KEY): void {
  try {
    localStorage.setItem(key, JSON.stringify({ matches, fetchedAt: Date.now() } satisfies CachedLiveData));
  } catch {
    // localStorage can be unavailable or full.
  }
}

export function clearCachedLiveData(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

export function readFakeLiveData(): CachedLiveData | null {
  return readCachedLiveData(FAKE_LIVE_DATA_LS_KEY);
}

export function writeFakeLiveData(matches: LiveMatch[]): void {
  writeCachedLiveData(matches, FAKE_LIVE_DATA_LS_KEY);
}

export function mergeLiveMatches(baseMatches: LiveMatch[], overrideMatches: LiveMatch[]): LiveMatch[] {
  if (overrideMatches.length === 0) return baseMatches;

  const overrideIds = new Set(
    overrideMatches
      .map((m) => m.localMatchId)
      .filter((id): id is string => !!id),
  );

  return [
    ...baseMatches.filter((m) => !m.localMatchId || !overrideIds.has(m.localMatchId)),
    ...overrideMatches,
  ];
}
