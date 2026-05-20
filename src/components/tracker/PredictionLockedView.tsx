'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LiveMatch, SavedPrediction, TabId } from '@/types';
import { teamsByCode } from '@/data/teams';
import { allGroupMatches } from '@/data/matches';

const TOURNAMENT_START = new Date('2026-06-11T00:00:00Z');

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function diffToParts(targetMs: number): TimeRemaining | null {
  const diff = targetMs - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1_000) % 60),
  };
}

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function CountTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-0">
      <span className="font-display text-[34px] font-black leading-none tabular-nums text-primary drop-shadow-[0_2px_12px_rgba(249,212,6,0.22)]">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1.5 font-body text-[8px] font-black uppercase tracking-[0.22em] text-neutral-500">
        {label}
      </span>
    </div>
  );
}

function FlagChip({ code, flagUrl, size = 'md' }: { code: string | null; flagUrl?: string; size?: 'sm' | 'md' | 'lg' }) {
  if (!code) return null;
  const team = teamsByCode[code];
  const dim = { sm: 'w-5 h-3.5', md: 'w-7 h-5', lg: 'w-10 h-7' }[size];
  if (flagUrl) {
    return <img src={flagUrl} alt="" className={`${dim} object-cover rounded-sm flex-shrink-0`} />;
  }
  return <span className={`${size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-base'} leading-none flex-shrink-0`}>{team?.flag ?? ''}</span>;
}

interface Props {
  active: SavedPrediction;
  liveMatches: Record<string, LiveMatch>;
  teamFlagsByCode: Record<string, string>;
  totalUsers: number;
  predictionsLockedCount: number;
  championAdoptionCount: number;
  onOpenBreakdown: () => void;
  onNavigate: (tab: TabId) => void;
}

