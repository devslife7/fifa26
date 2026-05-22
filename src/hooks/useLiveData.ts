'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GroupLetter, LiveMatch } from '@/types';
import {
  mergeLiveMatches,
  readCachedLiveData,
  readFakeLiveData,
  writeCachedLiveData,
} from '@/lib/client/fake-live-data';

interface LiveDataResult {
  matches: LiveMatch[];
  matchesByLocalId: Record<string, LiveMatch>;
  groupMatchesByGroup: Partial<Record<GroupLetter, LiveMatch[]>> | null;
  teamFlagsByCode: Record<string, string>;
  loading: boolean;
  error: string | null;
  rateLimited: boolean;
  lastUpdated: number | null;
  refetch: () => void;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const fetchData = useCallback(async (force: boolean) => {
    setLoading(true);
    try {
      const matchesUrl = force ? '/api/football/matches?force=true' : '/api/football/matches';
      const [matchesRes, groupRes] = await Promise.all([
        fetch(matchesUrl),
        fetch('/api/football/group-matches'),
      ]);

      if (matchesRes.status === 429) {
        setRateLimited(true);
        setLoading(false);
        return;
      }
      setRateLimited(false);
      if (!matchesRes.ok) throw new Error('Failed to fetch');
      const matchesData = await matchesRes.json();
      const liveMatches: LiveMatch[] = matchesData.matches ?? [];
      const fakeMatches = readFakeLiveData()?.matches ?? [];
      const mergedMatches = mergeLiveMatches(liveMatches, fakeMatches);
      setMatches(mergedMatches);
      setTeamFlagsByCode(buildTeamFlagsByCode(mergedMatches));
      setLastUpdated(Date.now());
      setError(null);
      writeCachedLiveData(mergedMatches);

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

  // Initial load: show cached data instantly, then fetch from server cache
  useEffect(() => {
    const cached = readCachedLiveData();
    if (cached) {
      const fakeMatches = readFakeLiveData()?.matches ?? [];
      const mergedMatches = mergeLiveMatches(cached.matches, fakeMatches);
      setMatches(mergedMatches);
      setTeamFlagsByCode(buildTeamFlagsByCode(mergedMatches));
      setLastUpdated(cached.fetchedAt);
      setLoading(false);
    }
    fetchData(false);
  }, [fetchData]);

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
    rateLimited,
    lastUpdated,
    refetch,
  };
}
