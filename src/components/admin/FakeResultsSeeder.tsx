'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LiveMatch, MatchResult, GroupLetter } from '@/types';
import { allGroupMatches } from '@/data/matches';
import { teamsByCode, groups } from '@/data/teams';

const LS_KEY = 'fifa26_live_data';

type DayOffset = -2 | -1 | 0 | 1;

interface CachedLiveData {
  matches: LiveMatch[];
  fetchedAt: number;
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
  away: { home: 0, away: 1 },
};

function readCache(): CachedLiveData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { matches: [], fetchedAt: Date.now() };
    const parsed = JSON.parse(raw) as CachedLiveData;
    return { matches: parsed.matches ?? [], fetchedAt: parsed.fetchedAt ?? Date.now() };
  } catch {
    return { matches: [], fetchedAt: Date.now() };
  }
}

function writeCache(matches: LiveMatch[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify({ matches, fetchedAt: Date.now() } satisfies CachedLiveData));
}

function buildFakeLiveMatch(
  matchId: string,
  homeCode: string,
  awayCode: string,
  result: MatchResult,
  utcDate: string,
  group: GroupLetter,
): LiveMatch {
  const home = teamsByCode[homeCode];
  const away = teamsByCode[awayCode];
  return {
    apiMatchId: hashCode(matchId),
    localMatchId: matchId,
    homeCode,
    awayCode,
    homeName: home?.name ?? homeCode,
    awayName: away?.name ?? awayCode,
    homeShortName: homeCode,
    awayShortName: awayCode,
    homeFlag: null,
    awayFlag: null,
    utcDate,
    status: 'FINISHED',
    venue: null,
    score: SCORES_BY_RESULT[result],
    actualResult: result,
    stage: 'GROUP_STAGE',
    group: `Group ${group}`,
  };
}

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

