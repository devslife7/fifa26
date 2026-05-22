'use client';

import { useMemo, useState } from 'react';
import type { KnockoutRound, LiveMatch, SavedPrediction } from '@/types';
import { teamsByCode } from '@/data/teams';
import {
  GROUP_POINTS,
  QUALIFIER_POINTS,
  WINNER_POINTS,
  usePredictionResults,
  type MatchOutcomeState,
  type PerMatchOutcome,
} from '@/hooks/usePredictionResults';
import { formatMatchTime, groupItemsByDate } from '@/lib/utils/match-dates';

type TrackerTabId = 'active' | 'settled' | 'all';
type TrackerStageId = 'group' | 'knockout';

const ROUND_LABELS: Record<KnockoutRound, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-final',
  SF: 'Semi-final',
  '3RD': 'Third-place',
  FIN: 'Final',
};

const STAGE_TABS: { id: TrackerStageId; label: string; icon: string }[] = [
  { id: 'group', label: 'Group Stage', icon: 'grid_view' },
  { id: 'knockout', label: 'Bracket Stage', icon: 'account_tree' },
];

const TRACKER_TABS: { id: TrackerTabId; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'settled', label: 'Settled' },
  { id: 'all', label: 'All' },
];

interface Props {
  prediction: SavedPrediction;
  liveMatches: Record<string, LiveMatch>;
  teamFlagsByCode: Record<string, string>;
  onCompare: () => void;
}

function isLiveStatus(status: PerMatchOutcome['status']): boolean {
  return status === 'IN_PLAY' || status === 'PAUSED';
}

function isActiveOutcome(outcome: PerMatchOutcome): boolean {
  if (!outcome.picked) return false;
  return isLiveStatus(outcome.status) || outcome.state === 'pending' || outcome.state === 'upcoming';
}

function isSettledOutcome(outcome: PerMatchOutcome): boolean {
  return outcome.state === 'hit' || outcome.state === 'miss' || outcome.state === 'no-pick';
}

function matchesTrackerTab(outcome: PerMatchOutcome, tab: TrackerTabId): boolean {
  if (tab === 'all') return true;
  if (tab === 'active') return isActiveOutcome(outcome);
  return isSettledOutcome(outcome);
}

function maxPointsForOutcome(outcome: PerMatchOutcome): number {
  if (outcome.kind === 'group') return GROUP_POINTS;
  if (outcome.round === 'R32') return QUALIFIER_POINTS.R16;
  if (outcome.round === 'R16') return QUALIFIER_POINTS.QF;
  if (outcome.round === 'QF') return QUALIFIER_POINTS.SF;
  if (outcome.round === 'SF') return QUALIFIER_POINTS.FIN + QUALIFIER_POINTS['3RD'];
  if (outcome.round === '3RD') return WINNER_POINTS['3RD'];
  if (outcome.round === 'FIN') return WINNER_POINTS.FIN;
  return 0;
}

function pickLabel(outcome: PerMatchOutcome): string | null {
  if (!outcome.picked) return null;
  if (outcome.kind === 'group') {
    if (outcome.picked === 'draw') return 'Draw';
    return teamsByCode[outcome.pickedTeamCode ?? '']?.name ?? outcome.pickedTeamCode ?? null;
  }
  return teamsByCode[outcome.pickedTeamCode ?? '']?.name ?? outcome.pickedTeamCode ?? null;
}

function TeamRow({
  code,
  score,
  flagUrl,
}: {
  code: string | null;
  score: number | null;
  flagUrl?: string;
}) {
  if (!code) {
    return <span className="text-sm text-neutral-500 italic font-body">TBD</span>;
  }

  const team = teamsByCode[code];
  const isPlaceholder = code.startsWith('TBD') || code.startsWith('PH:');

  return (
    <div className="flex min-w-0 items-center gap-2">
      {!isPlaceholder && (
        flagUrl ? (
          <img src={flagUrl} alt="" className="h-4 w-6 flex-shrink-0 rounded-sm object-cover" />
        ) : (
          <span className="flex-shrink-0 text-xl leading-none">{team?.flag}</span>
        )
      )}
      <span className="truncate text-[15px] font-semibold text-neutral-200 font-body">{team?.name ?? code}</span>
      {score !== null && (
        <span className="ml-auto text-sm font-black tabular-nums text-white">{score}</span>
      )}
    </div>
  );
}

