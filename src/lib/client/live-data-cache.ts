import type { LiveMatch } from '@/types';

export const LIVE_DATA_LS_KEY = 'fifa26_live_data';
const LEGACY_FAKE_LIVE_DATA_LS_KEY = 'fifa26_fake_live_data';

export interface CachedLiveData {
  matches: LiveMatch[];
  fetchedAt: number;
}

function legacyHashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

function isLegacyFakeMatch(match: LiveMatch): boolean {
  return !!match.localMatchId && match.apiMatchId === legacyHashCode(`fake-${match.localMatchId}`);
}

export function readCachedLiveData(): CachedLiveData | null {
  try {
    localStorage.removeItem(LEGACY_FAKE_LIVE_DATA_LS_KEY);
    const raw = localStorage.getItem(LIVE_DATA_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedLiveData>;
    const matches = (parsed.matches ?? []).filter((match) => !isLegacyFakeMatch(match));
    return {
      matches,
      fetchedAt: parsed.fetchedAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeCachedLiveData(matches: LiveMatch[]): void {
  try {
    localStorage.setItem(LIVE_DATA_LS_KEY, JSON.stringify({ matches, fetchedAt: Date.now() } satisfies CachedLiveData));
  } catch {
    // localStorage can be unavailable or full.
  }
}
