'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { LiveMatch } from '@/types';

interface LiveDataResult {
  matches: LiveMatch[];
  matchesByLocalId: Record<string, LiveMatch>;
  loading: boolean;
  error: string | null;
  source: 'api' | 'cache' | 'localStorage' | null;
  lastUpdated: number | null;
  refetch: () => void;
}

const LS_KEY = 'fifa26_live_data';
const LS_TTL_DEFAULT = 5 * 60 * 1000; // 5 min
const LS_TTL_LIVE = 30 * 1000; // 30s when a match is in play

interface CachedLiveData {
  matches: LiveMatch[];
  fetchedAt: number;
}

function readLocalCache(): CachedLiveData | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedLiveData;
  } catch {
    return null;
  }
}

function writeLocalCache(matches: LiveMatch[]): void {
  try {
    const data: CachedLiveData = { matches, fetchedAt: Date.now() };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
  }
}

function hasLiveMatches(matches: LiveMatch[]): boolean {
  return matches.some(m => m.status === 'IN_PLAY' || m.status === 'PAUSED');
}

function buildMatchesByLocalId(matches: LiveMatch[]): Record<string, LiveMatch> {
  const map: Record<string, LiveMatch> = {};
  for (const m of matches) {
    if (m.localMatchId) {
      map[m.localMatchId] = m;
    }
  }
  return map;
}

export function useLiveData(): LiveDataResult {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<LiveDataResult['source']>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (background = false) => {
    if (!background) setLoading(true);

    try {
      const res = await fetch('/api/football/matches');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const liveMatches: LiveMatch[] = data.matches ?? [];
      setMatches(liveMatches);
      setSource('api');
      setLastUpdated(Date.now());
      setError(null);
      writeLocalCache(liveMatches);
    } catch {
      setError('Live scores unavailable');
      // Don't overwrite existing matches on background refresh failure
    } finally {
      if (!background) setLoading(false);
    }
  }, []);

  // Initial load: show cached data instantly, then refresh
  useEffect(() => {
    const cached = readLocalCache();
    if (cached) {
      setMatches(cached.matches);
      setSource('localStorage');
      setLastUpdated(cached.fetchedAt);
      setLoading(false);

      const ttl = hasLiveMatches(cached.matches) ? LS_TTL_LIVE : LS_TTL_DEFAULT;
      const isStale = Date.now() - cached.fetchedAt > ttl;

      if (isStale) {
        fetchData(true);
      }
    } else {
      fetchData(false);
    }
  }, [fetchData]);

  // Auto-refresh interval based on live match state
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const ttl = hasLiveMatches(matches) ? LS_TTL_LIVE : LS_TTL_DEFAULT;
    intervalRef.current = setInterval(() => fetchData(true), ttl);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [matches, fetchData]);

  return {
    matches,
    matchesByLocalId: buildMatchesByLocalId(matches),
    loading,
    error,
    source,
    lastUpdated,
    refetch: () => fetchData(false),
  };
}