function StateBadge({
  state,
  points,
  status,
}: {
  state: MatchOutcomeState;
  points: number;
  status: PerMatchOutcome['status'];
}) {
  if (isLiveStatus(status)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-wc-green/30 bg-wc-green/15 px-2.5 py-1 text-wc-green">
        <span className="size-1.5 rounded-full bg-wc-green animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-wider font-body">Live</span>
      </span>
    );
  }

  if (state === 'hit') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-wc-green/30 bg-wc-green/15 px-2.5 py-1 text-wc-green">
        <span className="material-symbols-outlined text-[16px] font-variation-fill">check_circle</span>
        <span className="text-[11px] font-black font-body">+{points}</span>
      </span>
    );
  }

  if (state === 'miss') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-wc-red/30 bg-wc-red/15 px-2.5 py-1 text-wc-red">
        <span className="material-symbols-outlined text-[16px] font-variation-fill">cancel</span>
        <span className="text-[10px] font-black uppercase tracking-wider font-body">Miss</span>
      </span>
    );
  }

  if (state === 'upcoming') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-neutral-400">
        <span className="material-symbols-outlined text-[16px]">schedule</span>
        <span className="text-[10px] font-black uppercase tracking-wider font-body">Upcoming</span>
      </span>
    );
  }

  if (state === 'no-pick') {
    return (
      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-neutral-500">
        <span className="text-[10px] font-black uppercase tracking-wider font-body">No pick</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-primary">
      <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
      <span className="text-[10px] font-black uppercase tracking-wider font-body">Pending</span>
    </span>
  );
}

function MatchCard({
  outcome,
  flagsByCode,
}: {
  outcome: PerMatchOutcome;
  flagsByCode: Record<string, string>;
}) {
  const showScore = outcome.status === 'FINISHED' || outcome.status === 'IN_PLAY' || outcome.status === 'PAUSED';
  const label = pickLabel(outcome);
  const maxPoints = maxPointsForOutcome(outcome);
  const active = isActiveOutcome(outcome);

  return (
    <div className="border-b border-white/5 px-3 py-3 last:border-0 sm:flex sm:items-center sm:gap-3">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-neutral-500">
          <span className="font-black uppercase tracking-wider">
            {outcome.kind === 'group'
              ? `Group ${outcome.group ?? ''} · ${outcome.matchId}`
              : ROUND_LABELS[outcome.round ?? 'R32']}
          </span>
          {outcome.utcDate && (
            <span className="font-black uppercase tabular-nums">{formatMatchTime(outcome.utcDate)}</span>
          )}
        </div>
        <div className="space-y-1.5">
          <TeamRow
            code={outcome.homeCode}
            score={showScore ? outcome.score?.home ?? null : null}
            flagUrl={outcome.homeCode ? flagsByCode[outcome.homeCode] : undefined}
          />
          <TeamRow
            code={outcome.awayCode}
            score={showScore ? outcome.score?.away ?? null : null}
            flagUrl={outcome.awayCode ? flagsByCode[outcome.awayCode] : undefined}
          />
        </div>
        {label && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] font-body">
            <span className="font-black uppercase tracking-wider text-neutral-500">Your pick:</span>
            <span className={`font-black ${
              outcome.state === 'hit'
                ? 'text-wc-green'
                : outcome.state === 'miss'
                  ? 'text-wc-red'
                  : 'text-neutral-300'
            }`}>{label}</span>
            {active && maxPoints > 0 && (
              <>
                <span className="text-neutral-700">·</span>
                <span className="font-black text-primary/85">Max +{maxPoints}</span>
              </>
            )}
          </div>
        )}
      </div>
      <div className="mt-3 flex justify-end sm:mt-0 sm:flex-shrink-0">
        <StateBadge state={outcome.state} points={outcome.points} status={outcome.status} />
      </div>
    </div>
  );
}

