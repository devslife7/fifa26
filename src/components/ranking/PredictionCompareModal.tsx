'use client';

import { useMemo, useState } from 'react';
import type { LeaderboardPrediction, LiveMatch, MatchResult, KnockoutRound } from '@/types';
import { allGroupMatches } from '@/data/matches';
import { groups, teamsByCode } from '@/data/teams';
import {
  GROUP_POINTS,
  QUALIFIER_POINTS,
  WINNER_POINTS,
  usePredictionResults,
} from '@/hooks/usePredictionResults';

interface Props {
  mine: LeaderboardPrediction;
  friend: LeaderboardPrediction;
  friendRank?: number;
  onClose: () => void;
  liveMatches?: Record<string, LiveMatch>;
  teamFlagsByCode?: Record<string, string>;
}

type CompareTab = 'differences' | 'groups' | 'knockout' | 'summary';
type RoundCompareKey = KnockoutRound | 'thirdWinner' | 'finalWinner';

interface RoundQualifierComparison {
  key: RoundCompareKey;
  label: string;
  pointsLabel: string;
  both: string[];
  mineOnly: string[];
  friendOnly: string[];
}

const TABS: { id: CompareTab; label: string }[] = [
  { id: 'differences', label: 'Differences' },
  { id: 'groups', label: 'Groups' },
  { id: 'knockout', label: 'Knockout' },
  { id: 'summary', label: 'Summary' },
];

function CompareTabRail({
  activeTab,
  onSelect,
}: {
  activeTab: CompareTab;
  onSelect: (tab: CompareTab) => void;
}) {
  const activeIndex = Math.max(0, TABS.findIndex(tab => tab.id === activeTab));
  const totalGapRem = (TABS.length - 1) * 0.25;
  const pillWidth = `calc((100% - ${totalGapRem}rem) / ${TABS.length})`;

  return (
    <div
      className="relative mt-3 grid grid-cols-4 gap-1 overflow-hidden rounded-xl border border-white/10 bg-neutral-950/60 p-1"
    >
      <div
        aria-hidden="true"
        className="absolute left-1 top-1 bottom-1 rounded-lg bg-primary shadow-[0_8px_24px_rgba(245,197,66,0.25)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{
          width: pillWidth,
          transform: `translateX(calc(${activeIndex} * (100% + 0.25rem)))`,
        }}
      />
      {TABS.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={`relative z-10 min-w-0 rounded-lg px-1 py-2 text-[9px] font-black uppercase tracking-normal transition-colors duration-200 sm:px-1.5 sm:text-[11px] ${
              isActive ? 'text-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

const ROUND_ORDER: RoundCompareKey[] = ['R32', 'R16', 'QF', 'SF', '3RD', 'thirdWinner', 'FIN', 'finalWinner'];

const ROUND_LABELS: Record<RoundCompareKey, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  '3RD': 'Third Place Match',
  thirdWinner: 'Third Place Winner',
  FIN: 'Finalists',
  finalWinner: 'Champion',
};

const ROUND_POINTS: Record<RoundCompareKey, string> = {
  R32: `+${QUALIFIER_POINTS.R32} per team`,
  R16: `+${QUALIFIER_POINTS.R16} per team`,
  QF: `+${QUALIFIER_POINTS.QF} per team`,
  SF: `+${QUALIFIER_POINTS.SF} per team`,
  '3RD': `+${QUALIFIER_POINTS['3RD']} per team`,
  thirdWinner: `+${WINNER_POINTS['3RD']}`,
  FIN: `+${QUALIFIER_POINTS.FIN} per team`,
  finalWinner: `+${WINNER_POINTS.FIN}`,
};

function predictionName(prediction: LeaderboardPrediction, fallback: string): string {
  return prediction.display_name && prediction.display_name !== 'Unknown'
    ? prediction.display_name
    : prediction.name?.trim() || fallback;
}

function sortedTeamCodes(codes: Iterable<string>): string[] {
  return Array.from(codes).sort((a, b) => {
    const an = teamsByCode[a]?.name ?? a;
    const bn = teamsByCode[b]?.name ?? b;
    return an.localeCompare(bn);
  });
}

function compareSets(mine: Set<string>, friend: Set<string>) {
  const both: string[] = [];
  const mineOnly: string[] = [];
  const friendOnly: string[] = [];

  for (const code of mine) {
    if (friend.has(code)) both.push(code);
    else mineOnly.push(code);
  }
  for (const code of friend) {
    if (!mine.has(code)) friendOnly.push(code);
  }

  return {
    both: sortedTeamCodes(both),
    mineOnly: sortedTeamCodes(mineOnly),
    friendOnly: sortedTeamCodes(friendOnly),
  };
}

function compareSingles(mine: string | null, friend: string | null) {
  const mineSet = new Set<string>();
  const friendSet = new Set<string>();
  if (mine) mineSet.add(mine);
  if (friend) friendSet.add(friend);
  return compareSets(mineSet, friendSet);
}

function pickLabel(result: MatchResult | null | undefined, homeCode: string, awayCode: string): string {
  if (result === 'home') return teamsByCode[homeCode]?.name ?? homeCode;
  if (result === 'away') return teamsByCode[awayCode]?.name ?? awayCode;
  if (result === 'draw') return 'Draw';
  return '-';
}

function TeamToken({
  code,
  tone = 'neutral',
  flagsByCode,
}: {
  code: string;
  tone?: 'neutral' | 'mine' | 'friend' | 'both';
  flagsByCode?: Record<string, string>;
}) {
  const team = teamsByCode[code];
  const flagUrl = flagsByCode?.[code];
  const toneClass =
    tone === 'both'
      ? 'border-wc-green/35 bg-wc-green/10 text-wc-green'
      : tone === 'mine'
        ? 'border-primary/35 bg-primary/10 text-primary'
        : tone === 'friend'
          ? 'border-wc-blue/35 bg-wc-blue/10 text-blue-300'
          : 'border-white/10 bg-neutral-900 text-neutral-300';

  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneClass}`}>
      {flagUrl ? (
        <img src={flagUrl} alt="" className="h-3 w-4 rounded-[2px] object-cover" />
      ) : team ? (
        <span className="text-xs leading-none">{team.flag}</span>
      ) : null}
      <span className="truncate font-body">{team?.name ?? code}</span>
    </span>
  );
}

