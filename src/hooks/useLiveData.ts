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

function buildGroupMatchesByGroup(matches: LiveMatch[]): Partial<Record<GroupLetter, LiveMatch[]>> | null {
  const groups: Partial<Record<GroupLetter, LiveMatch[]>> = {};
  for (const match of matches) {
    if (match.stage !== 'GROUP' || !match.group) continue;
    const group = match.group as GroupLetter;
    if (!groups[group]) groups[group] = [];
    groups[group]!.push(match);
  }

  for (const group of Object.keys(groups) as GroupLetter[]) {
    groups[group]!.sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  }

  return Object.keys(groups).length > 0 ? groups : null;
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
      const matchesRes = await fetch(matchesUrl, { cache: 'no-store' });

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
      setGroupMatchesByGroup(buildGroupMatchesByGroup(mergedMatches));
      setLastUpdated(Date.now());
      setError(null);
      writeCachedLiveData(mergedMatches);
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
      setGroupMatchesByGroup(buildGroupMatchesByGroup(mergedMatches));
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