export default function PredictionExpandedTracker({
  prediction,
  liveMatches,
  teamFlagsByCode,
  onCompare,
}: Props) {
  const [trackerStage, setTrackerStage] = useState<TrackerStageId>('group');
  const [trackerTab, setTrackerTab] = useState<TrackerTabId>('active');
  const { perMatch, summary } = usePredictionResults(prediction, liveMatches);

  const outcomes = useMemo(() => Object.values(perMatch), [perMatch]);
  const activeCount = useMemo(() => outcomes.filter(isActiveOutcome).length, [outcomes]);
  const settledCount = useMemo(() => outcomes.filter(isSettledOutcome).length, [outcomes]);
  const maxRemaining = useMemo(
    () => outcomes.reduce((sum, outcome) => (
      isActiveOutcome(outcome) ? sum + maxPointsForOutcome(outcome) : sum
    ), 0),
    [outcomes],
  );
  const stageOutcomes = useMemo(
    () => outcomes.filter(outcome => outcome.kind === trackerStage),
    [outcomes, trackerStage],
  );
  const stageCounts = useMemo(
    () => ({
      group: outcomes.filter(outcome => outcome.kind === 'group').length,
      knockout: outcomes.filter(outcome => outcome.kind === 'knockout').length,
    }),
    [outcomes],
  );
  const stageActiveCount = useMemo(() => stageOutcomes.filter(isActiveOutcome).length, [stageOutcomes]);
  const stageSettledCount = useMemo(() => stageOutcomes.filter(isSettledOutcome).length, [stageOutcomes]);
  const filteredOutcomes = useMemo(
    () => stageOutcomes.filter(outcome => matchesTrackerTab(outcome, trackerTab)),
    [stageOutcomes, trackerTab],
  );
  const groupedByDate = useMemo(() => groupItemsByDate(filteredOutcomes), [filteredOutcomes]);

  return (
    <div className="space-y-4 px-3 pb-3">
      <div className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-neutral-900/80">
        <div className="flex items-end justify-between px-5 py-5">
          <div>
            <div className="text-[13px] font-black uppercase tracking-wider text-neutral-400">Total Points</div>
            <div className="text-5xl font-black leading-tight tabular-nums text-primary">{summary.totalPoints}</div>
          </div>
          <div className="text-right">
            <div className="text-[12px] font-black uppercase tracking-wider text-neutral-400">
              {summary.pointsToday > 0 ? 'Today' : 'Max Left'}
            </div>
            <div className={`text-2xl font-black leading-tight tabular-nums ${
              summary.pointsToday > 0 ? 'text-wc-green' : 'text-primary'
            }`}>
              +{summary.pointsToday > 0 ? summary.pointsToday : maxRemaining}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-white/10 text-center">
          <div className="border-r border-white/10 py-3">
            <div className="text-2xl font-black tabular-nums text-wc-green">{activeCount}</div>
            <div className="text-[12px] font-black uppercase tracking-wider text-neutral-400">Active</div>
          </div>
          <div className="border-r border-white/10 py-3">
            <div className="text-2xl font-black tabular-nums text-blue-400">{settledCount}</div>
            <div className="text-[12px] font-black uppercase tracking-wider text-neutral-400">Settled</div>
          </div>
          <div className="py-3">
            <div className="text-2xl font-black tabular-nums text-neutral-200">+{maxRemaining}</div>
            <div className="text-[12px] font-black uppercase tracking-wider text-neutral-400">Max Left</div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-white/10 bg-white/[0.015] text-center">
          <div className="border-r border-white/10 py-2.5">
            <div className="text-lg font-black tabular-nums text-wc-green">{summary.groupCorrect}/{summary.groupTotal}</div>
            <div className="text-[11px] font-black uppercase tracking-wider text-neutral-500">Groups</div>
          </div>
          <div className="py-2.5">
            <div className="text-lg font-black tabular-nums text-blue-400">{summary.knockoutPoints}</div>
            <div className="text-[11px] font-black uppercase tracking-wider text-neutral-500">Knockout pts</div>
          </div>
        </div>

        <button
          onClick={onCompare}
          className="flex w-full items-center justify-center gap-2 border-t border-white/10 px-4 py-3 text-[15px] font-black text-primary transition-colors hover:bg-white/5"
        >
          <span className="material-symbols-outlined text-[20px]">bar_chart</span>
          Compare with other predictions
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-neutral-950/50 p-1">
        {STAGE_TABS.map(tab => {
          const isActive = trackerStage === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTrackerStage(tab.id)}
              className={`min-w-0 rounded-xl px-2.5 py-3 text-[12px] font-black uppercase tracking-wider transition-colors font-body flex items-center justify-center gap-1.5 ${
                isActive
                  ? 'bg-primary text-black'
                  : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] flex-shrink-0">{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
              <span className={`tabular-nums ${isActive ? 'text-black/60' : 'text-neutral-600'}`}>{stageCounts[tab.id]}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-white/[0.025] p-1">
        {TRACKER_TABS.map(tab => {
          const isActive = trackerTab === tab.id;
          const count = tab.id === 'active'
            ? stageActiveCount
            : tab.id === 'settled'
              ? stageSettledCount
              : stageOutcomes.length;
          return (
            <button
              key={tab.id}
              onClick={() => setTrackerTab(tab.id)}
              className={`min-w-0 rounded-xl px-2 py-2.5 text-[12px] font-black uppercase tracking-wider transition-colors font-body ${
                isActive
                  ? 'bg-primary text-black'
                  : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`ml-1 tabular-nums ${isActive ? 'text-black/60' : 'text-neutral-600'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {groupedByDate.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-neutral-900/40 px-4 py-6 text-center">
          <span className="material-symbols-outlined text-3xl text-neutral-500">filter_alt_off</span>
          <p className="mt-2 text-xs text-neutral-500 font-body">
            {trackerTab === 'active'
              ? `No active ${trackerStage === 'group' ? 'group stage' : 'bracket stage'} picks right now.`
              : 'Nothing to show here yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedByDate.map(group => (
            <div key={group.dayKey}>
              <div className="flex items-center justify-between px-1 pb-2 pt-1">
                <span className="text-[13px] font-black uppercase tracking-widest text-white/60">{group.label}</span>
                <span className="text-[12px] font-black uppercase tracking-wide tabular-nums text-neutral-500">
                  {group.items.length} {group.items.length === 1 ? 'match' : 'matches'}
                  {group.items.reduce((sum, outcome) => sum + outcome.points, 0) > 0 && (
                    <span className="ml-1.5 text-wc-green">
                      +{group.items.reduce((sum, outcome) => sum + outcome.points, 0)} pts
                    </span>
                  )}
                </span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/5 bg-neutral-900/50">
                {group.items.map(outcome => (
                  <MatchCard key={outcome.matchId} outcome={outcome} flagsByCode={teamFlagsByCode} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
