'use client';

import { useMemo } from 'react';
import type { KnockoutRound, LiveMatch, SavedPrediction } from '@/types';
import { teamsByCode } from '@/data/teams';
import {
  usePredictionResults,
  type MatchOutcomeState,
  type PerMatchOutcome,
} from '@/hooks/usePredictionResults';
import {
  useTrackerTabState,
  type KnockoutRoundTabId,
  type TrackerStageId,
  type TrackerTabId,
} from '@/hooks/useTrackerTabState';
import { formatMatchDateTimeET, getDateBucket, groupItemsByDate } from '@/lib/utils/match-dates';

const ROUND_LABELS: Record<KnockoutRound, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-final',
  SF: 'Semi-final',
  '3RD': 'Third-place',
  FIN: 'Final',
};

const STAGE_TABS: { id: TrackerStageId; label: string }[] = [
  { id: 'group', label: 'Group Stage' },
  { id: 'knockout', label: 'Bracket Stage' },
];

const GROUP_TRACKER_TABS: { id: TrackerTabId; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'settled', label: 'Settled' },
  { id: 'all', label: 'All' },
];

const KNOCKOUT_ROUND_TABS: { id: KnockoutRoundTabId; label: string }[] = [
  { id: 'R32', label: 'R32' },
  { id: 'R16', label: 'R16' },
  { id: 'QF', label: 'QF' },
  { id: 'SF', label: 'Semis' },
  { id: 'FIN', label: 'Final' },
];

type SlidingTab<T extends string> = {
  id: T;
  label: string;
  icon?: string;
};

