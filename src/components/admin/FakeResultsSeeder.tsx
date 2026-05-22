'use client';

import { useEffect, useMemo, useState } from 'react';
import type { GroupLetter, KnockoutMatch, KnockoutResult, KnockoutRound, LiveMatch, MatchResult } from '@/types';
import { allGroupMatches, KNOCKOUT_VENUES } from '@/data/matches';
import { teamsByCode, groups } from '@/data/teams';
import { generateBracket, getDownstreamMatchIds, isPlaceholder } from '@/lib/logic/bracket';
import {
  clearCachedLiveData,
  mergeLiveMatches,
  readCachedLiveData,
  readFakeLiveData,
  writeCachedLiveData,
  writeFakeLiveData,
  FAKE_LIVE_DATA_LS_KEY,
} from '@/lib/client/fake-live-data';

type DayOffset = -2 | -1 | 0 | 1;
type SeededResult = MatchResult;
type SyncState = 'idle' | 'saving' | 'saved' | 'error';

interface AdminResultPayload {
  matchId: string;
  matchType: 'group' | 'knockout';
  result: MatchResult;
  winningTeam: string | null;
}

const DAY_OFFSET_LABELS: Record<DayOffset, string> = {
  [-2]: '2 days ago',
  [-1]: 'Yesterday',
  [0]: 'Today',
  [1]: 'Tomorrow',
};

const SCORES_BY_RESULT: Record<MatchResult, { home: number; away: number }> = {
  home: { home: 2, away: 1 },
  draw: { home: 1, away: 1 },
  away: { home: 1, away: 2 },
};

const ROUND_LABELS: Record<KnockoutRound, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  '3RD': 'Third place',
  FIN: 'Final',
};

