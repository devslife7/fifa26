'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LiveMatch, MatchResult, KnockoutResult, KnockoutRound, TabId, LeaderboardPrediction, LeaderboardEntry } from '@/types';
import { teamsByCode } from '@/data/teams';
import { useActivePrediction } from '@/hooks/useActivePrediction';
import {
  GROUP_POINTS,
  QUALIFIER_POINTS,
  WINNER_POINTS,
  usePredictionResults,
  type PerMatchOutcome,
  type MatchOutcomeState,
} from '@/hooks/usePredictionResults';
import { groupItemsByDate, formatMatchTime } from '@/lib/utils/match-dates';
import { useAuth } from '@/components/providers/AuthProvider';
import UserPredictionsModal from '@/components/ranking/UserPredictionsModal';
import PredictionLockedView from './PredictionLockedView';

const ROUND_LABELS: Record<KnockoutRound, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-final',
  SF: 'Semi-final',
  '3RD': 'Third-place',
  FIN: 'Final',
};

type TrackerTabId = 'active' | 'settled' | 'all';

const TRACKER_TABS: { id: TrackerTabId; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'settled', label: 'Settled' },
  { id: 'all', label: 'All' },
];

interface Props {
  liveMatches: Record<string, LiveMatch>;
  teamFlagsByCode: Record<string, string>;
  onNavigate: (tab: TabId) => void;
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
  if (tab === 'settled') return isSettledOutcome(outcome);
  return true;
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

function TeamRow({ code, score, flagUrl, dim }: { code: string | null; score: number | null; flagUrl?: string; dim?: boolean }) {
  if (!code) {
    return <span className="text-neutral-500 text-sm italic">TBD</span>;
  }
  const team = teamsByCode[code];
  const isTBD = code.startsWith('TBD') || code.startsWith('PH:');
  return (
    <div className={`flex items-center gap-2 min-w-0 ${dim ? 'opacity-60' : ''}`}>
      {!isTBD && (
        flagUrl ? (
          <img src={flagUrl} alt="" className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0" />
        ) : (
          <span className="text-base leading-none flex-shrink-0">{team?.flag}</span>
        )
      )}
      <span className="text-sm font-semibold text-neutral-200 truncate font-body">{team?.name ?? code}</span>
      {score !== null && (
        <span className="ml-auto tabular-nums font-black text-sm text-white">{score}</span>
      )}
    </div>
  );
}

function StateBadge({ state, points, status }: { state: MatchOutcomeState; points: number; status: PerMatchOutcome['status'] }) {
  if (isLiveStatus(status)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-wc-green/15 text-wc-green border border-wc-green/30">
        <span className="size-1.5 rounded-full bg-wc-green animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-wider font-body">Live</span>
      </span>
    );
  }

  if (state === 'hit') {
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-wc-green/15 text-wc-green border border-wc-green/30">
        <span className="material-symbols-outlined text-[14px] font-variation-fill">check_circle</span>
        <span className="text-[11px] font-black font-body">+{points}</span>
      </span>
    );
  }
  if (state === 'miss') {
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-wc-red/15 text-wc-red border border-wc-red/30">
        <span className="material-symbols-outlined text-[14px] font-variation-fill">cancel</span>
      </span>
    );
  }
  if (state === 'upcoming') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-neutral-400 border border-white/10">
        <span className="material-symbols-outlined text-[14px]">schedule</span>
        <span className="text-[10px] font-bold uppercase tracking-wider font-body">Upcoming</span>
      </span>
    );
  }
  if (state === 'no-pick') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 text-neutral-500 border border-white/10">
        <span className="text-[10px] font-bold uppercase tracking-wider font-body">No pick</span>
      </span>
    );
  }
  // pending
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
      <span className="material-symbols-outlined text-[14px]">hourglass_top</span>
      <span className="text-[10px] font-bold uppercase tracking-wider font-body">Pending</span>
    </span>
  );
}

function pickLabel(o: PerMatchOutcome): string | null {
  if (!o.picked) return null;
  if (o.kind === 'group') {
    if (o.picked === 'draw') return 'Draw';
    const code = o.pickedTeamCode;
    return teamsByCode[code ?? '']?.name ?? code ?? null;
  }
  return teamsByCode[o.pickedTeamCode ?? '']?.name ?? o.pickedTeamCode ?? null;
}