export default function PredictionLockedView({
  active,
  liveMatches,
  teamFlagsByCode,
  totalUsers,
  predictionsLockedCount,
  championAdoptionCount,
  onOpenBreakdown,
  onNavigate,
}: Props) {
  // Find the earliest scheduled match. Fall back to TOURNAMENT_START.
  const firstMatch = useMemo<LiveMatch | null>(() => {
    const entries = Object.values(liveMatches);
    const scheduled = entries
      .filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED')
      .sort((a, b) => a.utcDate.localeCompare(b.utcDate));
    return scheduled[0] ?? null;
  }, [liveMatches]);

  const targetMs = useMemo(() => {
    if (firstMatch?.utcDate) {
      const t = new Date(firstMatch.utcDate).getTime();
      if (!Number.isNaN(t)) return t;
    }
    return TOURNAMENT_START.getTime();
  }, [firstMatch?.utcDate]);

  const [timeLeft, setTimeLeft] = useState<TimeRemaining | null>(() => diffToParts(targetMs));
  useEffect(() => {
    setTimeLeft(diffToParts(targetMs));
    const id = window.setInterval(() => setTimeLeft(diffToParts(targetMs)), 1000);
    return () => window.clearInterval(id);
  }, [targetMs]);

  const championCode = active.champion_code;
  const championTeam = championCode ? teamsByCode[championCode] : null;
  const championFlag = championCode ? teamFlagsByCode[championCode] : undefined;

  // First match: find the matching GroupMatch from data, and the user's pick.
  const firstGroupMatch = useMemo(() => {
    if (!firstMatch?.localMatchId) return null;
    return allGroupMatches.find(m => m.id === firstMatch.localMatchId) ?? null;
  }, [firstMatch?.localMatchId]);

  const firstMatchPick = firstGroupMatch ? active.group_matches?.[firstGroupMatch.id] : undefined;
  const firstMatchPickedTeamCode =
    firstMatchPick === 'home' ? firstGroupMatch?.home ?? null :
    firstMatchPick === 'away' ? firstGroupMatch?.away ?? null :
    firstMatchPick === 'draw' ? 'DRAW' : null;
  const firstMatchPickedTeam =
    firstMatchPickedTeamCode && firstMatchPickedTeamCode !== 'DRAW' ? teamsByCode[firstMatchPickedTeamCode] : null;

  const startedAlready = !timeLeft;

  return (
    <div className="pt-2 pb-12 px-4 space-y-4">
      {/* Hero: lock confirmation + countdown */}
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/10 via-neutral-900 to-neutral-900">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_50%_0%,rgba(249,212,6,0.22),transparent_70%)]"
        />
        <div className="relative px-4 pt-4 pb-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="material-symbols-outlined text-primary text-[16px] font-variation-fill">lock</span>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Prediction locked in</span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-black text-white truncate">
                {active.name || `Prediction #${active.prediction_number ?? ''}`}
              </h2>
              <p className="text-[11px] font-semibold text-neutral-400 font-body">
                {startedAlready
                  ? 'Matches are about to kick off'
                  : firstMatch?.localMatchId
                    ? `First match — ${DATE_FORMATTER.format(new Date(firstMatch.utcDate))}`
                    : 'Counting down to Jun 11, 2026'}
              </p>
            </div>
            {active.is_approved ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-wc-green/10 border border-wc-green/30">
                <span className="material-symbols-outlined text-wc-green text-[12px] font-variation-fill">check_circle</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-wc-green">Approved</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-wc-amber/10 border border-wc-amber/30">
                <span className="material-symbols-outlined text-wc-amber text-[12px]">schedule</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-wc-amber">Pending review</span>
              </span>
            )}
          </div>
        </div>

        {/* Countdown */}
        {timeLeft ? (
          <div className="relative grid grid-cols-4 gap-1 px-4 pb-4">
            <CountTile value={timeLeft.days} label="days" />
            <CountTile value={timeLeft.hours} label="hrs" />
            <CountTile value={timeLeft.minutes} label="min" />
            <CountTile value={timeLeft.seconds} label="sec" />
          </div>
        ) : (
          <div className="px-4 pb-4 flex items-center justify-center gap-2 text-wc-green">
            <span className="size-2 rounded-full bg-wc-green animate-pulse" />
            <span className="font-body text-sm font-black uppercase tracking-wider">Kick-off imminent</span>
          </div>
        )}
      </section>

      {/* Champion */}
      <section className="rounded-2xl border border-white/10 bg-neutral-900/80 overflow-hidden">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-cup-gold text-[16px] font-variation-fill">emoji_events</span>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">Your champion</span>
          </div>
          {championAdoptionCount > 1 && (
            <span className="text-[10px] font-bold text-neutral-500 font-body">
              {championAdoptionCount - 1} other{championAdoptionCount - 1 === 1 ? '' : 's'} agree
            </span>
          )}
        </div>
        {championCode && championTeam ? (
          <div className="px-4 pb-4 flex items-center gap-3">
            <FlagChip code={championCode} flagUrl={championFlag} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="text-xl font-black text-white truncate">{championTeam.name}</div>
              <div className="text-[11px] font-semibold text-neutral-500 font-body">FIFA #{championTeam.fifaRanking} · Group {championTeam.group}</div>
            </div>
            <button
              onClick={onOpenBreakdown}
              className="text-[11px] font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              See full path
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => onNavigate('bracket')}
            className="w-full px-4 pb-4 flex items-center justify-between gap-2 text-left"
          >
            <span className="text-sm font-semibold text-neutral-300">Pick your champion to seal the prediction</span>
            <span className="material-symbols-outlined text-[16px] text-primary">arrow_forward</span>
          </button>
        )}
      </section>

      {/* First match preview */}
      {firstGroupMatch && firstMatch && (
        <section className="rounded-2xl border border-white/10 bg-neutral-900/80 overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[16px]">sports_soccer</span>
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">First match</span>
            </div>
            <span className="text-[10px] font-bold text-neutral-500 font-body tabular-nums">
              {DATE_FORMATTER.format(new Date(firstMatch.utcDate))}
            </span>
          </div>
          <div className="px-4 pb-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <FlagChip code={firstGroupMatch.home} flagUrl={firstMatch.homeCode ? teamFlagsByCode[firstMatch.homeCode] : undefined} />
              <span className="text-sm font-semibold text-neutral-100 font-body truncate">
                {teamsByCode[firstGroupMatch.home]?.name ?? firstGroupMatch.home}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FlagChip code={firstGroupMatch.away} flagUrl={firstMatch.awayCode ? teamFlagsByCode[firstMatch.awayCode] : undefined} />
              <span className="text-sm font-semibold text-neutral-100 font-body truncate">
                {teamsByCode[firstGroupMatch.away]?.name ?? firstGroupMatch.away}
              </span>
            </div>
          </div>
          <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between gap-2 bg-white/[0.02]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Your pick</span>
            {firstMatchPick ? (
              <div className="flex items-center gap-1.5">
                {firstMatchPick === 'draw' ? (
                  <span className="text-sm font-black text-neutral-200">Draw</span>
                ) : (
                  <>
                    <FlagChip code={firstMatchPickedTeamCode} flagUrl={firstMatchPickedTeamCode ? teamFlagsByCode[firstMatchPickedTeamCode] : undefined} size="sm" />
                    <span className="text-sm font-black text-primary">{firstMatchPickedTeam?.name ?? firstMatchPickedTeamCode}</span>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => onNavigate('groups')}
                className="text-[11px] font-bold text-primary hover:text-primary/80 transition-colors"
              >
                Pick a winner →
              </button>
            )}
          </div>
        </section>
      )}

      {/* Friends snapshot */}
      {totalUsers > 0 && (
        <section className="rounded-2xl border border-white/10 bg-neutral-900/40 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-neutral-400 text-[18px]">groups</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-neutral-100">
                {predictionsLockedCount} {predictionsLockedCount === 1 ? 'prediction' : 'predictions'} locked in
              </div>
              {championAdoptionCount > 0 && championTeam && (
                <div className="text-[11px] font-semibold text-neutral-500 font-body mt-0.5">
                  {championAdoptionCount === 1
                    ? `You're the only one picking ${championTeam.name}`
                    : `${championAdoptionCount} of ${predictionsLockedCount} picked ${championTeam.name}`}
                </div>
              )}
            </div>
            <button
              onClick={() => onNavigate('ranking')}
              className="text-[11px] font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-0.5"
            >
              See all
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </button>
          </div>
        </section>
      )}

      {/* Quiet hint */}
      <p className="text-center text-[11px] font-semibold text-neutral-500 font-body pt-1">
        Your picks will start scoring as matches finish.
      </p>
    </div>
  );
}