const ROUND_ORDER: KnockoutRound[] = ['R32', 'R16', 'QF', 'SF', '3RD', 'FIN'];
const GROUP_MATCH_IDS = new Set(allGroupMatches.map((m) => m.id));
const KNOCKOUT_MATCH_IDS = new Set<string>([
  ...Array.from({ length: 16 }, (_, i) => `R32-${i + 1}`),
  ...Array.from({ length: 8 }, (_, i) => `R16-${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `QF-${i + 1}`),
  ...Array.from({ length: 2 }, (_, i) => `SF-${i + 1}`),
  '3RD-1',
  'FIN-1',
]);
const CONTROLLED_MATCH_IDS = new Set([...GROUP_MATCH_IDS, ...KNOCKOUT_MATCH_IDS]);

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

function offsetIsoDate(offset: DayOffset): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(15, 0, 0, 0);
  return d.toISOString();
}

function resultWinner(homeCode: string, awayCode: string, result: MatchResult): string | null {
  if (result === 'home') return homeCode;
  if (result === 'away') return awayCode;
  return null;
}

function isPlayableTeam(code: string | undefined): code is string {
  return !!code && !isPlaceholder(code);
}

function teamName(code: string | undefined): string {
  if (!code) return 'TBD';
  if (isPlaceholder(code)) return 'TBD';
  return teamsByCode[code]?.name ?? code;
}

function teamLabel(code: string | undefined): string {
  if (!code) return 'TBD';
  if (isPlaceholder(code)) return 'TBD';
  const team = teamsByCode[code];
  return team ? `${team.flag} ${team.name}` : code;
}

function splitSeededResults(results: Record<string, SeededResult>): {
  groupResults: Record<string, MatchResult>;
  knockoutResults: Record<string, KnockoutResult>;
} {
  const groupResults: Record<string, MatchResult> = {};
  const knockoutResults: Record<string, KnockoutResult> = {};

  for (const [matchId, result] of Object.entries(results)) {
    if (GROUP_MATCH_IDS.has(matchId)) {
      groupResults[matchId] = result;
    } else if (KNOCKOUT_MATCH_IDS.has(matchId) && (result === 'home' || result === 'away')) {
      knockoutResults[matchId] = result;
    }
  }

  return { groupResults, knockoutResults };
}

function buildFakeLiveMatch(params: {
  matchId: string;
  homeCode: string;
  awayCode: string;
  result: MatchResult;
  utcDate: string;
  stage: string;
  group: string | null;
  venue?: string | null;
}): LiveMatch {
  const home = teamsByCode[params.homeCode];
  const away = teamsByCode[params.awayCode];
  return {
    apiMatchId: hashCode(`fake-${params.matchId}`),
    localMatchId: params.matchId,
    homeCode: params.homeCode,
    awayCode: params.awayCode,
    homeName: home?.name ?? params.homeCode,
    awayName: away?.name ?? params.awayCode,
    homeShortName: params.homeCode,
    awayShortName: params.awayCode,
    homeFlag: home?.flag ?? null,
    awayFlag: away?.flag ?? null,
    utcDate: params.utcDate,
    status: 'FINISHED',
    venue: params.venue ?? null,
    score: SCORES_BY_RESULT[params.result],
    actualResult: params.result,
    stage: params.stage,
    group: params.group,
  };
}

function removeCachedFakeMatches(matches: LiveMatch[], replacedIds: Set<string>): LiveMatch[] {
  return matches.filter((match) => {
    if (!match.localMatchId) return true;
    const isAdminFake = match.apiMatchId === hashCode(`fake-${match.localMatchId}`);
    return !isAdminFake && !replacedIds.has(match.localMatchId);
  });
}

export default function FakeResultsSeeder() {
  const [results, setResults] = useState<Record<string, SeededResult>>({});
  const [dayOffsets, setDayOffsets] = useState<Record<string, DayOffset>>({});
  const [defaultOffset, setDefaultOffset] = useState<DayOffset>(0);
  const [expandedGroups, setExpandedGroups] = useState<Set<GroupLetter>>(() => new Set(['A']));
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    const source = readFakeLiveData() ?? readCachedLiveData();
    const r: Record<string, SeededResult> = {};
    const o: Record<string, DayOffset> = {};
    const todayKey = new Date().toDateString();

    for (const m of source?.matches ?? []) {
      if (!m.localMatchId || !CONTROLLED_MATCH_IDS.has(m.localMatchId) || m.status !== 'FINISHED' || !m.actualResult) {
        continue;
      }
      r[m.localMatchId] = m.actualResult;
      try {
        const d = new Date(m.utcDate);
        const diff = Math.round((d.setHours(0, 0, 0, 0) - new Date(todayKey).getTime()) / (24 * 60 * 60 * 1000));
        if (diff === -2 || diff === -1 || diff === 0 || diff === 1) {
          o[m.localMatchId] = diff as DayOffset;
        }
      } catch {
        // Ignore malformed dates in old cache entries.
      }
    }

    setResults(r);
    setDayOffsets(o);
  }, []);

  const { groupResults, knockoutResults } = useMemo(() => splitSeededResults(results), [results]);
  const bracket = useMemo(() => generateBracket(groupResults, knockoutResults), [groupResults, knockoutResults]);

  const matchesByGroup = useMemo(() => {
    const map: Record<GroupLetter, typeof allGroupMatches> = {} as Record<GroupLetter, typeof allGroupMatches>;
    for (const g of groups) map[g] = [];
    for (const m of allGroupMatches) map[m.group].push(m);
    return map;
  }, []);

  const matchesByRound = useMemo(() => {
    const map: Record<KnockoutRound, KnockoutMatch[]> = {
      R32: [],
      R16: [],
      QF: [],
      SF: [],
      '3RD': [],
      FIN: [],
    };
    for (const match of bracket) map[match.round].push(match);
    return map;
  }, [bracket]);

  const groupSeededCount = Object.keys(groupResults).length;
  const knockoutSeededCount = Object.keys(knockoutResults).length;
  const seededCount = groupSeededCount + knockoutSeededCount;
  const allGroupsSeeded = groupSeededCount === allGroupMatches.length;
  const savedRecently = savedAt && Date.now() - savedAt < 2000;

  const buildFakeMatches = (
    nextResults: Record<string, SeededResult>,
    nextOffsets: Record<string, DayOffset>,
  ): LiveMatch[] => {
    const split = splitSeededResults(nextResults);
    const fakeMatches: LiveMatch[] = [];

    for (const gm of allGroupMatches) {
      const result = split.groupResults[gm.id];
      if (!result) continue;
      const offset = nextOffsets[gm.id] ?? defaultOffset;
      fakeMatches.push(buildFakeLiveMatch({
        matchId: gm.id,
        homeCode: gm.home,
        awayCode: gm.away,
        result,
        utcDate: offsetIsoDate(offset),
        stage: 'GROUP',
        group: `Group ${gm.group}`,
      }));
    }

    const nextBracket = generateBracket(split.groupResults, split.knockoutResults);
    for (const match of nextBracket) {
      const result = split.knockoutResults[match.id];
      if (!result || !isPlayableTeam(match.home) || !isPlayableTeam(match.away)) continue;
      const offset = nextOffsets[match.id] ?? defaultOffset;
      fakeMatches.push(buildFakeLiveMatch({
        matchId: match.id,
        homeCode: match.home,
        awayCode: match.away,
        result,
        utcDate: offsetIsoDate(offset),
        stage: match.round,
        group: null,
        venue: KNOCKOUT_VENUES[match.id] ?? null,
      }));
    }

    return fakeMatches;
  };

  const buildAdminRows = (nextResults: Record<string, SeededResult>): AdminResultPayload[] => {
    const split = splitSeededResults(nextResults);
    const rows: AdminResultPayload[] = [];

    for (const gm of allGroupMatches) {
      const result = split.groupResults[gm.id];
      if (!result) continue;
      rows.push({
        matchId: gm.id,
        matchType: 'group',
        result,
        winningTeam: resultWinner(gm.home, gm.away, result),
      });
    }

    const nextBracket = generateBracket(split.groupResults, split.knockoutResults);
    for (const match of nextBracket) {
      const result = split.knockoutResults[match.id];
      if (!result || !isPlayableTeam(match.home) || !isPlayableTeam(match.away)) continue;
      rows.push({
        matchId: match.id,
        matchType: 'knockout',
        result,
        winningTeam: resultWinner(match.home, match.away, result),
      });
    }

    return rows;
  };

  const syncServerResults = async (
    nextResults: Record<string, SeededResult>,
    deleteMatchIds: string[],
  ) => {
    setSyncState('saving');
    setSyncError(null);

    try {
      const res = await fetch('/api/admin/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          results: buildAdminRows(nextResults),
          deleteMatchIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Failed to save results');
      }

      setSyncState('saved');
      setSavedAt(Date.now());
    } catch (error) {
      setSyncState('error');
      setSyncError(error instanceof Error ? error.message : 'Failed to save results');
    }
  };

  const persist = (
    nextResults: Record<string, SeededResult>,
    nextOffsets: Record<string, DayOffset>,
    deleteMatchIds: string[] = [],
  ) => {
    const fakeMatches = buildFakeMatches(nextResults, nextOffsets);
    const replacedIds = new Set(
      [
        ...deleteMatchIds,
        ...fakeMatches.map((match) => match.localMatchId).filter((id): id is string => !!id),
      ],
    );
    const existing = removeCachedFakeMatches(readCachedLiveData()?.matches ?? [], replacedIds);
    writeFakeLiveData(fakeMatches);
    writeCachedLiveData(mergeLiveMatches(existing, fakeMatches));
    setSavedAt(Date.now());
    void syncServerResults(nextResults, deleteMatchIds);
  };

  const setGroupResult = (matchId: string, result: MatchResult | null) => {
    const next = { ...results };
    const nextOff = { ...dayOffsets };
    const deleteIds: string[] = [];

    if (result === null) {
      delete next[matchId];
      delete nextOff[matchId];
      deleteIds.push(matchId);
    } else {
      next[matchId] = result;
      if (!nextOff[matchId]) nextOff[matchId] = defaultOffset;
    }

    for (const knockoutId of KNOCKOUT_MATCH_IDS) {
      if (next[knockoutId]) {
        delete next[knockoutId];
        delete nextOff[knockoutId];
        deleteIds.push(knockoutId);
      }
    }

    setResults(next);
    setDayOffsets(nextOff);
    persist(next, nextOff, deleteIds);
  };

  const setKnockoutResult = (matchId: string, result: KnockoutResult | null) => {
    const next = { ...results };
    const nextOff = { ...dayOffsets };
    const deleteIds: string[] = [];

    if (result === null) {
      delete next[matchId];
      delete nextOff[matchId];
      deleteIds.push(matchId);
    } else {
      next[matchId] = result;
      if (!nextOff[matchId]) nextOff[matchId] = defaultOffset;
    }

    for (const downstreamId of getDownstreamMatchIds(matchId)) {
      if (next[downstreamId]) {
        delete next[downstreamId];
        delete nextOff[downstreamId];
        deleteIds.push(downstreamId);
      }
    }

    setResults(next);
    setDayOffsets(nextOff);
    persist(next, nextOff, deleteIds);
  };

  const setOffsetFor = (matchId: string, offset: DayOffset) => {
    const nextOff = { ...dayOffsets, [matchId]: offset };
    setDayOffsets(nextOff);
    persist(results, nextOff);
  };

  const clearAll = () => {
    if (!confirm('Clear all seeded fake results? This also removes these testing results from admin scoring.')) return;
    const deleteIds = Object.keys(results);
    clearCachedLiveData(FAKE_LIVE_DATA_LS_KEY);
    const existing = removeCachedFakeMatches(readCachedLiveData()?.matches ?? [], new Set(deleteIds));
    writeCachedLiveData(existing);
    setResults({});
    setDayOffsets({});
    setSavedAt(Date.now());
    void syncServerResults({}, deleteIds);
  };

  const toggleGroup = (g: GroupLetter) => {
    const next = new Set(expandedGroups);
    if (next.has(g)) next.delete(g);
    else next.add(g);
    setExpandedGroups(next);
  };

  const fillGroupWithHomeWins = (g: GroupLetter) => {
    const next = { ...results };
    const nextOff = { ...dayOffsets };
    const deleteIds = Object.keys(knockoutResults);

    for (const m of matchesByGroup[g]) {
      next[m.id] = 'home';
      if (!nextOff[m.id]) nextOff[m.id] = defaultOffset;
    }
    for (const knockoutId of KNOCKOUT_MATCH_IDS) {
      delete next[knockoutId];
      delete nextOff[knockoutId];
    }

    setResults(next);
    setDayOffsets(nextOff);
    persist(next, nextOff, deleteIds);
  };

  const clearGroup = (g: GroupLetter) => {
    const next = { ...results };
    const nextOff = { ...dayOffsets };
    const deleteIds: string[] = [];

    for (const m of matchesByGroup[g]) {
      if (next[m.id]) deleteIds.push(m.id);
      delete next[m.id];
      delete nextOff[m.id];
    }
    for (const knockoutId of KNOCKOUT_MATCH_IDS) {
      if (next[knockoutId]) deleteIds.push(knockoutId);
      delete next[knockoutId];
      delete nextOff[knockoutId];
    }

    setResults(next);
    setDayOffsets(nextOff);
    persist(next, nextOff, deleteIds);
  };

  return (
    <section className="rounded-xl border border-white/10 bg-neutral-900 mt-6 overflow-hidden">
      <header className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-primary text-xl font-variation-fill">science</span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white">Manual tournament results</h2>
            <p className="text-[11px] text-neutral-500">
              Seeds finished matches for local preview and writes admin scoring results.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {seededCount > 0 && (
            <span className="text-[11px] font-bold text-wc-green tabular-nums">
              {groupSeededCount}/72 group · {knockoutSeededCount}/32 KO
            </span>
          )}
          {(savedRecently || syncState === 'saved') && (
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Saved</span>
          )}
          {syncState === 'saving' && (
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Syncing</span>
          )}
          <button
            onClick={clearAll}
            disabled={seededCount === 0 && syncState !== 'error'}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-wc-red/15 text-wc-red hover:bg-wc-red/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Clear all
          </button>
        </div>
        {syncError && (
          <p className="basis-full text-[11px] text-wc-red font-body">{syncError}</p>
        )}
      </header>

      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3 flex-wrap">
        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Default day:</span>
        <div className="flex gap-1">
          {([-2, -1, 0, 1] as DayOffset[]).map((off) => (
            <button
              key={off}
              onClick={() => setDefaultOffset(off)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                defaultOffset === off
                  ? 'bg-primary text-black'
                  : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-200'
              }`}
            >
              {DAY_OFFSET_LABELS[off]}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-neutral-500">Applies to newly seeded matches</span>
      </div>

      <div className="divide-y divide-white/5">
        {groups.map((g) => {
          const expanded = expandedGroups.has(g);
          const groupSeeded = matchesByGroup[g].filter((m) => results[m.id]).length;
          return (
            <div key={g}>
              <button
                onClick={() => toggleGroup(g)}
                className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-neutral-500 text-[18px]">
                    {expanded ? 'expand_more' : 'chevron_right'}
                  </span>
                  <span className="text-sm font-bold text-white">Group {g}</span>
                  {groupSeeded > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-wc-green/15 text-wc-green tabular-nums">
                      {groupSeeded}/6
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); fillGroupWithHomeWins(g); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); fillGroupWithHomeWins(g); } }}
                    className="px-2 py-1 rounded-md text-[10px] font-bold bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-200 transition-colors"
                  >
                    Fill home
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); clearGroup(g); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); clearGroup(g); } }}
                    className="px-2 py-1 rounded-md text-[10px] font-bold bg-white/5 text-neutral-500 hover:bg-wc-red/15 hover:text-wc-red transition-colors"
                  >
                    Clear
                  </span>
                </div>
              </button>

              {expanded && (
                <div className="bg-black/20 divide-y divide-white/5">
                  {matchesByGroup[g].map((m) => {
                    const home = teamsByCode[m.home];
                    const away = teamsByCode[m.away];
                    const current = results[m.id];
                    const offset = dayOffsets[m.id] ?? defaultOffset;
                    return (
                      <div key={m.id} className="px-4 py-2.5 flex items-center gap-3 flex-wrap">
                        <div className="flex-1 min-w-[180px] flex items-center gap-2 text-sm">
                          <span className="text-[10px] font-mono text-neutral-500 w-8">{m.id}</span>
                          <span className="text-neutral-200 truncate font-body">{home?.name ?? m.home}</span>
                          <span className="text-neutral-600 text-[10px]">vs</span>
                          <span className="text-neutral-200 truncate font-body">{away?.name ?? m.away}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {(['home', 'draw', 'away'] as MatchResult[]).map((r) => {
                            const isActive = current === r;
                            const label = r === 'home' ? 'H' : r === 'draw' ? 'D' : 'A';
                            return (
                              <button
                                key={r}
                                onClick={() => setGroupResult(m.id, isActive ? null : r)}
                                className={`w-8 h-8 rounded-md text-xs font-black transition-colors ${
                                  isActive
                                    ? r === 'home'
                                      ? 'bg-wc-green text-black'
                                      : r === 'draw'
                                        ? 'bg-primary text-black'
                                        : 'bg-blue-400 text-black'
                                    : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'
                                }`}
                                title={r === 'home' ? `${home?.name} wins` : r === 'draw' ? 'Draw' : `${away?.name} wins`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-1">
                          {([-1, 0, 1] as DayOffset[]).map((off) => (
                            <button
                              key={off}
                              onClick={() => setOffsetFor(m.id, off)}
                              disabled={!current}
                              className={`px-2 h-8 rounded-md text-[10px] font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                                current && offset === off
                                  ? 'bg-white/15 text-white'
                                  : 'bg-white/5 text-neutral-500 hover:bg-white/10 hover:text-neutral-300'
                              }`}
                            >
                              {off === -1 ? 'Y' : off === 0 ? 'T' : '+1'}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/10">
        <div className="px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-white">Knockout winners</h3>
            <p className="text-[11px] text-neutral-500">
              Complete all group results to unlock the generated bracket, then pick each match winner.
            </p>
          </div>
          {!allGroupsSeeded && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/5 text-neutral-400">
              {allGroupMatches.length - groupSeededCount} group results left
            </span>
          )}
        </div>

        {allGroupsSeeded && (
          <div className="divide-y divide-white/5 bg-black/20">
            {ROUND_ORDER.map((round) => (
              <div key={round} className="px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-xs font-black text-neutral-300 uppercase tracking-wider">{ROUND_LABELS[round]}</h4>
                  <span className="text-[10px] font-mono text-neutral-500">
                    {matchesByRound[round].filter((m) => knockoutResults[m.id]).length}/{matchesByRound[round].length}
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {matchesByRound[round].map((match) => {
                    const current = knockoutResults[match.id];
                    const offset = dayOffsets[match.id] ?? defaultOffset;
                    const playable = isPlayableTeam(match.home) && isPlayableTeam(match.away);
                    return (
                      <div key={match.id} className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono text-neutral-500">{match.id}</span>
                            <div className="text-sm font-body text-neutral-200 truncate">
                              {teamName(match.home)} <span className="text-neutral-600 text-[10px]">vs</span> {teamName(match.away)}
                            </div>
                          </div>
                          {!playable && (
                            <span className="text-[10px] font-bold text-neutral-500 shrink-0">Locked</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1 min-w-0">
                            {(['home', 'away'] as KnockoutResult[]).map((r) => {
                              const code = r === 'home' ? match.home : match.away;
                              const active = current === r;
                              return (
                                <button
                                  key={r}
                                  onClick={() => setKnockoutResult(match.id, active ? null : r)}
                                  disabled={!playable}
                                  className={`max-w-[150px] px-2.5 h-8 rounded-md text-[11px] font-bold truncate transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                                    active
                                      ? 'bg-wc-green text-black'
                                      : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'
                                  }`}
                                  title={playable ? `${teamName(code)} wins` : 'Waiting on prior results'}
                                >
                                  {teamLabel(code)}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            {([-1, 0, 1] as DayOffset[]).map((off) => (
                              <button
                                key={off}
                                onClick={() => setOffsetFor(match.id, off)}
                                disabled={!current}
                                className={`px-2 h-8 rounded-md text-[10px] font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                                  current && offset === off
                                    ? 'bg-white/15 text-white'
                                    : 'bg-white/5 text-neutral-500 hover:bg-white/10 hover:text-neutral-300'
                                }`}
                              >
                                {off === -1 ? 'Y' : off === 0 ? 'T' : '+1'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="px-4 py-3 border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-neutral-500 font-body">
          Y = Yesterday · T = Today · +1 = Tomorrow · group H/D/A = home / draw / away.
        </span>
        <a
          href="/"
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-black hover:bg-primary/90 transition-colors inline-flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[14px]">launch</span>
          Open app
        </a>
      </footer>
    </section>
  );
}