function MatchRow({ outcome, flagsByCode }: { outcome: PerMatchOutcome; flagsByCode: Record<string, string> }) {
  const homeScore = outcome.score?.home ?? null;
  const awayScore = outcome.score?.away ?? null;
  const showScore = outcome.status === 'FINISHED' || outcome.status === 'IN_PLAY' || outcome.status === 'PAUSED';
  const homeFlag = outcome.homeCode ? flagsByCode[outcome.homeCode] : undefined;
  const awayFlag = outcome.awayCode ? flagsByCode[outcome.awayCode] : undefined;
  const label = pickLabel(outcome);
  const active = isActiveOutcome(outcome);
  const maxPoints = maxPointsForOutcome(outcome);

  return (
    <div className="px-3 py-2.5 border-b border-white/5 last:border-0 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 text-[10px] text-neutral-500 mb-1">
          <span className="font-bold uppercase tracking-wider">
            {outcome.kind === 'group'
              ? `Group ${outcome.group ?? ''} · ${outcome.matchId}`
              : ROUND_LABELS[outcome.round ?? 'R32']}
          </span>
          {outcome.utcDate && (
            <span className="font-semibold">{formatMatchTime(outcome.utcDate)}</span>
          )}
        </div>
        <div className="space-y-1">
          <TeamRow code={outcome.homeCode} score={showScore ? homeScore : null} flagUrl={homeFlag} />
          <TeamRow code={outcome.awayCode} score={showScore ? awayScore : null} flagUrl={awayFlag} />
        </div>
        {label && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] flex-wrap">
            <span className="text-neutral-500 font-bold uppercase tracking-wider">Your pick:</span>
            <span className={`font-semibold ${
              outcome.state === 'hit' ? 'text-wc-green' : outcome.state === 'miss' ? 'text-wc-red' : 'text-neutral-300'
            }`}>{label}</span>
            {active && maxPoints > 0 && (
              <>
                <span className="text-neutral-700">·</span>
                <span className="font-bold text-primary/80">Max +{maxPoints}</span>
              </>
            )}
          </div>
        )}
      </div>
      <div className="flex-shrink-0">
        <StateBadge state={outcome.state} points={outcome.points} status={outcome.status} />
      </div>
    </div>
  );
}

interface RankInfo {
  rank: number;
  total: number;
  gap: number; // points behind leader (or, if rank===1, points ahead of #2)
  leaderName: string | null;
}

function RankLine({ info, onNavigate }: { info: RankInfo; onNavigate: (tab: TabId) => void }) {
  const { rank, total, gap, leaderName } = info;
  let detail: React.ReactNode;
  if (rank === 1) {
    detail = total === 1
      ? <span className="text-neutral-400">You&apos;re the only one on the board</span>
      : gap > 0
        ? <><span className="text-wc-green font-black">+{gap}</span> <span className="text-neutral-400">ahead of #2</span></>
        : <span className="text-neutral-400">Tied for the lead</span>;
  } else {
    detail = (
      <>
        <span className="text-wc-amber font-black">{gap}</span>
        <span className="text-neutral-400">{' '}pts behind {leaderName ?? 'leader'}</span>
      </>
    );
  }
  return (
    <button
      onClick={() => onNavigate('ranking')}
      className="w-full px-4 py-2 border-t border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors flex items-center justify-between gap-2 text-left"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="material-symbols-outlined text-primary text-[16px] font-variation-fill">leaderboard</span>
        <span className="text-[12px] font-bold text-neutral-100 font-body">
          You&apos;re <span className="text-primary font-black">#{rank}</span>
          <span className="text-neutral-500"> of {total}</span>
          <span className="text-neutral-600 mx-1.5">·</span>
          {detail}
        </span>
      </div>
      <span className="material-symbols-outlined text-neutral-500 text-[14px]">chevron_right</span>
    </button>
  );
}

type ChampionStatus = 'confirmed' | 'alive' | 'eliminated' | 'awaiting';