interface Props {
  prediction: SavedPrediction;
  liveMatches: Record<string, LiveMatch>;
  teamFlagsByCode: Record<string, string>;
  onCompare?: () => void;
  hidePointsInStats?: boolean;
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

function isTodayOutcome(outcome: PerMatchOutcome, now: Date): boolean {
  return getDateBucket(outcome.utcDate, now) === 'today';
}

function matchesTrackerTab(outcome: PerMatchOutcome, tab: TrackerTabId, now: Date): boolean {
  if (tab === 'all') return true;
  const settled = isSettledOutcome(outcome);
  // A match that has finished but was played today stays in Active until the day rolls over.
  if (tab === 'active') return isActiveOutcome(outcome) || (settled && isTodayOutcome(outcome, now));
  return settled && !isTodayOutcome(outcome, now);
}

function matchesKnockoutRound(outcome: PerMatchOutcome, round: KnockoutRoundTabId): boolean {
  if (round === 'FIN') return outcome.round === 'FIN' || outcome.round === '3RD';
  return outcome.round === round;
}

function SlidingTabRail<T extends string>({
  tabs,
  activeId,
  counts,
  onSelect,
  surfaceClassName,
  tall = false,
}: {
  tabs: SlidingTab<T>[];
  activeId: T;
  counts: Record<T, string | number>;
  onSelect: (id: T) => void;
  surfaceClassName: string;
  tall?: boolean;
}) {
  const activeIndex = Math.max(0, tabs.findIndex(tab => tab.id === activeId));
  const pillWidth = `calc((100% - 0.5rem) / ${tabs.length})`;

  return (
    <div
      className={`relative grid gap-1 overflow-hidden rounded-2xl border border-white/10 p-1 ${surfaceClassName}`}
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      <div
        aria-hidden="true"
        className="absolute left-1 top-1 bottom-1 rounded-xl bg-primary shadow-[0_8px_24px_rgba(245,197,66,0.25)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{
          width: pillWidth,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {tabs.map(tab => {
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={`relative z-10 flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2.5 text-[12px] font-black uppercase tracking-wider font-body transition-colors duration-200 ${
              tall ? 'py-3' : 'py-2.5'
            } ${
              isActive
                ? 'text-black'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {tab.icon && <span className="material-symbols-outlined text-[18px] flex-shrink-0">{tab.icon}</span>}
            <span className="truncate">{tab.label}</span>
            <span className={`text-[12px] font-black tabular-nums ${isActive ? 'text-black/80' : 'text-neutral-300'}`}>{counts[tab.id]}</span>
          </button>
        );
      })}
    </div>
  );
}

function pickLabel(outcome: PerMatchOutcome): string | null {
  if (!outcome.picked) return null;
  if (outcome.kind === 'group') {
    if (outcome.picked === 'draw') return 'Draw';
    return teamsByCode[outcome.pickedTeamCode ?? '']?.name ?? outcome.pickedTeamCode ?? null;
  }
  return teamsByCode[outcome.pickedTeamCode ?? '']?.name ?? outcome.pickedTeamCode ?? null;
}

function teamDisplayName(code: string | null): string {
  if (!code) return 'TBD';
  return teamsByCode[code]?.name ?? code;
}

function isPlaceholderCode(code: string | null): boolean {
  return !code || code.startsWith('TBD') || code.startsWith('PH:');
}

function TeamFlag({
  code,
  flagUrl,
  size = 'sm',
}: {
  code: string | null;
  flagUrl?: string;
  size?: 'sm' | 'md';
}) {
  if (isPlaceholderCode(code)) return null;

  const team = teamsByCode[code!];
  const imgClass = size === 'sm'
    ? 'w-5 h-3.5 object-cover rounded-sm flex-shrink-0'
    : 'w-6 h-4 object-cover rounded-sm flex-shrink-0';
  const emojiClass = size === 'sm'
    ? 'text-base leading-none flex-shrink-0'
    : 'text-lg leading-none flex-shrink-0';

  if (flagUrl) {
    return (
      <span className="inline-flex flex-shrink-0">
        <img
          src={flagUrl}
          alt=""
          className={imgClass}
          onError={e => {
            const img = e.currentTarget;
            img.style.display = 'none';
            (img.nextSibling as HTMLElement | null)?.removeAttribute('hidden');
          }}
        />
        <span className={emojiClass} hidden>{team?.flag ?? ''}</span>
      </span>
    );
  }

  if (!team?.flag || team.flag === '🏳️') return null;
  return <span className={emojiClass}>{team.flag}</span>;
}

function MatchupLine({
  outcome,
  showScore,
}: {
  outcome: PerMatchOutcome;
  showScore: boolean;
}) {
  const homeName = teamDisplayName(outcome.homeCode);
  const awayName = teamDisplayName(outcome.awayCode);

  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5">
      <span>{homeName}</span>
      {showScore && outcome.score && (
        <span className="tabular-nums">{outcome.score.home}</span>
      )}
      <span className="text-neutral-600">v</span>
      <span>{awayName}</span>
      {showScore && outcome.score && (
        <span className="tabular-nums">{outcome.score.away}</span>
      )}
    </span>
  );
}

function cardStatusLabel(outcome: PerMatchOutcome): string {
  if (isLiveStatus(outcome.status)) return 'Live';
  if (outcome.status === 'FINISHED') return 'Finished';
  if (outcome.utcDate) return formatMatchDateTimeET(outcome.utcDate);
  return 'TBD';
}

const RAIL_ICON_SIZE_PX = 24;

function MatchCardRailIcon({
  state,
  status,
}: {
  state: MatchOutcomeState;
  status: PerMatchOutcome['status'];
}) {
  if (isLiveStatus(status)) {
    return (
      <span className="relative z-10 flex size-6 items-center justify-center rounded-full border border-wc-green/40 bg-background-dark">
        <span className="size-2.5 rounded-full bg-wc-green animate-pulse" />
      </span>
    );
  }

  if (state === 'hit') {
    return (
      <span className="relative z-10 flex size-6 items-center justify-center">
        <span className="material-symbols-outlined text-[22px] font-variation-fill leading-none text-wc-green">check_circle</span>
      </span>
    );
  }

  if (state === 'miss') {
    return (
      <span className="relative z-10 flex size-6 items-center justify-center">
        <span className="material-symbols-outlined text-[22px] font-variation-fill leading-none text-wc-red">cancel</span>
      </span>
    );
  }

  if (state === 'pending') {
    return (
      <span className="relative z-10 flex size-6 items-center justify-center rounded-full border border-white/10 bg-background-dark text-neutral-500">
        <span className="material-symbols-outlined text-[16px] leading-none">hourglass_empty</span>
      </span>
    );
  }

  return (
    <span className="relative z-10 flex size-6 items-center justify-center rounded-full border border-white/10 bg-background-dark">
      <span className="size-2 rounded-full bg-neutral-600" />
    </span>
  );
}

function MatchCard({
  outcome,
  flagsByCode,
  showTopDivider = false,
  showRailConnector = false,
}: {
  outcome: PerMatchOutcome;
  flagsByCode: Record<string, string>;
  showTopDivider?: boolean;
  showRailConnector?: boolean;
}) {
  const showScore = outcome.status === 'FINISHED' || outcome.status === 'IN_PLAY' || outcome.status === 'PAUSED';
  const label = pickLabel(outcome);
  const pickedFlagUrl = outcome.pickedTeamCode ? flagsByCode[outcome.pickedTeamCode] : undefined;
  const meta = outcome.kind === 'group'
    ? `Group ${outcome.group ?? ''} · ${outcome.matchId}`
    : ROUND_LABELS[outcome.round ?? 'R32'];
  const statusLabel = cardStatusLabel(outcome);

  return (
    <div className="relative flex gap-3 px-1 py-3 md:px-3">
      {showTopDivider && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-0 h-px bg-white/5"
          style={{ left: `calc(0.75rem + ${RAIL_ICON_SIZE_PX}px + 0.75rem)` }}
        />
      )}
      <div className="relative flex w-6 shrink-0 justify-center self-stretch">
        {showRailConnector && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 w-px -translate-x-1/2 bg-white/10"
            style={{ height: 'calc(100% + 1.5rem)' }}
          />
        )}
        <div className="relative flex h-full items-center pt-0.5">
          <MatchCardRailIcon state={outcome.state} status={outcome.status} />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          {label ? (
            <span className="flex min-w-0 items-center gap-1.5">
              {outcome.picked !== 'draw' && outcome.pickedTeamCode && (
                <TeamFlag code={outcome.pickedTeamCode} flagUrl={pickedFlagUrl} size="md" />
              )}
              <span className="min-w-0 truncate text-lg font-bold leading-snug text-white font-body md:text-[15px]">{label}</span>
              {outcome.state === 'hit' && (
                <span className="text-lg font-bold tabular-nums text-primary font-body md:text-[15px]">+{outcome.points}</span>
              )}
            </span>
          ) : (
            <span className="text-base font-semibold text-neutral-500 font-body md:text-[13px]">No pick</span>
          )}
          <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-neutral-500 md:text-[10px]">{meta}</span>
        </div>

        <div className="mt-1.5 flex items-start justify-between gap-3">
          <span className="min-w-0 text-base leading-snug text-neutral-400 font-body md:text-[13px]">
            <MatchupLine outcome={outcome} showScore={showScore} />
          </span>
          <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-neutral-500 md:text-[10px]">
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PredictionExpandedTracker({
  prediction,
  liveMatches,
  teamFlagsByCode,
  onCompare,
  hidePointsInStats = false,
}: Props) {
  const { trackerStage, setTrackerStage, groupTab, setGroupTab, knockoutRound, setKnockoutRound } = useTrackerTabState();
  const { perMatch, summary } = usePredictionResults(prediction, liveMatches);

  // Captured once per mount so "today" stays stable across live-poll re-renders.
  const now = useMemo(() => new Date(), []);

  const outcomes = useMemo(() => Object.values(perMatch), [perMatch]);
  const stageOutcomes = useMemo(
    () => outcomes.filter(outcome => outcome.kind === trackerStage),
    [outcomes, trackerStage],
  );
  const stageCounts = useMemo(
    () => ({
      group: `${summary.groupCorrect}/${summary.groupTotal}`,
      knockout: summary.knockoutPoints,
    }),
    [summary.groupCorrect, summary.groupTotal, summary.knockoutPoints],
  );
  const stageActiveCount = useMemo(
    () => stageOutcomes.filter(outcome => matchesTrackerTab(outcome, 'active', now)).length,
    [stageOutcomes, now],
  );
  const stageSettledCount = useMemo(
    () => stageOutcomes.filter(outcome => matchesTrackerTab(outcome, 'settled', now)).length,
    [stageOutcomes, now],
  );
  const knockoutRoundCounts = useMemo(() => {
    const counts: Record<KnockoutRoundTabId, number> = { R32: 0, R16: 0, QF: 0, SF: 0, FIN: 0 };
    for (const outcome of stageOutcomes) {
      if (outcome.round === 'R32') counts.R32++;
      else if (outcome.round === 'R16') counts.R16++;
      else if (outcome.round === 'QF') counts.QF++;
      else if (outcome.round === 'SF') counts.SF++;
      else if (outcome.round === 'FIN' || outcome.round === '3RD') counts.FIN++;
    }
    return counts;
  }, [stageOutcomes]);
  const filteredOutcomes = useMemo(
    () => (
      trackerStage === 'group'
        ? stageOutcomes.filter(outcome => matchesTrackerTab(outcome, groupTab, now))
        : stageOutcomes.filter(outcome => matchesKnockoutRound(outcome, knockoutRound))
    ),
    [stageOutcomes, trackerStage, groupTab, knockoutRound, now],
  );
  const sortedOutcomes = useMemo(
    () => [...filteredOutcomes].sort((a, b) => {
      const ta = a.utcDate ? new Date(a.utcDate).getTime() : Number.POSITIVE_INFINITY;
      const tb = b.utcDate ? new Date(b.utcDate).getTime() : Number.POSITIVE_INFINITY;
      if (ta !== tb) return ta - tb;
      return a.matchId.localeCompare(b.matchId);
    }),
    [filteredOutcomes],
  );

  // Active and Settled tabs group matches under date headers; "all" and the
  // knockout rounds stay as a single flat timeline.
  const groupByDate = trackerStage === 'group' && (groupTab === 'active' || groupTab === 'settled');
  const dateGroups = useMemo(
    () => (groupByDate ? groupItemsByDate(filteredOutcomes, now) : []),
    [groupByDate, filteredOutcomes, now],
  );

  const showHeader = !hidePointsInStats || onCompare;

  return (
    <div className="flex flex-col gap-2 px-1.5 pb-3 md:px-3">
      {showHeader && (
        <div className="flex flex-col gap-2">
          {!hidePointsInStats && (
            <div className="px-1">
              <span className="text-2xl font-black tabular-nums text-primary">{summary.totalPoints}</span>
              <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500">points</span>
            </div>
          )}

          {onCompare && (
            <button
              onClick={onCompare}
              className="flex items-center gap-1.5 px-1 text-[13px] font-bold text-primary transition-colors hover:text-primary/80"
            >
              <span className="material-symbols-outlined text-[18px]">bar_chart</span>
              Compare with other predictions
            </button>
          )}
        </div>
      )}

      <SlidingTabRail
        tabs={STAGE_TABS}
        activeId={trackerStage}
        counts={stageCounts}
        onSelect={setTrackerStage}
        surfaceClassName="bg-neutral-950/50"
        tall
      />

      {trackerStage === 'group' ? (
        <SlidingTabRail
          tabs={GROUP_TRACKER_TABS}
          activeId={groupTab}
          counts={{
            active: stageActiveCount,
            settled: stageSettledCount,
            all: stageOutcomes.length,
          }}
          onSelect={setGroupTab}
          surfaceClassName="bg-white/[0.025]"
        />
      ) : (
        <SlidingTabRail
          tabs={KNOCKOUT_ROUND_TABS}
          activeId={knockoutRound}
          counts={knockoutRoundCounts}
          onSelect={setKnockoutRound}
          surfaceClassName="bg-white/[0.025]"
        />
      )}

      {sortedOutcomes.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-neutral-900/40 px-4 py-6 text-center">
          <span className="material-symbols-outlined text-3xl text-neutral-500">filter_alt_off</span>
          <p className="mt-2 text-xs text-neutral-500 font-body">
            {trackerStage === 'group' && groupTab === 'active'
              ? 'No active group stage picks right now.'
              : 'Nothing to show here yet.'}
          </p>
        </div>
      ) : groupByDate ? (
        <div className="flex flex-col gap-1">
          {dateGroups.map(group => (
            <div key={group.dayKey}>
              <div className="px-1 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-neutral-500 md:text-[10px]">
                {group.label}
              </div>
              <div className="relative">
                {group.items.map((outcome, index) => (
                  <MatchCard
                    key={outcome.matchId}
                    outcome={outcome}
                    flagsByCode={teamFlagsByCode}
                    showTopDivider={index > 0}
                    showRailConnector={index < group.items.length - 1}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative">
          {sortedOutcomes.map((outcome, index) => (
            <MatchCard
              key={outcome.matchId}
              outcome={outcome}
              flagsByCode={teamFlagsByCode}
              showTopDivider={index > 0}
              showRailConnector={index < sortedOutcomes.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