function PersonPick({
  label,
  pick,
  points,
  align = 'left',
}: {
  label: string;
  pick: string;
  points: number;
  align?: 'left' | 'right';
}) {
  return (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</div>
      <div className={`mt-0.5 flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : ''}`}>
        <span className="truncate text-sm font-bold text-neutral-200">{pick}</span>
        {points > 0 && <span className="rounded bg-wc-green/15 px-1.5 py-0.5 text-[10px] font-black text-wc-green">+{points}</span>}
      </div>
    </div>
  );
}

function RoundDiffBlock({
  comparison,
  mineName,
  friendName,
  flagsByCode,
}: {
  comparison: RoundQualifierComparison;
  mineName: string;
  friendName: string;
  flagsByCode?: Record<string, string>;
}) {
  const hasDiff = comparison.mineOnly.length > 0 || comparison.friendOnly.length > 0;
  if (!hasDiff && comparison.both.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-white">{comparison.label}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-primary/70">{comparison.pointsLabel}</div>
        </div>
        {comparison.both.length > 0 && (
          <div className="text-right text-[10px] font-bold uppercase tracking-wider text-wc-green">
            {comparison.both.length} shared
          </div>
        )}
      </div>
      {comparison.both.length > 0 && (
        <div className="mb-2">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">Both</div>
          <div className="flex flex-wrap gap-1.5">
            {comparison.both.map(code => <TeamToken key={code} code={code} tone="both" flagsByCode={flagsByCode} />)}
          </div>
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">{mineName} only</div>
          <div className="flex flex-wrap gap-1.5">
            {comparison.mineOnly.length > 0
              ? comparison.mineOnly.map(code => <TeamToken key={code} code={code} tone="mine" flagsByCode={flagsByCode} />)
              : <span className="text-xs italic text-neutral-600">None</span>}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">{friendName} only</div>
          <div className="flex flex-wrap gap-1.5">
            {comparison.friendOnly.length > 0
              ? comparison.friendOnly.map(code => <TeamToken key={code} code={code} tone="friend" flagsByCode={flagsByCode} />)
              : <span className="text-xs italic text-neutral-600">None</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PredictionCompareModal({ mine, friend, friendRank, onClose, liveMatches, teamFlagsByCode }: Props) {
  const [activeTab, setActiveTab] = useState<CompareTab>('differences');
  const mineResults = usePredictionResults(mine, liveMatches);
  const friendResults = usePredictionResults(friend, liveMatches);
  const mineName = predictionName(mine, 'You');
  const friendName = predictionName(friend, 'Friend');
  const mineChampion = mineResults.predicted.finalWinner ?? mine.champion_code;
  const friendChampion = friendResults.predicted.finalWinner ?? friend.champion_code;

  const groupComparisons = useMemo(() => {
    return allGroupMatches.map(match => {
      const minePick = mine.group_matches[match.id] ?? null;
      const friendPick = friend.group_matches[match.id] ?? null;
      const live = liveMatches?.[match.id];
      const mineOutcome = mineResults.perMatch[match.id];
      const friendOutcome = friendResults.perMatch[match.id];
      return {
        match,
        live,
        minePick,
        friendPick,
        same: Boolean(minePick && friendPick && minePick === friendPick),
        missing: !minePick || !friendPick,
        minePoints: mineOutcome?.points ?? 0,
        friendPoints: friendOutcome?.points ?? 0,
      };
    });
  }, [friend.group_matches, friendResults.perMatch, liveMatches, mine.group_matches, mineResults.perMatch]);

  const roundComparisons = useMemo<RoundQualifierComparison[]>(() => {
    const comparisons: Record<RoundCompareKey, ReturnType<typeof compareSets>> = {
      R32: compareSets(mineResults.predicted.R32, friendResults.predicted.R32),
      R16: compareSets(mineResults.predicted.R16, friendResults.predicted.R16),
      QF: compareSets(mineResults.predicted.QF, friendResults.predicted.QF),
      SF: compareSets(mineResults.predicted.SF, friendResults.predicted.SF),
      '3RD': compareSets(mineResults.predicted.thirdParticipants, friendResults.predicted.thirdParticipants),
      thirdWinner: compareSingles(mineResults.predicted.thirdWinner, friendResults.predicted.thirdWinner),
      FIN: compareSets(mineResults.predicted.finalParticipants, friendResults.predicted.finalParticipants),
      finalWinner: compareSingles(mineChampion, friendChampion),
    };

    return ROUND_ORDER.map(key => ({
      key,
      label: ROUND_LABELS[key],
      pointsLabel: ROUND_POINTS[key],
      ...comparisons[key],
    }));
  }, [friendChampion, friendResults.predicted, mineChampion, mineResults.predicted]);

  const summary = useMemo(() => {
    const groupSame = groupComparisons.filter(row => row.same).length;
    const groupMissing = groupComparisons.filter(row => row.missing).length;
    const groupDifferent = groupComparisons.length - groupSame - groupMissing;

    let knockoutSame = 0;
    let knockoutDifferent = 0;
    for (const round of roundComparisons) {
      knockoutSame += round.both.length;
      knockoutDifferent += round.mineOnly.length + round.friendOnly.length;
    }

    const same = groupSame + knockoutSame;
    const different = groupDifferent + knockoutDifferent;
    const compared = same + different;
    const overlap = compared > 0 ? Math.round((same / compared) * 100) : 0;

    return {
      groupSame,
      groupDifferent,
      groupMissing,
      knockoutSame,
      knockoutDifferent,
      same,
      different,
      compared,
      overlap,
      pointDelta: mineResults.summary.totalPoints - friendResults.summary.totalPoints,
    };
  }, [friendResults.summary.totalPoints, groupComparisons, mineResults.summary.totalPoints, roundComparisons]);

  const groupDifferences = groupComparisons.filter(row => !row.same);
  const knockoutDifferences = roundComparisons.filter(row => row.mineOnly.length > 0 || row.friendOnly.length > 0);

  const renderGroupRow = (row: (typeof groupComparisons)[number], compact = false) => {
    const { match, live, minePick, friendPick, same, missing, minePoints, friendPoints } = row;
    const isLive = live?.status === 'IN_PLAY' || live?.status === 'PAUSED';
    const isFinished = live?.status === 'FINISHED';
    const score = live?.score;
    const rowTone = same
      ? 'border-white/5 bg-neutral-950/30'
      : missing
        ? 'border-wc-amber/20 bg-wc-amber/5'
        : 'border-primary/20 bg-primary/5';

    return (
      <div key={match.id} className={`rounded-xl border px-3 py-2.5 ${rowTone}`}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Group {match.group} - {match.id}</div>
            <div className="mt-0.5 truncate text-sm font-bold text-white">
              {teamsByCode[match.home]?.name ?? match.home} vs {teamsByCode[match.away]?.name ?? match.away}
            </div>
          </div>
          {(isFinished || isLive) && score && (
            <div className={`shrink-0 rounded-lg px-2 py-1 text-sm font-black tabular-nums ${isLive ? 'bg-wc-green/10 text-wc-green' : 'bg-white/10 text-white'}`}>
              {score.home}-{score.away}
            </div>
          )}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <PersonPick label={mineName} pick={pickLabel(minePick, match.home, match.away)} points={minePoints} />
          <div className="flex flex-col items-center">
            <span className={`material-symbols-outlined text-[16px] ${same ? 'text-wc-green' : 'text-primary'}`}>
              {same ? 'check_circle' : 'sync_alt'}
            </span>
            {!compact && (
              <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-600">
                {same ? 'same' : missing ? 'missing' : 'diff'}
              </span>
            )}
          </div>
          <PersonPick label={friendName} pick={pickLabel(friendPick, match.home, match.away)} points={friendPoints} align="right" />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm animate-fade-in sm:p-4">
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-background-dark shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-white/10 px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-primary/80">
                <span className="material-symbols-outlined text-[16px]">social_leaderboard</span>
                Head-to-head
              </div>
              <h2 className="truncate text-xl font-black text-white">{mineName} vs {friendName}</h2>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-neutral-400 transition-colors hover:bg-white/15 hover:text-white"
              aria-label="Close comparison"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
            <div className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary/70">First prediction</div>
              <div className="mt-1 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-white">{mine.name || mineName}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-neutral-400">
                    {mineChampion && <TeamToken code={mineChampion} tone="mine" flagsByCode={teamFlagsByCode} />}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-primary tabular-nums">{mineResults.summary.totalPoints}</div>
                  <div className="text-[10px] font-bold uppercase text-primary/60">Points</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center rounded-xl border border-white/10 bg-neutral-900/70 px-4 py-3 text-center">
              <div>
                <div className="text-3xl font-black text-white tabular-nums">{summary.overlap}%</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Overlap</div>
                <div className={`mt-1 text-xs font-black tabular-nums ${summary.pointDelta >= 0 ? 'text-wc-green' : 'text-wc-red'}`}>
                  {summary.pointDelta >= 0 ? '+' : ''}{summary.pointDelta} pts
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-wc-blue/20 bg-wc-blue/10 px-3 py-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-300/80">
                {friendRank ? `Rank #${friendRank}` : 'Second prediction'}
              </div>
              <div className="mt-1 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-white">{friend.name || friendName}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-neutral-400">
                    {friendChampion && <TeamToken code={friendChampion} tone="friend" flagsByCode={teamFlagsByCode} />}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-blue-300 tabular-nums">{friendResults.summary.totalPoints}</div>
                  <div className="text-[10px] font-bold uppercase text-blue-300/60">Points</div>
                </div>
              </div>
            </div>
          </div>

          <CompareTabRail activeTab={activeTab} onSelect={setActiveTab} />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {activeTab === 'differences' && (
            <div className="space-y-4">
              {groupDifferences.length === 0 && knockoutDifferences.length === 0 ? (
                <div className="rounded-2xl border border-wc-green/20 bg-wc-green/10 px-4 py-8 text-center">
                  <span className="material-symbols-outlined text-4xl text-wc-green">verified</span>
                  <p className="mt-2 text-sm font-black text-white">These predictions are nearly identical.</p>
                  <p className="mt-1 text-xs text-neutral-400 font-body">No group or knockout differences are available yet.</p>
                </div>
              ) : (
                <>
                  {groupDifferences.length > 0 && (
                    <section>
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-white/60">Group pick differences</h3>
                        <span className="text-[10px] font-bold uppercase text-primary/70">+{GROUP_POINTS} per match</span>
                      </div>
                      <div className="space-y-2">{groupDifferences.map(row => renderGroupRow(row))}</div>
                    </section>
                  )}
                  {knockoutDifferences.length > 0 && (
                    <section>
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-white/60">Knockout differences</h3>
                        <span className="text-[10px] font-bold uppercase text-primary/70">Team-round scoring</span>
                      </div>
                      <div className="space-y-2">
                        {knockoutDifferences.map(comparison => (
                          <RoundDiffBlock
                            key={comparison.key}
                            comparison={comparison}
                            mineName={mineName}
                            friendName={friendName}
                            flagsByCode={teamFlagsByCode}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'groups' && (
            <div className="space-y-4">
              {groups.map(group => {
                const rows = groupComparisons.filter(row => row.match.group === group);
                const diffCount = rows.filter(row => !row.same).length;
                return (
                  <section key={group}>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-white/60">Group {group}</h3>
                      <span className={`text-[10px] font-bold uppercase ${diffCount > 0 ? 'text-primary/70' : 'text-wc-green'}`}>
                        {diffCount > 0 ? `${diffCount} different` : 'all same'}
                      </span>
                    </div>
                    <div className="space-y-2">{rows.map(row => renderGroupRow(row, true))}</div>
                  </section>
                );
              })}
            </div>
          )}

          {activeTab === 'knockout' && (
            <div className="space-y-2">
              {roundComparisons.map(comparison => (
                <RoundDiffBlock
                  key={comparison.key}
                  comparison={comparison}
                  mineName={mineName}
                  friendName={friendName}
                  flagsByCode={teamFlagsByCode}
                />
              ))}
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: 'Same picks', value: summary.same, tone: 'text-wc-green' },
                  { label: 'Different', value: summary.different, tone: 'text-primary' },
                  { label: 'Missing group', value: summary.groupMissing, tone: 'text-wc-amber' },
                  { label: 'Point delta', value: `${summary.pointDelta >= 0 ? '+' : ''}${summary.pointDelta}`, tone: summary.pointDelta >= 0 ? 'text-wc-green' : 'text-wc-red' },
                ].map(item => (
                  <div key={item.label} className="rounded-xl border border-white/10 bg-neutral-900/60 px-3 py-3 text-center">
                    <div className={`text-2xl font-black tabular-nums ${item.tone}`}>{item.value}</div>
                    <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-3">
                <h3 className="mb-2 text-[11px] font-black uppercase tracking-widest text-white/60">Scoring split</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg bg-black/20 p-3">
                    <div className="text-sm font-black text-white">{mineName}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-body">
                      <span className="text-neutral-400">Group</span>
                      <span className="text-right font-bold text-wc-green">{mineResults.summary.groupPoints}</span>
                      <span className="text-neutral-400">Knockout</span>
                      <span className="text-right font-bold text-blue-300">{mineResults.summary.knockoutPoints}</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-black/20 p-3">
                    <div className="text-sm font-black text-white">{friendName}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-body">
                      <span className="text-neutral-400">Group</span>
                      <span className="text-right font-bold text-wc-green">{friendResults.summary.groupPoints}</span>
                      <span className="text-neutral-400">Knockout</span>
                      <span className="text-right font-bold text-blue-300">{friendResults.summary.knockoutPoints}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <h3 className="mb-2 text-[11px] font-black uppercase tracking-widest text-primary/80">Biggest swing categories</h3>
                <div className="space-y-1.5 text-sm font-body">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-neutral-300">Champion mismatch</span>
                    <span className="font-black text-primary tabular-nums">{mineChampion !== friendChampion ? `+${WINNER_POINTS.FIN}` : 'same'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-neutral-300">Finalist differences</span>
                    <span className="font-black text-primary tabular-nums">{roundComparisons.find(r => r.key === 'FIN')?.mineOnly.length ?? 0} vs {roundComparisons.find(r => r.key === 'FIN')?.friendOnly.length ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-neutral-300">Semifinalist differences</span>
                    <span className="font-black text-primary tabular-nums">{roundComparisons.find(r => r.key === 'SF')?.mineOnly.length ?? 0} vs {roundComparisons.find(r => r.key === 'SF')?.friendOnly.length ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