interface StakeInfo {
  championStatus: ChampionStatus;
  championCode: string | null;
  r16Alive: number;
  r16Total: number;
  showR16: boolean;
}

function StakeStrip({ stake, flagsByCode }: { stake: StakeInfo; flagsByCode: Record<string, string> }) {
  const { championStatus, championCode, r16Alive, r16Total, showR16 } = stake;
  const team = championCode ? teamsByCode[championCode] : null;
  const flagUrl = championCode ? flagsByCode[championCode] : undefined;

  const championPill = (() => {
    if (!championCode || !team) return null;
    const tone = championStatus === 'confirmed' ? 'wc-green'
      : championStatus === 'alive' ? 'wc-green'
      : championStatus === 'eliminated' ? 'wc-red'
      : 'neutral';
    const ring = tone === 'wc-green' ? 'border-wc-green/30 bg-wc-green/5'
      : tone === 'wc-red' ? 'border-wc-red/30 bg-wc-red/5'
      : 'border-white/10 bg-white/[0.02]';
    const dot = tone === 'wc-green' ? 'bg-wc-green'
      : tone === 'wc-red' ? 'bg-wc-red'
      : 'bg-neutral-500';
    const label = championStatus === 'confirmed' ? 'Champion confirmed'
      : championStatus === 'alive' ? 'Still alive'
      : championStatus === 'eliminated' ? 'Eliminated'
      : 'Awaiting knockouts';
    const labelTone = tone === 'wc-green' ? 'text-wc-green'
      : tone === 'wc-red' ? 'text-wc-red'
      : 'text-neutral-400';
    return (
      <div className={`flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${ring}`}>
        {flagUrl ? (
          <img src={flagUrl} alt="" className="w-7 h-5 object-cover rounded-sm flex-shrink-0" />
        ) : (
          <span className="text-xl leading-none flex-shrink-0">{team.flag}</span>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-neutral-500">Champion</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-sm font-black text-white truncate">{team.name}</span>
            <span className={`size-1.5 rounded-full ${dot} ${championStatus === 'alive' ? 'animate-pulse' : ''}`} />
          </div>
          <div className={`text-[10px] font-bold uppercase tracking-wider ${labelTone}`}>{label}</div>
        </div>
      </div>
    );
  })();

  if (!championPill && !showR16) return null;

  return (
    <div className="flex items-stretch gap-2">
      {championPill}
      {showR16 && (
        <div className="flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.02]">
          <span className="material-symbols-outlined text-blue-400 text-[20px] font-variation-fill flex-shrink-0">account_tree</span>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-neutral-500">Bracket alive</div>
            <div className="text-sm font-black text-white tabular-nums mt-0.5">
              {r16Alive}<span className="text-neutral-500 text-xs font-bold">/{r16Total}</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">R16 picks</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Dashboard({
  totalPoints,
  groupCorrect,
  groupTotal,
  knockoutPoints,
  pointsToday,
  activeCount,
  settledCount,
  maxRemaining,
  hasAnyResults,
  rankInfo,
  onOpenBreakdown,
  onNavigate,
}: {
  totalPoints: number;
  groupCorrect: number;
  groupTotal: number;
  knockoutPoints: number;
  pointsToday: number;
  activeCount: number;
  settledCount: number;
  maxRemaining: number;
  hasAnyResults: boolean;
  rankInfo: RankInfo | null;
  onOpenBreakdown: () => void;
  onNavigate: (tab: TabId) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/80 overflow-hidden">
      <div className="px-4 py-4 flex items-end justify-between">
        <div>
          <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">Total Points</div>
          <div className="text-4xl font-black text-primary tabular-nums leading-tight">{totalPoints}</div>
        </div>
        {pointsToday > 0 && (
          <div className="text-right">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Today</div>
            <div className="text-lg font-black text-wc-green tabular-nums leading-tight">+{pointsToday}</div>
          </div>
        )}
        {pointsToday === 0 && maxRemaining > 0 && (
          <div className="text-right">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Max Left</div>
            <div className="text-lg font-black text-primary tabular-nums leading-tight">+{maxRemaining}</div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 border-t border-white/10 text-center">
        <div className="py-2.5 border-r border-white/10">
          <div className="text-base font-black text-wc-green tabular-nums">{activeCount}</div>
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Active</div>
        </div>
        <div className="py-2.5 border-r border-white/10">
          <div className="text-base font-black text-blue-400 tabular-nums">{settledCount}</div>
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Settled</div>
        </div>
        <div className="py-2.5">
          <div className="text-base font-black text-neutral-200 tabular-nums">+{maxRemaining}</div>
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Max Left</div>
        </div>
      </div>
      <div className="grid grid-cols-2 border-t border-white/10 text-center bg-white/[0.015]">
        <div className="py-2 border-r border-white/10">
          <div className="text-xs font-black text-wc-green tabular-nums">{groupCorrect}/{groupTotal}</div>
          <div className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Groups</div>
        </div>
        <div className="py-2">
          <div className="text-xs font-black text-blue-400 tabular-nums">{knockoutPoints}</div>
          <div className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Knockout pts</div>
        </div>
      </div>
      {rankInfo && <RankLine info={rankInfo} onNavigate={onNavigate} />}
      <button
        onClick={onOpenBreakdown}
        disabled={!hasAnyResults}
        className="w-full px-4 py-2.5 border-t border-white/10 text-[12px] font-bold text-primary hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
      >
        <span className="material-symbols-outlined text-[16px]">bar_chart</span>
        View full breakdown
      </button>
    </div>
  );
}

export default function TrackerView({ liveMatches, teamFlagsByCode, onNavigate }: Props) {
  const { user } = useAuth();
  const { prediction: active, loading: loadingActive } = useActivePrediction();
  const { perMatch, summary, bracket, predicted, actual, hasSignal } = usePredictionResults(active, liveMatches);
  const [trackerTab, setTrackerTab] = useState<TrackerTabId>('active');
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Leaderboard + predictions fan-out — used for the rank line and pre-tournament social snapshot.
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [predictionsLockedCount, setPredictionsLockedCount] = useState<number>(0);
  const [championAdoptionCount, setChampionAdoptionCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      fetch('/api/leaderboard').then(r => r.json()).catch(() => ({ leaderboard: [] })),
      fetch('/api/leaderboard/predictions').then(r => r.json()).catch(() => ({ predictions: [], total_users: 0 })),
    ]).then(([lbData, predData]: [{ leaderboard?: LeaderboardEntry[] }, { predictions?: LeaderboardPrediction[]; total_users?: number }]) => {
      if (cancelled) return;
      const entries = lbData.leaderboard ?? [];
      const preds = predData.predictions ?? [];
      setLeaderboard(entries);
      setTotalUsers(predData.total_users ?? preds.length);
      setPredictionsLockedCount(preds.length);
      if (active?.champion_code) {
        const same = preds.filter(p => p.champion_code === active.champion_code).length;
        setChampionAdoptionCount(same);
      }
    });
    return () => { cancelled = true; };
  }, [user, active?.champion_code]);

  // Eliminated teams: lost a finished knockout match. Drives the stake-alive strip.
  const eliminatedTeams = useMemo(() => {
    const set = new Set<string>();
    for (const m of bracket) {
      const live = liveMatches[m.id];
      if (!live || live.status !== 'FINISHED' || !live.actualResult || !live.homeCode || !live.awayCode) continue;
      if (live.actualResult === 'home') set.add(live.awayCode);
      else if (live.actualResult === 'away') set.add(live.homeCode);
    }
    return set;
  }, [bracket, liveMatches]);

  const stakeInfo = useMemo<StakeInfo>(() => {
    const championCode = active?.champion_code ?? null;
    let championStatus: ChampionStatus;
    if (!championCode) {
      championStatus = 'awaiting';
    } else if (actual.finalWinner && actual.finalWinner === championCode) {
      championStatus = 'confirmed';
    } else if (eliminatedTeams.has(championCode)) {
      championStatus = 'eliminated';
    } else if (hasSignal.R32) {
      championStatus = 'alive';
    } else {
      championStatus = 'awaiting';
    }

    let r16Alive = 0;
    for (const code of predicted.R16) if (!eliminatedTeams.has(code)) r16Alive++;

    return {
      championStatus,
      championCode,
      r16Alive,
      r16Total: predicted.R16.size,
      // Only useful once any knockout match has finished
      showR16: hasSignal.R32 && predicted.R16.size > 0,
    };
  }, [active?.champion_code, predicted.R16, eliminatedTeams, actual.finalWinner, hasSignal.R32]);

  const rankInfo = useMemo<RankInfo | null>(() => {
    if (!user || leaderboard.length === 0) return null;
    const idx = leaderboard.findIndex(e => e.user_id === user.id);
    if (idx === -1) return null;
    const me = leaderboard[idx];
    const rank = idx + 1;
    if (rank === 1) {
      const next = leaderboard[1];
      const gap = next ? me.total_points - next.total_points : 0;
      return { rank, total: leaderboard.length, gap, leaderName: null };
    }
    const leader = leaderboard[0];
    return {
      rank,
      total: leaderboard.length,
      gap: leader.total_points - me.total_points,
      leaderName: leader.display_name,
    };
  }, [user, leaderboard]);

  const outcomes = useMemo(() => Object.values(perMatch), [perMatch]);
  const activeCount = useMemo(() => outcomes.filter(isActiveOutcome).length, [outcomes]);
  const settledCount = useMemo(() => outcomes.filter(isSettledOutcome).length, [outcomes]);
  const maxRemaining = useMemo(
    () => outcomes.reduce((sum, outcome) => (
      isActiveOutcome(outcome) ? sum + maxPointsForOutcome(outcome) : sum
    ), 0),
    [outcomes],
  );
  const filteredOutcomes = useMemo(
    () => outcomes.filter(o => matchesTrackerTab(o, trackerTab)),
    [outcomes, trackerTab],
  );
  const groupedByDate = useMemo(() => groupItemsByDate(filteredOutcomes), [filteredOutcomes]);

  // For each date group, compute its hits/points so the section header can show "+N pts"
  const groupStats = useMemo(() => {
    return groupedByDate.map(g => ({
      ...g,
      points: g.items.reduce((sum, o) => sum + o.points, 0),
      hits: g.items.filter(o => o.state === 'hit').length,
    }));
  }, [groupedByDate]);

  // Self-view modal prediction (LeaderboardPrediction shape)
  const selfLeaderboardPred = useMemo<LeaderboardPrediction | null>(() => {
    if (!active || !user) return null;
    return {
      prediction_number: active.prediction_number,
      name: active.name,
      user_id: user.id,
      display_name: user.display_name ?? 'You',
      champion_code: active.champion_code,
      group_matches: active.group_matches ?? {},
      knockout_matches: active.knockout_matches ?? {},
      group_tiebreakers: active.group_tiebreakers ?? {},
      third_place_tiebreaker: active.third_place_tiebreaker,
      is_approved: active.is_approved ?? false,
      created_at: active.created_at,
      updated_at: active.updated_at,
    };
  }, [active, user]);

  // ── Empty states ──
  if (!user) {
    return (
      <div className="pt-8 pb-12 px-4 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
          <span className="material-symbols-outlined text-primary text-3xl">event_available</span>
        </div>
        <h2 className="text-xl font-black mb-2">Track your predictions live</h2>
        <p className="text-sm text-neutral-400 font-body leading-relaxed max-w-[300px] mb-6">
          Sign in to see which of your picks are landing as the tournament unfolds.
        </p>
        <button
          onClick={() => onNavigate('profile')}
          className="px-5 py-3 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors"
        >
          Go to profile
        </button>
      </div>
    );
  }

  if (loadingActive) {
    return (
      <div className="pt-8 pb-12 px-4 flex flex-col items-center text-center">
        <span className="material-symbols-outlined text-neutral-500 animate-spin">progress_activity</span>
        <p className="text-sm text-neutral-500 mt-2 font-body">Loading your prediction…</p>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="pt-8 pb-12 px-4 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
          <span className="material-symbols-outlined text-primary text-3xl">emoji_events</span>
        </div>
        <h2 className="text-xl font-black mb-2">No active prediction</h2>
        <p className="text-sm text-neutral-400 font-body leading-relaxed max-w-[300px] mb-6">
          Make a prediction to start tracking your picks against live results.
        </p>
        <button
          onClick={() => onNavigate('groups')}
          className="px-5 py-3 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors"
        >
          Start predicting
        </button>
      </div>
    );
  }

  // Pre-tournament: replace the bland empty state with a rich Prediction-Locked view.
  if (!summary.hasAnyResults) {
    return (
      <>
        <PredictionLockedView
          active={active}
          liveMatches={liveMatches}
          teamFlagsByCode={teamFlagsByCode}
          totalUsers={totalUsers}
          predictionsLockedCount={predictionsLockedCount}
          championAdoptionCount={championAdoptionCount}
          onOpenBreakdown={() => setShowBreakdown(true)}
          onNavigate={onNavigate}
        />
        {showBreakdown && selfLeaderboardPred && (
          <UserPredictionsModal
            prediction={selfLeaderboardPred}
            onClose={() => setShowBreakdown(false)}
            liveMatches={liveMatches}
            teamFlagsByCode={teamFlagsByCode}
          />
        )}
      </>
    );
  }

  const showStakeStrip = stakeInfo.championCode !== null && (stakeInfo.championStatus !== 'awaiting' || stakeInfo.showR16);

  return (
    <div className="pt-2 pb-12 space-y-4">
      {showStakeStrip && (
        <div className="px-4">
          <StakeStrip stake={stakeInfo} flagsByCode={teamFlagsByCode} />
        </div>
      )}

      <div className="px-4">
        <Dashboard
          totalPoints={summary.totalPoints}
          groupCorrect={summary.groupCorrect}
          groupTotal={summary.groupTotal}
          knockoutPoints={summary.knockoutPoints}
          pointsToday={summary.pointsToday}
          activeCount={activeCount}
          settledCount={settledCount}
          maxRemaining={maxRemaining}
          hasAnyResults={summary.hasAnyResults}
          rankInfo={rankInfo}
          onOpenBreakdown={() => setShowBreakdown(true)}
          onNavigate={onNavigate}
        />
      </div>

      <div className="px-4">
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/[0.025] p-1">
          {TRACKER_TABS.map(tab => {
            const isActive = trackerTab === tab.id;
            const count = tab.id === 'active' ? activeCount : tab.id === 'settled' ? settledCount : outcomes.length;
            return (
              <button
                key={tab.id}
                onClick={() => setTrackerTab(tab.id)}
                className={`min-w-0 px-2 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors font-body ${
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
      </div>

      {groupStats.length === 0 ? (
        <div className="px-4">
          <div className="rounded-2xl border border-white/10 bg-neutral-900/40 px-4 py-6 text-center">
            <span className="material-symbols-outlined text-neutral-500 text-3xl">filter_alt_off</span>
            <p className="text-xs text-neutral-500 font-body mt-2">
              {trackerTab === 'active' ? 'No active picks right now.' : 'Nothing to show here yet.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {groupStats.map(g => (
            <div key={g.dayKey}>
              <div className="px-4 sm:px-5 pt-1 pb-1.5 flex items-center justify-between sticky top-0 z-10 bg-background-dark">
                <span className="text-[11px] font-black text-white/60 uppercase tracking-widest">{g.label}</span>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide tabular-nums">
                  {g.items.length} {g.items.length === 1 ? 'match' : 'matches'}
                  {g.points > 0 && <span className="text-wc-green ml-1.5">+{g.points} pts</span>}
                </span>
              </div>
              <div className="mx-4 bg-neutral-900/50 rounded-xl border border-white/5 overflow-hidden">
                {g.items.map(o => (
                  <MatchRow key={o.matchId} outcome={o} flagsByCode={teamFlagsByCode} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showBreakdown && selfLeaderboardPred && (
        <UserPredictionsModal
          prediction={selfLeaderboardPred}
          onClose={() => setShowBreakdown(false)}
          liveMatches={liveMatches}
          teamFlagsByCode={teamFlagsByCode}
        />
      )}
    </div>
  );
}
