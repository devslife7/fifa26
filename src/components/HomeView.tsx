'use client';

import { useState, useEffect, useRef } from 'react';
import { LiveMatch, SavedPrediction, TabId } from '@/types';
import { PredictionFlowState } from '@/lib/logic/prediction-flow';
import { teamsByCode } from '@/data/teams';
import NextMatchCard from '@/components/home/NextMatchCard';
import { TOURNAMENT_KICKOFF } from '@/data/tournament';
import { useAuth } from '@/components/providers/AuthProvider';
import AppFooter from '@/components/layout/AppFooter';

interface HomeViewProps {
  flowState: PredictionFlowState;
  teamFlagsByCode: Record<string, string>;
  liveMatch: LiveMatch | null;
  nextMatch: LiveMatch | null;
  hasSubmittedBefore: boolean;
  onNavigate: (tab: TabId) => void;
  onStartAgain: () => void;
}

type TimeRemaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type HomeAction = {
  label: string;
  detail: string;
  icon: string;
  target: TabId;
};

function getTimeRemaining(): TimeRemaining | null {
  const now = Date.now();
  const diff = TOURNAMENT_KICKOFF.getTime() - now;
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function getHomeAction(flowState: PredictionFlowState, hasSubmittedBefore: boolean): HomeAction {
  const { groupCount, championCode, nextPredictionTab } = flowState;

  if (hasSubmittedBefore && championCode) {
    return {
      label: 'Submitted',
      detail: 'Make changes and send a new submission.',
      icon: 'verified',
      target: nextPredictionTab,
    };
  }

  if (championCode) {
    return {
      label: 'Review & Submit',
      detail: 'Review and submit your champion.',
      icon: 'verified',
      target: nextPredictionTab,
    };
  }

  if (groupCount === 0) {
    return {
      label: 'Start My Picks',
      detail: 'Start with group-stage picks.',
      icon: 'emoji_events',
      target: nextPredictionTab,
    };
  }

  if (!flowState.groupsComplete) {
    return {
      label: 'Continue My Picks',
      detail: 'Finish group-stage picks.',
      icon: 'arrow_forward',
      target: nextPredictionTab,
    };
  }

  if (flowState.thirdPlaceRequired && !flowState.thirdPlaceComplete) {
    return {
      label: 'Resolve Tiebreaker',
      detail: 'Pick which third-place teams advance.',
      icon: 'swap_vert',
      target: nextPredictionTab,
    };
  }

  if (!flowState.bracketComplete) {
    return {
      label: 'Continue My Picks',
      detail: 'Build your knockout bracket.',
      icon: 'account_tree',
      target: nextPredictionTab,
    };
  }

  return {
    label: 'Review & Submit',
    detail: 'Prediction complete.',
    icon: 'verified',
    target: nextPredictionTab,
  };
}

function HeroCountUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center">
      <span className="font-display text-[34px] font-black leading-none tabular-nums text-cup-gold drop-shadow-[0_2px_12px_rgba(249,212,6,0.22)] sm:text-[38px]">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1.5 font-body text-[8px] font-black uppercase tracking-[0.24em] text-neutral-500">
        {label}
      </span>
    </div>
  );
}

const HERO_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

const OPENING_MATCH_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'America/Mexico_City',
});

const OPENING_MATCH_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/New_York',
});

const OPENING_MATCH_DATE_LINE = OPENING_MATCH_DATE_FORMATTER.format(TOURNAMENT_KICKOFF);
const OPENING_MATCH_SUBTITLE = `Estadio Azteca · Mexico City · ${OPENING_MATCH_TIME_FORMATTER.format(TOURNAMENT_KICKOFF)} EDT`;

