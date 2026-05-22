'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LiveMatch, SavedPrediction, TabId } from '@/types';
import { teamsByCode } from '@/data/teams';
import { allGroupMatches } from '@/data/matches';
import { TOURNAMENT_KICKOFF } from '@/data/tournament';

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

function CountTile({ value, label }: { value: number | null; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center">
      <span className="font-display text-[36px] font-black leading-none tabular-nums text-primary drop-shadow-[0_2px_14px_rgba(249,212,6,0.24)]">
        {value === null ? '--' : String(value).padStart(2, '0')}
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
  // Find the earliest scheduled match. Fall back to the official kickoff.
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
    return TOURNAMENT_KICKOFF.getTime();
  }, [firstMatch?.utcDate]);

  const [timeLeft, setTimeLeft] = useState<TimeRemaining | null>(null);
  const [clockReady, setClockReady] = useState(false);
  useEffect(() => {
    const updateClock = () => {
      setTimeLeft(diffToParts(targetMs));
      setClockReady(true);
    };
    updateClock();
    const id = window.setInterval(updateClock, 1000);
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

  const startedAlready = clockReady && !timeLeft;

  return (
    <div className="px-4 pb-12 pt-2">
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(245,197,66,0.14)_0%,rgba(15,23,42,0.96)_28%,rgba(5,7,13,0.98)_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-accent/5 blur-3xl"
        />

        <div className="relative px-5 pb-5 pt-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px] font-variation-fill">lock</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Prediction locked in</span>
              </div>
              <h2 className="truncate text-3xl font-black leading-none text-white">
                {active.name || `Prediction #${active.prediction_number ?? ''}`}
              </h2>
              <p className="mt-2 max-w-[230px] font-body text-[12px] font-semibold leading-snug text-neutral-400">
                {startedAlready
                  ? 'Matches are about to kick off'
                  : firstMatch?.localMatchId
                    ? `First match — ${DATE_FORMATTER.format(new Date(firstMatch.utcDate))}`
                    : 'Counting down to Jun 11, 2026'}
              </p>
            </div>
            {active.is_approved ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-wc-green/30 bg-wc-green/10 px-3 py-1.5">
                <span className="material-symbols-outlined text-wc-green text-[14px] font-variation-fill">check_circle</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-wc-green">Approved</span>
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-wc-amber/30 bg-wc-amber/10 px-3 py-1.5">
                <span className="material-symbols-outlined text-wc-amber text-[14px]">schedule</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-wc-amber">Pending review</span>
              </span>
            )}
          </div>

          {timeLeft || !clockReady ? (
            <div className="grid grid-cols-4 divide-x divide-white/10 rounded-[20px] border border-white/10 bg-black/18 py-4 backdrop-blur">
              <CountTile value={timeLeft?.days ?? null} label="days" />
              <CountTile value={timeLeft?.hours ?? null} label="hrs" />
              <CountTile value={timeLeft?.minutes ?? null} label="min" />
              <CountTile value={timeLeft?.seconds ?? null} label="sec" />
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-[20px] border border-wc-green/20 bg-wc-green/10 px-4 py-4 text-wc-green">
              <span className="size-2 rounded-full bg-wc-green animate-pulse" />
              <span className="font-body text-sm font-black uppercase tracking-wider">Kick-off imminent</span>
            </div>
          )}
        </div>

        <div className="relative border-t border-white/10 px-5 py-5">
          <div className="absolute bottom-0 left-7 top-0 w-px bg-gradient-to-b from-primary/50 via-white/10 to-white/0" aria-hidden />
          <div className="relative flex gap-4">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10">
              <span className="material-symbols-outlined text-cup-gold text-[19px] font-variation-fill">emoji_events</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">Your champion</span>
                {championCode && championTeam ? (
                  <button
                    onClick={onOpenBreakdown}
                    className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-primary transition-colors hover:text-primary/80"
                  >
                    See path
                    <span className="material-symbols-outlined text-[15px]">chevron_right</span>
                  </button>
                ) : championAdoptionCount > 1 ? (
                  <span className="font-body text-[10px] font-bold text-neutral-500">
                    {championAdoptionCount - 1} other{championAdoptionCount - 1 === 1 ? '' : 's'} agree
                  </span>
                ) : null}
              </div>
              {championCode && championTeam ? (
                <div className="flex items-center gap-3">
                  <FlagChip code={championCode} flagUrl={championFlag} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-2xl font-black leading-none text-white">{championTeam.name}</div>
                    <div className="mt-1 font-body text-[11px] font-semibold text-neutral-500">FIFA #{championTeam.fifaRanking} · Group {championTeam.group}</div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => onNavigate('bracket')}
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <span className="font-body text-sm font-semibold text-neutral-300">Pick your champion to seal the prediction</span>
                  <span className="material-symbols-outlined text-[16px] text-primary">arrow_forward</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {championCode && championTeam ? (
          <div aria-hidden className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        ) : null}

        {firstGroupMatch && firstMatch && (
          <div className="relative px-5 py-5">
            <div className="absolute bottom-0 left-7 top-0 w-px bg-gradient-to-b from-white/10 via-white/10 to-white/0" aria-hidden />
            <div className="relative flex gap-4">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                <span className="material-symbols-outlined text-primary text-[19px]">sports_soccer</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">First match</span>
                  <span className="whitespace-nowrap font-body text-[10px] font-bold tabular-nums text-neutral-500">
                    {DATE_FORMATTER.format(new Date(firstMatch.utcDate))}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FlagChip code={firstGroupMatch.home} flagUrl={firstMatch.homeCode ? teamFlagsByCode[firstMatch.homeCode] : undefined} />
                    <span className="truncate font-body text-sm font-semibold text-neutral-100">
                      {teamsByCode[firstGroupMatch.home]?.name ?? firstGroupMatch.home}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FlagChip code={firstGroupMatch.away} flagUrl={firstMatch.awayCode ? teamFlagsByCode[firstMatch.awayCode] : undefined} />
                    <span className="truncate font-body text-sm font-semibold text-neutral-100">
                      {teamsByCode[firstGroupMatch.away]?.name ?? firstGroupMatch.away}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Your pick</span>
                  {firstMatchPick ? (
                    <div className="flex min-w-0 items-center gap-1.5">
                      {firstMatchPick === 'draw' ? (
                        <span className="text-sm font-black text-neutral-200">Draw</span>
                      ) : (
                        <>
                          <FlagChip code={firstMatchPickedTeamCode} flagUrl={firstMatchPickedTeamCode ? teamFlagsByCode[firstMatchPickedTeamCode] : undefined} size="sm" />
                          <span className="truncate text-sm font-black text-primary">{firstMatchPickedTeam?.name ?? firstMatchPickedTeamCode}</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => onNavigate('groups')}
                      className="whitespace-nowrap text-[11px] font-bold text-primary transition-colors hover:text-primary/80"
                    >
                      Pick winner
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {totalUsers > 0 && (
          <button
            onClick={() => onNavigate('ranking')}
            className="relative flex w-full items-center gap-3 border-t border-white/10 bg-white/[0.025] px-5 py-4 text-left transition-colors hover:bg-white/[0.04]"
          >
            <span className="material-symbols-outlined text-neutral-400 text-[20px]">groups</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-neutral-100">
                {predictionsLockedCount} {predictionsLockedCount === 1 ? 'prediction' : 'predictions'} locked in
              </div>
              {championAdoptionCount > 0 && championTeam && (
                <div className="mt-0.5 truncate font-body text-[11px] font-semibold text-neutral-500">
                  {championAdoptionCount === 1
                    ? `You're the only one picking ${championTeam.name}`
                    : `${championAdoptionCount} of ${predictionsLockedCount} picked ${championTeam.name}`}
                </div>
              )}
            </div>
            <span className="material-symbols-outlined text-primary text-[18px]">chevron_right</span>
          </button>
        )}
      </section>

      <p className="pt-5 text-center font-body text-[11px] font-semibold text-neutral-500">
        Your picks will start scoring as matches finish.
      </p>
    </div>
  );
}