export default function FakeResultsSeeder() {
  // Per-match seeded result. `undefined` means not seeded; entry exists only when
  // the admin has clicked a result button for that match.
  const [results, setResults] = useState<Record<string, MatchResult>>({});
  const [dayOffsets, setDayOffsets] = useState<Record<string, DayOffset>>({});
  const [defaultOffset, setDefaultOffset] = useState<DayOffset>(0);
  const [expandedGroups, setExpandedGroups] = useState<Set<GroupLetter>>(() => new Set(['A']));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Hydrate state from localStorage on mount
  useEffect(() => {
    const { matches } = readCache();
    const r: Record<string, MatchResult> = {};
    const o: Record<string, DayOffset> = {};
    const todayKey = new Date().toDateString();
    for (const m of matches) {
      if (!m.localMatchId || m.status !== 'FINISHED' || !m.actualResult) continue;
      r[m.localMatchId] = m.actualResult;
      try {
        const d = new Date(m.utcDate);
        const diff = Math.round((d.setHours(0,0,0,0) - new Date(todayKey).getTime()) / (24*60*60*1000));
        if (diff === -2 || diff === -1 || diff === 0 || diff === 1) {
          o[m.localMatchId] = diff as DayOffset;
        }
      } catch { /* ignore */ }
    }
    setResults(r);
    setDayOffsets(o);
  }, []);

  const matchesByGroup = useMemo(() => {
    const map: Record<GroupLetter, typeof allGroupMatches> = {} as Record<GroupLetter, typeof allGroupMatches>;
    for (const g of groups) map[g] = [];
    for (const m of allGroupMatches) map[m.group].push(m);
    return map;
  }, []);

  const seededCount = Object.keys(results).length;

  const persist = (
    nextResults: Record<string, MatchResult>,
    nextOffsets: Record<string, DayOffset>,
  ) => {
    setSaving(true);
    const existing = readCache().matches;
    // Keep any non-group fixtures (e.g. real knockout fixtures fetched from the API)
    const preserved = existing.filter(m => !m.localMatchId || !nextResults[m.localMatchId] && !allGroupMatches.some(g => g.id === m.localMatchId));
    const fakes: LiveMatch[] = [];
    for (const gm of allGroupMatches) {
      const r = nextResults[gm.id];
      if (!r) continue;
      const offset = nextOffsets[gm.id] ?? defaultOffset;
      fakes.push(buildFakeLiveMatch(gm.id, gm.home, gm.away, r, offsetIsoDate(offset), gm.group));
    }
    writeCache([...preserved, ...fakes]);
    setSaving(false);
    setSavedAt(Date.now());
  };

  const setResult = (matchId: string, result: MatchResult | null) => {
    const next = { ...results };
    const nextOff = { ...dayOffsets };
    if (result === null) {
      delete next[matchId];
      delete nextOff[matchId];
    } else {
      next[matchId] = result;
      if (!nextOff[matchId]) nextOff[matchId] = defaultOffset;
    }
    setResults(next);
    setDayOffsets(nextOff);
    persist(next, nextOff);
  };

  const setOffsetFor = (matchId: string, offset: DayOffset) => {
    const nextOff = { ...dayOffsets, [matchId]: offset };
    setDayOffsets(nextOff);
    persist(results, nextOff);
  };

  const clearAll = () => {
    if (!confirm('Clear all seeded fake results? Real fixture data will be refetched on reload.')) return;
    localStorage.removeItem(LS_KEY);
    setResults({});
    setDayOffsets({});
    setSavedAt(Date.now());
  };

  const toggleGroup = (g: GroupLetter) => {
    const next = new Set(expandedGroups);
    if (next.has(g)) next.delete(g); else next.add(g);
    setExpandedGroups(next);
  };

  const fillGroupWithHomeWins = (g: GroupLetter) => {
    const next = { ...results };
    const nextOff = { ...dayOffsets };
    for (const m of matchesByGroup[g]) {
      next[m.id] = 'home';
      if (!nextOff[m.id]) nextOff[m.id] = defaultOffset;
    }
    setResults(next);
    setDayOffsets(nextOff);
    persist(next, nextOff);
  };

  const clearGroup = (g: GroupLetter) => {
    const next = { ...results };
    const nextOff = { ...dayOffsets };
    for (const m of matchesByGroup[g]) {
      delete next[m.id];
      delete nextOff[m.id];
    }
    setResults(next);
    setDayOffsets(nextOff);
    persist(next, nextOff);
  };

  const savedRecently = savedAt && Date.now() - savedAt < 2000;

  return (
    <section className="rounded-xl border border-white/10 bg-neutral-900 mt-6 overflow-hidden">
      <header className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-primary text-xl font-variation-fill">science</span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white">Fake group results (dev tool)</h2>
            <p className="text-[11px] text-neutral-500">
              Writes to your local browser cache — refresh the main app to see Tracker / bracket updates.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {seededCount > 0 && (
            <span className="text-[11px] font-bold text-wc-green tabular-nums">{seededCount} seeded</span>
          )}
          {savedRecently && (
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Saved</span>
          )}
          <button
            onClick={clearAll}
            disabled={seededCount === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-wc-red/15 text-wc-red hover:bg-wc-red/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Clear all
          </button>
        </div>
      </header>

      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3 flex-wrap">
        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Default day:</span>
        <div className="flex gap-1">
          {([-2, -1, 0, 1] as DayOffset[]).map(off => (
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
        {groups.map(g => {
          const expanded = expandedGroups.has(g);
          const groupSeeded = matchesByGroup[g].filter(m => results[m.id]).length;
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
                  {matchesByGroup[g].map(m => {
                    const home = teamsByCode[m.home];
                    const away = teamsByCode[m.away];
                    const current = results[m.id];
                    const offset = dayOffsets[m.id] ?? defaultOffset;
                    return (
                      <div key={m.id} className="px-4 py-2.5 flex items-center gap-3 flex-wrap">
                        <div className="flex-1 min-w-[140px] flex items-center gap-2 text-sm">
                          <span className="text-[10px] font-mono text-neutral-500 w-8">{m.id}</span>
                          <span className="text-neutral-200 truncate font-body">{home?.name ?? m.home}</span>
                          <span className="text-neutral-600 text-[10px]">vs</span>
                          <span className="text-neutral-200 truncate font-body">{away?.name ?? m.away}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {(['home', 'draw', 'away'] as MatchResult[]).map(r => {
                            const isActive = current === r;
                            const label = r === 'home' ? 'H' : r === 'draw' ? 'D' : 'A';
                            return (
                              <button
                                key={r}
                                onClick={() => setResult(m.id, isActive ? null : r)}
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
                          {([-1, 0, 1] as DayOffset[]).map(off => (
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

      <footer className="px-4 py-3 border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-neutral-500 font-body">
          Y = Yesterday · T = Today · +1 = Tomorrow · H/D/A = Home / Draw / Away winner
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
