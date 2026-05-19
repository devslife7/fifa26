'use client';

import { useMemo, useState } from 'react';
import type { LiveMatch, MatchResult, KnockoutResult, KnockoutRound, TabId, LeaderboardPrediction } from '@/types';
import { teamsByCode } from '@/data/teams';
import { useActivePrediction } from '@/hooks/useActivePrediction';
import { usePredictionResults, type PerMatchOutcome, type MatchOutcomeState } from '@/hooks/usePredictionResults';
import { groupItemsByDate, formatMatchTime } from '@/lib/utils/match-dates';
import { useAuth } from '@/components/providers/AuthProvider';
import UserPredictionsModal from '@/components/ranking/UserPredictionsModal';

const ROUND_LABELS: Record<KnockoutRound, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-final',
  SF: 'Semi-final',
  '3RD': 'Third-place',
  FIN: 'Final',
};

type FilterId = 'all' | 'correct' | 'wrong' | 'pending' | 'upcoming';

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'correct', label: 'Correct' },
  { id: 'wrong', label: 'Wrong' },
  { id: 'pending', label: 'Pending' },
  { id: 'upcoming', label: 'Upcoming' },
];

interface Props {
  liveMatches: Record<string, LiveMatch>;
  teamFlagsByCode: Record<string, string>;
  onNavigate: (tab: TabId) => void;
}

function matchesFilter(state: MatchOutcomeState, status: PerMatchOutcome['status'], filter: FilterId): boolean {
  if (filter === 'all') return true;
  if (filter === 'correct') return state === 'hit';
  if (filter === 'wrong') return state === 'miss';
  if (filter === 'pending') return status === 'IN_PLAY' || status === 'PAUSED' || state === 'pending';
  if (filter === 'upcoming') return state === 'upcoming';
  return true;
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

function StateBadge({ state, points }: { state: MatchOutcomeState; points: number }) {
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
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
            <span className="text-neutral-500 font-bold uppercase tracking-wider">Pick:</span>
            <span className={`font-semibold ${
              outcome.state === 'hit' ? 'text-wc-green' : outcome.state === 'miss' ? 'text-wc-red' : 'text-neutral-300'
            }`}>{label}</span>
          </div>
        )}
      </div>
      <div className="flex-shrink-0">
        <StateBadge state={outcome.state} points={outcome.points} />
      </div>
    </div>
  );
}

function Dashboard({
  totalPoints, groupCorrect, groupTotal, knockoutPoints, pendingCount, pointsToday, hasAnyResults, onOpenBreakdown,
}: {
  totalPoints: number;
  groupCorrect: number;
  groupTotal: number;
  knockoutPoints: number;
  pendingCount: number;
  pointsToday: number;
  hasAnyResults: boolean;
  onOpenBreakdown: () => void;
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
      </div>
      <div className="grid grid-cols-3 border-t border-white/10 text-center">
        <div className="py-2.5 border-r border-white/10">
          <div className="text-base font-black text-wc-green tabular-nums">{groupCorrect}/{groupTotal}</div>
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Groups</div>
        </div>
        <div className="py-2.5 border-r border-white/10">
          <div className="text-base font-black text-blue-400 tabular-nums">{knockoutPoints}</div>
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Knockout</div>
        </div>
        <div className="py-2.5">
          <div className="text-base font-black text-neutral-200 tabular-nums">{pendingCount}</div>
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Pending</div>
        </div>
      </div>
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
  const { perMatch, summary } = usePredictionResults(active, liveMatches);
  const [filter, setFilter] = useState<FilterId>('all');
  const [showBreakdown, setShowBreakdown] = useState(false);

  const outcomes = useMemo(() => Object.values(perMatch), [perMatch]);
  const filteredOutcomes = useMemo(
    () => outcomes.filter(o => matchesFilter(o.state, o.status, filter)),
    [outcomes, filter],
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

  return (
    <div className="pt-2 pb-12 space-y-4">
      <div className="px-4">
        <Dashboard
          totalPoints={summary.totalPoints}
          groupCorrect={summary.groupCorrect}
          groupTotal={summary.groupTotal}
          knockoutPoints={summary.knockoutPoints}
          pendingCount={summary.pendingCount}
          pointsToday={summary.pointsToday}
          hasAnyResults={summary.hasAnyResults}
          onOpenBreakdown={() => setShowBreakdown(true)}
        />
      </div>

      <div className="px-4">
        <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 no-scrollbar">
          {FILTERS.map(f => {
            const isActive = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors font-body ${
                  isActive
                    ? 'bg-primary text-black'
                    : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-200'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {!summary.hasAnyResults ? (
        <div className="px-4">
          <div className="rounded-2xl border border-white/10 bg-neutral-900/40 px-4 py-6 text-center">
            <span className="material-symbols-outlined text-neutral-500 text-3xl">sports_soccer</span>
            <h3 className="font-black text-sm mt-2">The tournament hasn&apos;t kicked off yet</h3>
            <p className="text-xs text-neutral-500 font-body mt-1">
              Your picks will start scoring as matches finish.
            </p>
          </div>
        </div>
      ) : groupStats.length === 0 ? (
        <div className="px-4">
          <div className="rounded-2xl border border-white/10 bg-neutral-900/40 px-4 py-6 text-center">
            <span className="material-symbols-outlined text-neutral-500 text-3xl">filter_alt_off</span>
            <p className="text-xs text-neutral-500 font-body mt-2">Nothing matches this filter.</p>
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
