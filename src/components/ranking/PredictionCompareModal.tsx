'use client';

import { useMemo, useState } from 'react';
import type { LeaderboardPrediction, LiveMatch, MatchResult, KnockoutRound } from '@/types';
import { allGroupMatches } from '@/data/matches';
import { groups, teamsByCode } from '@/data/teams';
import { getGroupQualifiers } from '@/lib/logic/standings';
import {
  GROUP_POINTS,
  QUALIFIER_POINTS,
  RUNNER_UP_POINTS,
  WINNER_POINTS,
  usePredictionResults,
} from '@/hooks/usePredictionResults';

interface Props {
  mine: LeaderboardPrediction;
  friend: LeaderboardPrediction;
  mineRank?: number;
  friendRank?: number;
  onClose: () => void;
  liveMatches?: Record<string, LiveMatch>;
  teamFlagsByCode?: Record<string, string>;
}

type CompareTab = 'overview' | 'groups' | 'knockout' | 'inplay';
type RoundCompareKey = Exclude<KnockoutRound, 'R32'> | 'thirdWinner' | 'finalRunnerUp' | 'finalWinner';

interface RoundQualifierComparison {
  key: RoundCompareKey;
  label: string;
  pointsLabel: string;
  both: string[];
  mineOnly: string[];
  friendOnly: string[];
}

const TABS: { id: CompareTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'groups', label: 'Groups' },
  { id: 'knockout', label: 'Knockout' },
  { id: 'inplay', label: 'In Play' },
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

const ROUND_ORDER: RoundCompareKey[] = ['R16', 'QF', 'SF', '3RD', 'thirdWinner', 'FIN', 'finalRunnerUp', 'finalWinner'];

const ROUND_LABELS: Record<RoundCompareKey, string> = {
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  '3RD': 'Third Place Match',
  thirdWinner: 'Third Place Winner',
  FIN: 'Finalists',
  finalRunnerUp: 'Runner-up',
  finalWinner: 'Champion',
};

const ROUND_POINTS: Record<RoundCompareKey, string> = {
  R16: `+${QUALIFIER_POINTS.R16} per team`,
  QF: `+${QUALIFIER_POINTS.QF} per team`,
  SF: `+${QUALIFIER_POINTS.SF} per team`,
  '3RD': `+${QUALIFIER_POINTS['3RD']} per team`,
  thirdWinner: `+${WINNER_POINTS['3RD']}`,
  FIN: `+${QUALIFIER_POINTS.FIN} per team`,
  finalRunnerUp: `+${RUNNER_UP_POINTS}`,
  finalWinner: `+${WINNER_POINTS.FIN}`,
};

