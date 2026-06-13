'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GroupLetter, LiveMatch } from '@/types';
import { readCachedLiveData, writeCachedLiveData } from '@/lib/client/live-data-cache';
import { buildHotMatchRefreshQuery } from '@/lib/utils/hot-matches';

const HOT_POLL_INTERVAL_MS = 30_000;

interface LiveDataResult {
  matches: LiveMatch[];
  matchesByLocalId: Record<string, LiveMatch>;
  groupMatchesByGroup: Partial<Record<GroupLetter, LiveMatch[]>> | null;
  teamFlagsByCode: Record<string, string>;
  loading: boolean;
  error: string | null;
  rateLimited: boolean;
  lastUpdated: number | null;
  refetch: (query?: string) => Promise<void>;
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

  const fetchData = useCallback(async (force: boolean, query?: string, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams(query);
      if (force) params.set('force', 'true');
      const queryString = params.toString();
      const matchesUrl = queryString ? `/api/football/matches?${queryString}` : '/api/football/matches';
      const matchesRes = await fetch(matchesUrl, { cache: 'no-store' });

      if (matchesRes.status === 429) {
        setRateLimited(true);
        return;
      }
      setRateLimited(false);
      if (!matchesRes.ok) throw new Error('Failed to fetch');
      const matchesData = await matchesRes.json();
      const liveMatches: LiveMatch[] = matchesData.matches ?? [];
      setMatches(liveMatches);
      setTeamFlagsByCode(buildTeamFlagsByCode(liveMatches));
      setGroupMatchesByGroup(buildGroupMatchesByGroup(liveMatches));
      setLastUpdated(Date.now());
      setError(null);
      writeCachedLiveData(liveMatches);
    } catch {
      setError('Live scores unavailable');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Initial load: show cached data instantly, then fetch from server cache
  useEffect(() => {
    const cached = readCachedLiveData();
    if (cached) {
      setMatches(cached.matches);
      setTeamFlagsByCode(buildTeamFlagsByCode(cached.matches));
      setGroupMatchesByGroup(buildGroupMatchesByGroup(cached.matches));
      setLastUpdated(cached.fetchedAt);
      setLoading(false);
    }
    fetchData(false);
  }, [fetchData]);

  const refetch = useCallback((query?: string) => fetchData(true, query), [fetchData]);

  useEffect(() => {
    const pollQuery = buildHotMatchRefreshQuery(matches);
    if (!pollQuery) return;

    let cancelled = false;
    const poll = () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      void fetchData(false, pollQuery, false);
    };

    const intervalId = window.setInterval(poll, HOT_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [fetchData, matches]);

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
