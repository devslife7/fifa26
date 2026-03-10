'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GroupLetter, LiveMatch } from '@/types';

interface LiveDataResult {
  matches: LiveMatch[];
  matchesByLocalId: Record<string, LiveMatch>;
  groupMatchesByGroup: Partial<Record<GroupLetter, LiveMatch[]>> | null;
  teamFlagsByCode: Record<string, string>;
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

function buildTeamFlagsByCode(matches: LiveMatch[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const m of matches) {
    if (m.homeCode && m.homeFlag) map[m.homeCode] = m.homeFlag;
    if (m.awayCode && m.awayFlag) map[m.awayCode] = m.awayFlag;
  }
  return map;
}

export function useLiveData(): LiveDataResult {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [groupMatchesByGroup, setGroupMatchesByGroup] = useState<Partial<Record<GroupLetter, LiveMatch[]>> | null>(null);
  const [teamFlagsByCode, setTeamFlagsByCode] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const fetchData = useCallback(async (force: boolean) => {
    setLoading(true);
    try {
      const matchesUrl = force ? '/api/football/matches?force=true' : '/api/football/matches';
      const [matchesRes, groupRes] = await Promise.all([
        fetch(matchesUrl),
        fetch('/api/football/group-matches'),
      ]);

      if (!matchesRes.ok) throw new Error('Failed to fetch');
      const matchesData = await matchesRes.json();
      const liveMatches: LiveMatch[] = matchesData.matches ?? [];
      setMatches(liveMatches);
      setTeamFlagsByCode(buildTeamFlagsByCode(liveMatches));
      setLastUpdated(Date.now());
      setError(null);
      writeLocalCache(liveMatches);

      if (groupRes.ok) {
        const groupData = await groupRes.json();
        setGroupMatchesByGroup(groupData.groups ?? null);
      }
    } catch {
      setError('Live scores unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load: only read from localStorage cache, no server fetch
  useEffect(() => {
    const cached = readLocalCache();
    if (cached) {
      setMatches(cached.matches);
      setTeamFlagsByCode(buildTeamFlagsByCode(cached.matches));
      setLastUpdated(cached.fetchedAt);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return {
    matches,
    matchesByLocalId: buildMatchesByLocalId(matches),
    groupMatchesByGroup,
    teamFlagsByCode,
    loading,
    error,
    lastUpdated,
    refetch,
  };
}