// Which live-signal flag settles a given round comparison.
const ROUND_SIGNAL_KEY: Record<RoundCompareKey, KnockoutRound | 'thirdWinner' | 'finalWinner'> = {
  R16: 'R16',
  QF: 'QF',
  SF: 'SF',
  '3RD': '3RD',
  thirdWinner: 'thirdWinner',
  FIN: 'FIN',
  finalRunnerUp: 'FIN',
  finalWinner: 'finalWinner',
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
  points = 0,
}: {
  code: string;
  tone?: 'neutral' | 'mine' | 'friend' | 'both';
  flagsByCode?: Record<string, string>;
  points?: number;
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
    <span className={`inline-flex min-w-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${toneClass}`}>
      {flagUrl ? (
        <img src={flagUrl} alt="" className="h-4 w-6 rounded-[2px] object-cover" />
      ) : team ? (
        <span className="text-base leading-none">{team.flag}</span>
      ) : null}
      <span className="truncate font-body">{team?.name ?? code}</span>
      {points > 0 && (
        <span className="shrink-0 text-[11px] font-black leading-tight text-wc-green">+{points}</span>
      )}
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
  roundPoints = 0,
  advanced,
}: {
  comparison: RoundQualifierComparison;
  mineName: string;
  friendName: string;
  flagsByCode?: Record<string, string>;
  roundPoints?: number;
  advanced?: Set<string>;
}) {
  const hasDiff = comparison.mineOnly.length > 0 || comparison.friendOnly.length > 0;
  if (!hasDiff && comparison.both.length === 0) return null;
  const ptsFor = (code: string) => (advanced?.has(code) ? roundPoints : 0);

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
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">Both have</div>
          <div className="flex flex-wrap gap-1.5">
            {comparison.both.map(code => <TeamToken key={code} code={code} tone="both" flagsByCode={flagsByCode} points={ptsFor(code)} />)}
          </div>
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">{mineName} only</div>
          <div className="flex flex-wrap gap-1.5">
            {comparison.mineOnly.length > 0
              ? comparison.mineOnly.map(code => <TeamToken key={code} code={code} tone="mine" flagsByCode={flagsByCode} points={ptsFor(code)} />)
              : <span className="text-xs italic text-neutral-600">None</span>}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">{friendName} only</div>
          <div className="flex flex-wrap gap-1.5">
            {comparison.friendOnly.length > 0
              ? comparison.friendOnly.map(code => <TeamToken key={code} code={code} tone="friend" flagsByCode={flagsByCode} points={ptsFor(code)} />)
              : <span className="text-xs italic text-neutral-600">None</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function teamName(code: string | null): string {
  if (!code) return '—';
  return teamsByCode[code]?.name ?? code;
}

export default function PredictionCompareModal({ mine, friend, mineRank, friendRank, onClose, liveMatches, teamFlagsByCode }: Props) {
  const [activeTab, setActiveTab] = useState<CompareTab>('knockout');
  const mineResults = usePredictionResults(mine, liveMatches);
  const friendResults = usePredictionResults(friend, liveMatches);
  const mineName = predictionName(mine, 'You');
  const friendName = predictionName(friend, 'Friend');
  const mineChampion = mineResults.predicted.finalWinner ?? mine.champion_code;
  const friendChampion = friendResults.predicted.finalWinner ?? friend.champion_code;

  const groupComparisons = useMemo(() => {
    const mineGroupMatches = mine.group_matches ?? {};
    const friendGroupMatches = friend.group_matches ?? {};
    return allGroupMatches.map(match => {
      const minePick = mineGroupMatches[match.id] ?? null;
      const friendPick = friendGroupMatches[match.id] ?? null;
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
        finished: live?.status === 'FINISHED',
        minePoints: mineOutcome?.points ?? 0,
        friendPoints: friendOutcome?.points ?? 0,
      };
    });
  }, [friend.group_matches, friendResults.perMatch, liveMatches, mine.group_matches, mineResults.perMatch]);

  const roundComparisons = useMemo<RoundQualifierComparison[]>(() => {
    const comparisons: Record<RoundCompareKey, ReturnType<typeof compareSets>> = {
      R16: compareSets(mineResults.predicted.R16, friendResults.predicted.R16),
      QF: compareSets(mineResults.predicted.QF, friendResults.predicted.QF),
      SF: compareSets(mineResults.predicted.SF, friendResults.predicted.SF),
      '3RD': compareSets(mineResults.predicted.thirdParticipants, friendResults.predicted.thirdParticipants),
      thirdWinner: compareSingles(mineResults.predicted.thirdWinner, friendResults.predicted.thirdWinner),
      FIN: compareSets(mineResults.predicted.finalParticipants, friendResults.predicted.finalParticipants),
      finalRunnerUp: compareSingles(mineResults.predicted.finalRunnerUp, friendResults.predicted.finalRunnerUp),
      finalWinner: compareSingles(mineChampion, friendChampion),
    };

    return ROUND_ORDER.map(key => ({
      key,
      label: ROUND_LABELS[key],
      pointsLabel: ROUND_POINTS[key],
      ...comparisons[key],
    }));
  }, [friendChampion, friendResults.predicted, mineChampion, mineResults.predicted]);

  // Per round: which teams have actually advanced, and the points each such pick earns.
  const actualByRound = useMemo(() => {
    const a = mineResults.actual;
    const single = (code: string | null) => new Set<string>(code ? [code] : []);
    return {
      R16: { points: QUALIFIER_POINTS.R16, advanced: a.R16 },
      QF: { points: QUALIFIER_POINTS.QF, advanced: a.QF },
      SF: { points: QUALIFIER_POINTS.SF, advanced: a.SF },
      '3RD': { points: QUALIFIER_POINTS['3RD'], advanced: a.thirdParticipants },
      thirdWinner: { points: WINNER_POINTS['3RD'], advanced: single(a.thirdWinner) },
      FIN: { points: QUALIFIER_POINTS.FIN, advanced: a.finalParticipants },
      finalRunnerUp: { points: RUNNER_UP_POINTS, advanced: single(a.finalRunnerUp) },
      finalWinner: { points: WINNER_POINTS.FIN, advanced: single(a.finalWinner) },
    } as Record<RoundCompareKey, { points: number; advanced: Set<string> }>;
  }, [mineResults.actual]);

  // Who each player sends out of every group (Winner / Runner-up), prediction vs prediction.
  const groupAdvancement = useMemo(() => {
    const mineQ = getGroupQualifiers(mine.group_matches ?? {});
    const friendQ = getGroupQualifiers(friend.group_matches ?? {});
    return groups.map(g => {
      const mineWinner = mineQ.winners[g] ?? null;
      const mineRunner = mineQ.runnersUp[g] ?? null;
      const friendWinner = friendQ.winners[g] ?? null;
      const friendRunner = friendQ.runnersUp[g] ?? null;
      const incomplete = !mineWinner || !mineRunner || !friendWinner || !friendRunner;
      const winnerSame = !!mineWinner && mineWinner === friendWinner;
      const runnerSame = !!mineRunner && mineRunner === friendRunner;
      const mineSet = new Set([mineWinner, mineRunner].filter(Boolean) as string[]);
      const friendSet = new Set([friendWinner, friendRunner].filter(Boolean) as string[]);
      const sameTeams =
        !incomplete && mineSet.size === 2 && friendSet.size === 2 && [...mineSet].every(t => friendSet.has(t));
      return { g, mineWinner, mineRunner, friendWinner, friendRunner, incomplete, winnerSame, runnerSame, sameTeams };
    });
  }, [mine.group_matches, friend.group_matches]);

  const summary = useMemo(() => {
    const groupSame = groupComparisons.filter(row => row.same).length;
    const groupMissing = groupComparisons.filter(row => row.missing).length;
    const groupDifferent = groupComparisons.length - groupSame - groupMissing;

    let knockoutSame = 0;
    let knockoutMineOnly = 0;
    let knockoutFriendOnly = 0;
    for (const round of roundComparisons) {
      knockoutSame += round.both.length;
      knockoutMineOnly += round.mineOnly.length;
      knockoutFriendOnly += round.friendOnly.length;
    }
    const knockoutDifferent = knockoutMineOnly + knockoutFriendOnly;

    const same = groupSame + knockoutSame;
    const different = groupDifferent + knockoutDifferent;
    const compared = same + different;
    const overlap = compared > 0 ? Math.round((same / compared) * 100) : 0;

    const groupAgree = groupAdvancement.filter(row => !row.incomplete && row.winnerSame && row.runnerSame).length;

    return {
      groupSame,
      groupDifferent,
      groupMissing,
      knockoutSame,
      knockoutMineOnly,
      knockoutFriendOnly,
      knockoutDifferent,
      same,
      different,
      compared,
      overlap,
      groupAgree,
      pointDelta: mineResults.summary.totalPoints - friendResults.summary.totalPoints,
    };
  }, [friendResults.summary.totalPoints, groupAdvancement, groupComparisons, mineResults.summary.totalPoints, roundComparisons]);

  const minePoints = mineResults.summary.totalPoints;
  const friendPoints = friendResults.summary.totalPoints;
  const totalPoints = minePoints + friendPoints;
  const mineShare = totalPoints > 0 ? (minePoints / totalPoints) * 100 : 50;

  const aheadOrBehind = summary.pointDelta === 0 ? 'level' : summary.pointDelta > 0 ? 'ahead' : 'behind';

  const roundSettled = (key: RoundCompareKey) => Boolean(mineResults.hasSignal[ROUND_SIGNAL_KEY[key]]);

  const groupDifferences = groupComparisons.filter(row => !row.same);
  const groupDiffUndecided = groupDifferences.filter(row => !row.finished);
  const groupDiffSettled = groupDifferences.filter(row => row.finished);
  const knockoutDifferences = roundComparisons.filter(row => row.mineOnly.length > 0 || row.friendOnly.length > 0);
  const knockoutDiffUndecided = knockoutDifferences.filter(row => !roundSettled(row.key));
  const knockoutDiffSettled = knockoutDifferences.filter(row => roundSettled(row.key));
  const hasUndecided = groupDiffUndecided.length > 0 || knockoutDiffUndecided.length > 0;
  const hasSettled = groupDiffSettled.length > 0 || knockoutDiffSettled.length > 0;

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

  const renderAdvancementRow = (slot: string, mineCode: string | null, friendCode: string | null) => {
    const same = !!mineCode && mineCode === friendCode;
    const rowTone = same ? 'bg-wc-green/[0.06]' : '';
    return (
      <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg px-2 py-1.5 ${rowTone}`}>
        <div className="flex min-w-0 items-center justify-start">
          {mineCode
            ? <TeamToken code={mineCode} tone={same ? 'both' : 'mine'} flagsByCode={teamFlagsByCode} />
            : <span className="text-xs italic text-neutral-600">—</span>}
        </div>
        <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-neutral-400">{slot}</span>
        <div className="flex min-w-0 items-center justify-end">
          {friendCode
            ? <TeamToken code={friendCode} tone={same ? 'both' : 'friend'} flagsByCode={teamFlagsByCode} />
            : <span className="text-xs italic text-neutral-600">—</span>}
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
        {/* ===== HERO SCOREBOARD ===== */}
        <div className="border-b border-white/10 px-4 py-4 sm:px-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-primary/80">
              <span className="material-symbols-outlined text-[16px]">swords</span>
              Head-to-head
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-neutral-400 transition-colors hover:bg-white/15 hover:text-white"
              aria-label="Close comparison"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            {/* YOU */}
            <div className="flex flex-col items-center text-center">
              {mineRank ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black text-black">#{mineRank}</span>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">First pick</span>
              )}
              <div className="mt-1.5 max-w-full truncate text-sm font-black text-white sm:text-base">{mineName}</div>
              {mineChampion && (
                <div className="mt-1"><TeamToken code={mineChampion} tone="mine" flagsByCode={teamFlagsByCode} /></div>
              )}
              <div className="mt-1.5 text-2xl font-black tabular-nums text-primary sm:text-3xl">{minePoints}</div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-primary/60">points</div>
            </div>

            {/* VS + gap */}
            <div className="flex flex-col items-center px-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-600">vs</div>
              <div className={`mt-1 flex flex-col items-center rounded-xl border px-2.5 py-1.5 ${
                aheadOrBehind === 'behind'
                  ? 'border-wc-red/30 bg-wc-red/10'
                  : aheadOrBehind === 'ahead'
                    ? 'border-wc-green/30 bg-wc-green/10'
                    : 'border-white/10 bg-neutral-900/70'
              }`}>
                <span className={`material-symbols-outlined text-[16px] ${
                  aheadOrBehind === 'behind' ? 'text-wc-red' : aheadOrBehind === 'ahead' ? 'text-wc-green' : 'text-neutral-400'
                }`}>
                  {aheadOrBehind === 'behind' ? 'trending_down' : aheadOrBehind === 'ahead' ? 'trending_up' : 'drag_handle'}
                </span>
                <span className={`text-sm font-black tabular-nums ${
                  aheadOrBehind === 'behind' ? 'text-wc-red' : aheadOrBehind === 'ahead' ? 'text-wc-green' : 'text-neutral-300'
                }`}>
                  {summary.pointDelta > 0 ? '+' : ''}{summary.pointDelta}
                </span>
                <span className={`text-[8px] font-bold uppercase tracking-wider ${
                  aheadOrBehind === 'behind' ? 'text-wc-red/70' : aheadOrBehind === 'ahead' ? 'text-wc-green/70' : 'text-neutral-500'
                }`}>{aheadOrBehind}</span>
              </div>
            </div>

            {/* FRIEND */}
            <div className="flex flex-col items-center text-center">
              {friendRank ? (
                <span className="rounded-full bg-wc-blue px-2 py-0.5 text-[10px] font-black text-white">#{friendRank}</span>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-300/70">Second pick</span>
              )}
              <div className="mt-1.5 max-w-full truncate text-sm font-black text-white sm:text-base">{friendName}</div>
              {friendChampion && (
                <div className="mt-1"><TeamToken code={friendChampion} tone="friend" flagsByCode={teamFlagsByCode} /></div>
              )}
              <div className="mt-1.5 text-2xl font-black tabular-nums text-blue-300 sm:text-3xl">{friendPoints}</div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-blue-300/60">points</div>
            </div>
          </div>

          {/* tug-of-war + overlap */}
          <div className="mt-4">
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-800">
              <div className="h-full bg-primary transition-all" style={{ width: `${mineShare}%` }} />
              <div className="h-full bg-wc-blue transition-all" style={{ width: `${100 - mineShare}%` }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold">
              <span className="text-primary/70">{summary.overlap}% picks agree</span>
              <span className="text-neutral-500">·</span>
              <span className="text-blue-300/70">{summary.different} differ</span>
            </div>
          </div>

          <CompareTabRail activeTab={activeTab} onSelect={setActiveTab} />
        </div>

        {/* ===== BODY ===== */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">

          {activeTab === 'overview' && (
            <div className="space-y-5">
              <section>
                <h3 className="mb-2 text-[11px] font-black uppercase tracking-widest text-white/60">Where the gap comes from</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Group stage', mine: mineResults.summary.groupPoints, friend: friendResults.summary.groupPoints },
                    { label: 'Knockout', mine: mineResults.summary.knockoutPoints, friend: friendResults.summary.knockoutPoints },
                  ].map(item => {
                    const delta = item.mine - item.friend;
                    return (
                      <div key={item.label} className="rounded-xl border border-white/10 bg-neutral-900/50 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{item.label}</span>
                          {delta !== 0 && (
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${delta > 0 ? 'bg-primary/15 text-primary' : 'bg-wc-blue/15 text-blue-300'}`}>
                              {delta > 0 ? mineName : friendName} +{Math.abs(delta)}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-end justify-between text-sm font-black tabular-nums">
                          <span className="text-primary">{item.mine}</span>
                          <span className="text-xs text-neutral-600">vs</span>
                          <span className="text-blue-300">{item.friend}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-xl border border-wc-green/20 bg-wc-green/5 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-wc-green">join_inner</span>
                  <span className="text-[11px] font-black uppercase tracking-widest text-wc-green">Common ground · {summary.same} shared picks</span>
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-400 font-body">
                  You agree on {summary.overlap}% of compared picks — {summary.same} the same, {summary.different} different.
                </p>
              </section>
            </div>
          )}

          {activeTab === 'groups' && (
            <div className="space-y-5">
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-white/80">
                    <span className="material-symbols-outlined text-[16px] text-primary">military_tech</span>
                    Group advancement
                  </h3>
                  <span className="text-[10px] font-bold uppercase text-neutral-500">{summary.groupAgree} / {groups.length} groups agree</span>
                </div>
                <p className="mb-3 text-[11px] leading-snug text-neutral-500">
                  Who each of you sends out of every group — Winner &amp; Runner-up, slot by slot.
                  <span className="font-bold text-wc-green"> Green = same pick</span>, split = you disagree.
                </p>
                <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-1 text-[9px] font-black uppercase tracking-widest">
                  <span className="text-primary">{mineName}</span>
                  <span className="text-neutral-600">slot</span>
                  <span className="text-right text-blue-300">{friendName}</span>
                </div>
                <div className="space-y-2">
                  {groupAdvancement.map(row => {
                    let chip: { label: string; tone: string };
                    if (row.incomplete) chip = { label: 'incomplete', tone: 'bg-wc-amber/15 text-wc-amber' };
                    else if (row.winnerSame && row.runnerSame) chip = { label: 'both agree', tone: 'bg-wc-green/15 text-wc-green' };
                    else if (row.sameTeams) chip = { label: 'seed flip', tone: 'bg-primary/15 text-primary' };
                    else if (row.winnerSame || row.runnerSame) chip = { label: 'one differs', tone: 'bg-primary/15 text-primary' };
                    else chip = { label: 'both differ', tone: 'bg-primary/15 text-primary' };
                    const borderTone = chip.label === 'both agree' ? 'border-white/10' : chip.label === 'incomplete' ? 'border-wc-amber/20' : 'border-primary/20';
                    return (
                      <div key={row.g} className={`rounded-xl border bg-neutral-900/50 p-3 ${borderTone}`}>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase tracking-widest text-white">Group {row.g}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${chip.tone}`}>{chip.label}</span>
                        </div>
                        {renderAdvancementRow('1st', row.mineWinner, row.friendWinner)}
                        <div className="mt-1">{renderAdvancementRow('2nd', row.mineRunner, row.friendRunner)}</div>
                        {row.sameTeams && !row.winnerSame && (
                          <p className="mt-1.5 px-1 text-[10px] text-neutral-500">Same two teams through — but you flipped who tops the group.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-[11px] font-black uppercase tracking-widest text-white/60">Match-by-match</h3>
                <div className="space-y-4">
                  {groups.map(group => {
                    const rows = groupComparisons.filter(row => row.match.group === group);
                    const diffCount = rows.filter(row => !row.same).length;
                    return (
                      <div key={group}>
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-white/60">Group {group}</h4>
                          <span className={`text-[10px] font-bold uppercase ${diffCount > 0 ? 'text-primary/70' : 'text-wc-green'}`}>
                            {diffCount > 0 ? `${diffCount} different` : 'all same'}
                          </span>
                        </div>
                        <div className="space-y-2">{rows.map(row => renderGroupRow(row, true))}</div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'knockout' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-neutral-900/50 p-2 text-center">
                <div>
                  <div className="text-lg font-black tabular-nums text-wc-green">{summary.knockoutSame}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">shared teams</div>
                </div>
                <div>
                  <div className="text-lg font-black tabular-nums text-primary">{summary.knockoutMineOnly}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">only {mineName}</div>
                </div>
                <div>
                  <div className="text-lg font-black tabular-nums text-blue-300">{summary.knockoutFriendOnly}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">only {friendName}</div>
                </div>
              </div>

              {/* Champion head-to-head */}
              <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/[0.06] to-wc-blue/[0.06] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-widest text-white">Champion</span>
                  <span className="text-[9px] font-bold uppercase text-primary/70">+{WINNER_POINTS.FIN}</span>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div className="flex items-center gap-2">
                    {mineChampion ? <TeamToken code={mineChampion} tone="mine" flagsByCode={teamFlagsByCode} points={actualByRound.finalWinner.advanced.has(mineChampion) ? actualByRound.finalWinner.points : 0} /> : <span className="text-xs italic text-neutral-600">—</span>}
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-neutral-600">trophy</span>
                  <div className="flex items-center justify-end gap-2">
                    {friendChampion ? <TeamToken code={friendChampion} tone="friend" flagsByCode={teamFlagsByCode} points={actualByRound.finalWinner.advanced.has(friendChampion) ? actualByRound.finalWinner.points : 0} /> : <span className="text-xs italic text-neutral-600">—</span>}
                  </div>
                </div>
                <p className="mt-2 text-center text-[10px] text-neutral-500">
                  {mineChampion && mineChampion === friendChampion
                    ? `You both crown ${teamName(mineChampion)}.`
                    : `You disagree on the champion — ${teamName(mineChampion)} vs ${teamName(friendChampion)}.`}
                </p>
              </div>

              {roundComparisons.map(comparison => (
                <RoundDiffBlock
                  key={comparison.key}
                  comparison={comparison}
                  mineName={mineName}
                  friendName={friendName}
                  flagsByCode={teamFlagsByCode}
                  roundPoints={actualByRound[comparison.key].points}
                  advanced={actualByRound[comparison.key].advanced}
                />
              ))}
            </div>
          )}

          {activeTab === 'inplay' && (
            <div className="space-y-5">
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-white/80">
                    <span className="material-symbols-outlined text-[16px] text-wc-amber">local_fire_department</span>
                    Still in play
                  </h3>
                </div>
                <p className="mb-3 text-[11px] leading-snug text-neutral-500">
                  Where your picks differ and the outcome isn&apos;t decided yet — these are what can still move the gap.
                </p>
                {hasUndecided ? (
                  <div className="space-y-4">
                    {knockoutDiffUndecided.length > 0 && (
                      <div className="space-y-2">
                        {knockoutDiffUndecided.map(comparison => (
                          <RoundDiffBlock
                            key={comparison.key}
                            comparison={comparison}
                            mineName={mineName}
                            friendName={friendName}
                            flagsByCode={teamFlagsByCode}
                            roundPoints={actualByRound[comparison.key].points}
                            advanced={actualByRound[comparison.key].advanced}
                          />
                        ))}
                      </div>
                    )}
                    {groupDiffUndecided.length > 0 && (
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-white/60">Group matches</h4>
                          <span className="text-[10px] font-bold uppercase text-primary/70">+{GROUP_POINTS} per match</span>
                        </div>
                        <div className="space-y-2">{groupDiffUndecided.map(row => renderGroupRow(row))}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-wc-green/20 bg-wc-green/10 px-4 py-8 text-center">
                    <span className="material-symbols-outlined text-4xl text-wc-green">verified</span>
                    <p className="mt-2 text-sm font-black text-white">No open differences.</p>
                    <p className="mt-1 text-xs text-neutral-400 font-body">Every divergent pick is either shared or already settled.</p>
                  </div>
                )}
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-white/60">Settled differences</h3>
                </div>
                {hasSettled ? (
                  <div className="space-y-2">
                    {knockoutDiffSettled.map(comparison => (
                      <RoundDiffBlock
                        key={comparison.key}
                        comparison={comparison}
                        mineName={mineName}
                        friendName={friendName}
                        flagsByCode={teamFlagsByCode}
                        roundPoints={actualByRound[comparison.key].points}
                        advanced={actualByRound[comparison.key].advanced}
                      />
                    ))}
                    {groupDiffSettled.map(row => renderGroupRow(row))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-white/10 bg-neutral-900/40 px-3 py-4 text-center text-xs text-neutral-500 font-body">
                    No results have settled yet — check back once matches finish.
                  </p>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
