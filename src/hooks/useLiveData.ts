'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LiveMatch } from '@/types';

interface LiveDataResult {
  matches: LiveMatch[];
  matchesByLocalId: Record<string, LiveMatch>;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  refetch: () => void;
}

const LS_KEY = 'fifa26_live_data';

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
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const fetchData = useCallback(async (force: boolean) => {
    setLoading(true);
    try {
      const url = force
        ? '/api/football/matches?force=true'
        : '/api/football/matches';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const liveMatches: LiveMatch[] = data.matches ?? [];
      setMatches(liveMatches);
      setLastUpdated(Date.now());
      setError(null);
      writeLocalCache(liveMatches);
    } catch {
      setError('Live scores unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load: show cached data instantly, then fetch from server cache (no API call)
  useEffect(() => {
    const cached = readLocalCache();
    if (cached) {
      setMatches(cached.matches);
      setLastUpdated(cached.fetchedAt);
      setLoading(false);
    }
    // Always fetch from server on mount (server serves from its own cache → fast, no external API call)
    fetchData(false);
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return {
    matches,
    matchesByLocalId: buildMatchesByLocalId(matches),
    loading,
    error,
    lastUpdated,
    refetch,
  };
}