function MatchupPanel({
  match,
  teamFlagsByCode,
  badge,
  isLive,
}: {
  match: LiveMatch;
  teamFlagsByCode: Record<string, string>;
  badge: 'live' | 'next';
  isLive: boolean;
}) {
  const homeFlag = (match.homeCode ? teamFlagsByCode[match.homeCode] : null) ?? match.homeFlag ?? null;
  const awayFlag = (match.awayCode ? teamFlagsByCode[match.awayCode] : null) ?? match.awayFlag ?? null;
  const homeLabel = match.homeShortName || (match.homeCode ? teamsByCode[match.homeCode]?.name ?? match.homeCode : match.homeName ?? '—');
  const awayLabel = match.awayShortName || (match.awayCode ? teamsByCode[match.awayCode]?.name ?? match.awayCode : match.awayName ?? '—');

  return (
    <div className="relative flex w-full items-center justify-center bg-gradient-to-b from-neutral-900 via-[#101010] to-[#0a0a0a] min-h-[260px] [height:calc(100svh-300px)] [max-height:560px] px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(249,212,6,0.18),transparent_60%)]"
      />

      <div className="absolute inset-x-4 top-4 flex items-center justify-between">
        <span className="font-body text-[9px] font-black uppercase tracking-[0.22em] text-neutral-500">
          {match.stage?.replace(/_/g, ' ').toLowerCase() ?? ''}
        </span>
        {badge === 'live' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-wc-green/30 bg-black/50 px-2.5 py-1 backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-wc-green animate-pulse" />
            <span className="font-body text-[9px] font-black uppercase tracking-[0.2em] text-wc-green">
              Live
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-black/50 px-2.5 py-1 backdrop-blur-md">
            <span className="font-body text-[9px] font-black uppercase tracking-[0.2em] text-primary">
              Up next
            </span>
          </span>
        )}
      </div>

      <div className="relative z-10 flex w-full max-w-[420px] items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-3">
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl bg-black/30 ring-1 ring-white/10">
            {homeFlag ? (
              <img src={homeFlag} alt={homeLabel} className="h-full w-full object-cover" />
            ) : (
              <span className="text-4xl">{match.homeCode ? teamsByCode[match.homeCode]?.flag ?? '' : '—'}</span>
            )}
          </div>
          <span className="truncate text-center text-sm font-black text-neutral-100">{homeLabel}</span>
        </div>

        <div className="shrink-0 text-center">
          {isLive && match.score ? (
            <span className="font-display text-[40px] font-black leading-none tabular-nums text-cup-gold drop-shadow-[0_2px_12px_rgba(249,212,6,0.22)]">
              {match.score.home}<span className="px-1 text-neutral-500">–</span>{match.score.away}
            </span>
          ) : (
            <span className="font-display text-[28px] font-black leading-none text-neutral-600">vs</span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-center gap-3">
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl bg-black/30 ring-1 ring-white/10">
            {awayFlag ? (
              <img src={awayFlag} alt={awayLabel} className="h-full w-full object-cover" />
            ) : (
              <span className="text-4xl">{match.awayCode ? teamsByCode[match.awayCode]?.flag ?? '' : '—'}</span>
            )}
          </div>
          <span className="truncate text-center text-sm font-black text-neutral-100">{awayLabel}</span>
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[24%] bg-gradient-to-t from-[#0a0a0a] to-transparent"
      />
    </div>
  );
}

function HomeHeader({
  timeLeft,
  liveMatch,
  nextMatch,
  teamFlagsByCode,
}: {
  timeLeft: TimeRemaining | null;
  liveMatch: LiveMatch | null;
  nextMatch: LiveMatch | null;
  teamFlagsByCode: Record<string, string>;
}) {
  const tournamentStarted = !timeLeft;
  const showLive = tournamentStarted && !!liveMatch;
  const showUpNext = tournamentStarted && !liveMatch && !!nextMatch;
  const fallback = tournamentStarted && !showLive && !showUpNext;

  const titleLine: string = showLive
    ? 'Live now'
    : showUpNext
      ? 'Up next'
      : OPENING_MATCH_DATE_LINE;
  const subtitleLine: string = showLive
    ? `${liveMatch!.venue ?? 'Match in progress'}`
    : showUpNext
      ? `${HERO_DATE_FORMATTER.format(new Date(nextMatch!.utcDate))}${nextMatch!.venue ? ` · ${nextMatch!.venue}` : ''}`
      : OPENING_MATCH_SUBTITLE;
  const statusPill: string = showLive
    ? 'Live'
    : tournamentStarted
      ? 'In Progress'
      : 'Counting Down';

  return (
    <section className="relative -mx-3 pb-3 sm:-mx-4 md:mx-0">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[55vh] bg-[radial-gradient(ellipse_at_50%_0%,rgba(249,212,6,0.22),rgba(249,212,6,0.05)_40%,transparent_72%)]"
      />

      <div className="relative mx-auto w-full sm:max-w-[440px] md:max-w-full">
        <div className="relative overflow-hidden shadow-[0_24px_60px_-24px_rgba(0,0,0,0.85)] sm:rounded-b-[32px]">
          {showLive && liveMatch ? (
            <MatchupPanel match={liveMatch} teamFlagsByCode={teamFlagsByCode} badge="live" isLive />
          ) : showUpNext && nextMatch ? (
            <MatchupPanel match={nextMatch} teamFlagsByCode={teamFlagsByCode} badge="next" isLive={false} />
          ) : (
            <>
              <img
                src="/images/promotional-image-hero.png"
                alt="FIFA World Cup 2026"
                className="block w-full object-cover object-[50%_15%] min-h-[260px] [height:calc(100svh-300px)] [max-height:560px]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent"
              />
              {fallback && (
                <div className="absolute inset-x-4 top-4 flex items-center justify-end">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-wc-green/30 bg-black/50 px-2.5 py-1 backdrop-blur-md">
                    <span className="size-1.5 rounded-full bg-wc-green animate-pulse" />
                    <span className="font-body text-[9px] font-black uppercase tracking-[0.2em] text-wc-green">
                      Live
                    </span>
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="relative mt-3 px-3 sm:px-4">
          <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] px-4 py-3 backdrop-blur-2xl shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
            />

            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-neutral-100">{titleLine}</p>
                <p className="mt-0.5 font-body text-[11px] font-semibold text-neutral-500">
                  {subtitleLine}
                </p>
              </div>
              <span className={`font-body text-[9px] font-black uppercase tracking-[0.2em] ${
                showLive ? 'text-wc-green' : 'text-primary/85'
              }`}>
                {statusPill}
              </span>
            </div>

            {timeLeft ? (
              <div className="grid grid-cols-4 gap-1">
                <HeroCountUnit value={timeLeft.days} label="days" />
                <HeroCountUnit value={timeLeft.hours} label="hrs" />
                <HeroCountUnit value={timeLeft.minutes} label="min" />
                <HeroCountUnit value={timeLeft.seconds} label="sec" />
              </div>
            ) : showLive && liveMatch ? (
              <div className="flex items-center justify-center gap-3 py-1">
                <span className="size-2 rounded-full bg-wc-green animate-pulse" />
                <span className="font-display text-[24px] font-black tabular-nums text-cup-gold">
                  {liveMatch.score?.home ?? 0}<span className="px-1 text-neutral-600">–</span>{liveMatch.score?.away ?? 0}
                </span>
              </div>
            ) : showUpNext && nextMatch ? (
              <div className="flex items-center justify-center gap-2 py-2">
                <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                <span className="font-body text-sm font-bold text-neutral-200">
                  Kickoff {HERO_DATE_FORMATTER.format(new Date(nextMatch.utcDate))}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 py-2">
                <span className="size-2 rounded-full bg-wc-green animate-pulse" />
                <span className="font-body text-sm font-bold text-neutral-200">
                  Tournament in progress
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function PrimaryAction({ action, onNavigate }: { action: HomeAction; onNavigate: (tab: TabId) => void }) {
  return (
    <button
      onClick={() => onNavigate(action.target)}
      className="group flex w-full items-center gap-3 rounded-[18px] bg-gradient-to-br from-primary to-primary-dark px-4 py-2.5 text-left shadow-[0_10px_30px_rgba(249,212,6,0.18)] transition-transform active:scale-[0.985]"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-black/10">
        <span className="material-symbols-outlined block translate-x-[1px] translate-y-[1px] text-[20px] leading-none text-black">
          {action.icon}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-black leading-tight text-black">{action.label}</span>
        <span className="block font-body text-[11px] font-bold leading-tight text-black/65">{action.detail}</span>
      </span>
      <span className="material-symbols-outlined text-[20px] leading-none text-black/60 transition-transform group-hover:translate-x-0.5">
        arrow_forward
      </span>
    </button>
  );
}

function StartAgainAction({
  onStartAgain,
  label = 'Clear predictions and start again',
  icon = 'restart_alt',
}: {
  onStartAgain: () => void;
  label?: string;
  icon?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-[16px] border border-white/10 bg-white/[0.035] px-4 py-2.5 font-body text-xs font-black text-neutral-200 transition-colors hover:bg-white/[0.06]"
      >
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
        {label}
      </button>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm"
          onClick={() => setConfirming(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white">Start again?</h3>
            <p className="mt-1 font-body text-sm leading-relaxed text-neutral-400">
              This clears the picks on this device and opens a fresh prediction. Saved submissions stay in your account.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-semibold text-neutral-200 transition-colors hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirming(false);
                  onStartAgain();
                }}
                className="flex-1 rounded-lg bg-wc-red py-2.5 text-sm font-semibold text-white transition-colors hover:bg-wc-red/90"
              >
                Start again
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PredictionStatus({ prediction }: { prediction: SavedPrediction }) {
  if (prediction.is_active) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-primary">
        <span className="material-symbols-outlined text-[12px] font-variation-fill">star</span>
        Active
      </span>
    );
  }

  if (prediction.is_complete) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-wc-green/15 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-wc-green">
        <span className="material-symbols-outlined text-[12px]">check_circle</span>
        Submitted
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-wc-amber-light px-1.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-wc-amber">
      <span className="material-symbols-outlined text-[12px]">pending</span>
      Draft
    </span>
  );
}

function HomePredictionsPanel({ onStartAgain }: { onStartAgain: () => void }) {
  const { user, updateDisplayName, signOut } = useAuth();
  const [predictions, setPredictions] = useState<SavedPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [savingRenameId, setSavingRenameId] = useState<string | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setPredictions([]);
      setError(null);
      setRenamingId(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/predictions', { cache: 'no-store' })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to load predictions');
        if (!cancelled) setPredictions(data.predictions ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load your predictions.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!accountMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [accountMenuOpen]);

  if (!user) return null;

  const handleSaveUsername = async () => {
    const nextName = usernameInput.trim();
    if (!nextName) {
      setError('Username is required.');
      return;
    }

    setUsernameSaving(true);
    setError(null);

    try {
      const result = await updateDisplayName(nextName);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditingUsername(false);
    } finally {
      setUsernameSaving(false);
    }
  };

  const handleRename = async (predictionId: string) => {
    const nextName = renameInput.trim();
    if (!nextName) {
      setError('Prediction name is required.');
      return;
    }

    setSavingRenameId(predictionId);
    setError(null);

    try {
      const res = await fetch(`/api/predictions/manage/${predictionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nextName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to rename prediction.');
        return;
      }
      const updated = data.prediction as SavedPrediction;
      setPredictions(current => current.map(prediction => (
        prediction.id === predictionId ? updated : prediction
      )));
      setRenamingId(null);
      setRenameInput('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSavingRenameId(null);
    }
  };

  const sortedPredictions = [...predictions].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <>
      <section className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.035] shadow-[0_18px_50px_-28px_rgba(0,0,0,0.85)]">
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-black text-neutral-100">My Predictions</h2>
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 font-body text-[11px] font-semibold">
              <span className="truncate text-neutral-300">{user.display_name || 'Player'}</span>
              <span className="text-neutral-700">/</span>
              <span className="truncate text-neutral-500">{user.email}</span>
            </div>
          </div>
          <div className="relative shrink-0" ref={accountMenuRef}>
            <button
              type="button"
              onClick={() => setAccountMenuOpen(open => !open)}
              className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-neutral-400 transition-colors hover:bg-white/[0.08] hover:text-neutral-100"
              aria-label="Open account menu"
              aria-expanded={accountMenuOpen}
            >
              <span className="material-symbols-outlined text-[22px]">more_vert</span>
            </button>
            {accountMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-neutral-800 shadow-[0_18px_45px_-18px_rgba(0,0,0,0.9)]">
                <button
                  type="button"
                  onClick={() => {
                    setUsernameInput(user.display_name || '');
                    setEditingUsername(true);
                    setAccountMenuOpen(false);
                    setError(null);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-neutral-100 transition-colors hover:bg-white/[0.08]"
                >
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                  Edit username
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSignOutConfirm(true);
                    setAccountMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-wc-red transition-colors hover:bg-white/[0.08]"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-3 mt-3 rounded-lg border border-wc-red/30 bg-wc-red/15 px-3 py-2 text-xs font-semibold text-wc-red">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3].map(index => (
              <div key={index} className="h-[72px] animate-pulse rounded-xl bg-white/[0.055]" />
            ))}
          </div>
        ) : sortedPredictions.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <span className="material-symbols-outlined block text-3xl text-white/20">emoji_events</span>
            <p className="mt-2 text-sm font-bold text-neutral-300">No predictions attached yet</p>
            <p className="mt-1 font-body text-xs font-semibold leading-relaxed text-neutral-500">
              Predictions submitted with this email will appear here after sign in.
            </p>
          </div>
        ) : (
          <div className="max-h-[430px] overflow-y-auto p-3">
            <div className="space-y-2">
              {sortedPredictions.map(prediction => {
                const champion = prediction.champion_code ? teamsByCode[prediction.champion_code] : null;
                const dateValue = prediction.completed_at ?? prediction.created_at;
                const formattedDate = dateValue
                  ? new Date(dateValue).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                  : null;

                return (
                  <div key={prediction.id} className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
                    {renamingId === prediction.id ? (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          handleRename(prediction.id);
                        }}
                        className="flex items-center gap-2"
                      >
                        <input
                          value={renameInput}
                          onChange={event => setRenameInput(event.target.value)}
                          autoFocus
                          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/[0.08] px-3 py-2 text-sm font-bold text-white outline-none transition-colors placeholder:text-white/30 focus:border-primary/50"
                          placeholder="Prediction name"
                        />
                        <button
                          type="submit"
                          disabled={savingRenameId === prediction.id}
                          className="flex size-9 items-center justify-center rounded-lg bg-primary text-black transition-colors hover:bg-primary/90 disabled:opacity-50"
                          aria-label="Save prediction name"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {savingRenameId === prediction.id ? 'hourglass_empty' : 'check'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(null);
                            setRenameInput('');
                          }}
                          className="flex size-9 items-center justify-center rounded-lg bg-white/[0.08] text-neutral-400 transition-colors hover:bg-white/[0.12] hover:text-white"
                          aria-label="Cancel rename"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-xl">
                          {champion ? champion.flag : <span className="material-symbols-outlined text-[20px] text-primary">emoji_events</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-sm font-black text-neutral-100">{prediction.name}</p>
                            {prediction.prediction_number != null && (
                              <span className="shrink-0 font-mono text-[11px] font-bold text-neutral-500">#{prediction.prediction_number}</span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <PredictionStatus prediction={prediction} />
                            {champion && (
                              <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-neutral-300">
                                {champion.code}
                              </span>
                            )}
                            {formattedDate && (
                              <span className="text-[10px] font-semibold text-neutral-500">{formattedDate}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setRenamingId(prediction.id);
                            setRenameInput(prediction.name);
                            setError(null);
                          }}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-neutral-400 transition-colors hover:bg-white/[0.08] hover:text-primary"
                          aria-label={`Rename ${prediction.name}`}
                        >
                          <span className="material-symbols-outlined text-[17px]">drive_file_rename_outline</span>
                          Rename
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="border-t border-white/8 px-3 py-3">
          <StartAgainAction
            onStartAgain={onStartAgain}
            label="Add another prediction"
            icon="add_circle"
          />
        </div>
      </section>

      {editingUsername && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditingUsername(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-5 shadow-2xl" onClick={event => event.stopPropagation()}>
            <h3 className="text-lg font-black text-neutral-100">Edit username</h3>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSaveUsername();
              }}
              className="mt-4"
            >
              <input
                type="text"
                value={usernameInput}
                onChange={event => setUsernameInput(event.target.value)}
                autoFocus
                placeholder="Username"
                className="w-full rounded-xl border border-white/15 bg-white/[0.08] px-4 py-3 text-base font-bold text-white outline-none transition-colors placeholder:text-white/30 focus:border-primary/50"
              />
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUsername(false)}
                  className="flex-1 rounded-xl bg-white/[0.08] py-3 text-sm font-bold text-neutral-300 transition-colors hover:bg-white/[0.12] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={usernameSaving || !usernameInput.trim()}
                  className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-black transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {usernameSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowSignOutConfirm(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-5 shadow-2xl" onClick={event => event.stopPropagation()}>
            <h3 className="text-lg font-black text-neutral-100">Sign out?</h3>
            <p className="mt-2 font-body text-sm font-semibold text-neutral-400">You can sign back in with your email anytime.</p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 rounded-xl bg-white/[0.08] py-3 text-sm font-bold text-neutral-300 transition-colors hover:bg-white/[0.12] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSignOutConfirm(false);
                  signOut();
                }}
                className="flex-1 rounded-xl bg-wc-red py-3 text-sm font-bold text-white transition-colors hover:bg-wc-red/90"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function HomeView({
  flowState,
  teamFlagsByCode,
  liveMatch,
  nextMatch,
  hasSubmittedBefore,
  onNavigate,
  onStartAgain,
}: HomeViewProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeRemaining()), 1000);
    return () => clearInterval(id);
  }, []);

  const action = getHomeAction(flowState, hasSubmittedBefore);

  return (
    <div className="flex flex-col gap-3 pt-0 pb-8 md:grid md:grid-cols-2 md:items-start md:gap-6">
      <div className="flex flex-col gap-3 md:col-start-1">
        <HomeHeader
          timeLeft={timeLeft}
          liveMatch={liveMatch}
          nextMatch={nextMatch}
          teamFlagsByCode={teamFlagsByCode}
        />
        <div className="flex flex-col gap-2">
          <PrimaryAction action={action} onNavigate={onNavigate} />
        </div>
      </div>

      <div className="flex flex-col gap-3 md:col-start-2">
        <NextMatchCard
          liveMatch={liveMatch}
          nextMatch={nextMatch}
          teamFlagsByCode={teamFlagsByCode}
          onNavigate={onNavigate}
        />
        <HomePredictionsPanel onStartAgain={onStartAgain} />
      </div>

      <AppFooter onNavigate={onNavigate} className="md:col-span-2" />
    </div>
  );
}
