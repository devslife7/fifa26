'use client';

import { useState, useEffect } from 'react';
import { LiveMatch, TabId } from '@/types';
import { PredictionFlowState } from '@/lib/logic/prediction-flow';
import { teamsByCode } from '@/data/teams';
import NextMatchCard from '@/components/home/NextMatchCard';
import { TOURNAMENT_KICKOFF } from '@/data/tournament';

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

function StartAgainAction({ onStartAgain }: { onStartAgain: () => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-[16px] border border-white/10 bg-white/[0.035] px-4 py-2.5 font-body text-xs font-black text-neutral-200 transition-colors hover:bg-white/[0.06]"
      >
        <span className="material-symbols-outlined text-[16px]">restart_alt</span>
        Clear predictions and start again
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

function HomeFooter({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const footerLinks: Array<{ label: string; target: TabId }> = [
    { label: 'Home', target: 'home' },
    { label: 'Predictor', target: 'groups' },
    { label: 'Leaderboard', target: 'ranking' },
    { label: 'Tracker', target: 'tracker' },
  ];

  return (
    <footer className="md:col-span-2 mt-2 overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.025] px-4 py-5 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.85)] sm:px-5">
      <div className="grid gap-6 sm:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="mb-3 flex items-center gap-2.5">
            <img src="/images/fifa_logo.svg" alt="FIFA World Cup 2026" className="size-9 shrink-0" />
            <p className="text-base font-black text-neutral-100">FIFA 26 Predictor</p>
          </div>
          <p className="max-w-sm font-body text-xs font-semibold leading-relaxed text-neutral-500">
            A matchday companion for following the 2026 tournament with friends and family.
          </p>
        </div>

        <nav aria-label="Footer navigation">
          <p className="mb-3 font-body text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
            Explore
          </p>
          <div className="grid gap-2">
            {footerLinks.map(link => (
              <button
                key={link.label}
                onClick={() => onNavigate(link.target)}
                className="w-fit font-body text-xs font-bold text-neutral-300 transition-colors hover:text-primary"
              >
                {link.label}
              </button>
            ))}
            <a
              href="/admin"
              className="w-fit font-body text-xs font-bold text-neutral-300 transition-colors hover:text-primary"
            >
              Admin
            </a>
          </div>
        </nav>
      </div>

      <div className="mt-6 flex flex-col gap-2 border-t border-white/8 pt-3 font-body text-[11px] font-semibold text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
        <span>Unofficial fan project. Not affiliated with FIFA.</span>
        <span>&copy; 2026 FIFA 26 Predictor</span>
      </div>
    </footer>
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
          <StartAgainAction onStartAgain={onStartAgain} />
        </div>
      </div>

      <div className="flex flex-col gap-3 md:col-start-2">
        <NextMatchCard
          liveMatch={liveMatch}
          nextMatch={nextMatch}
          teamFlagsByCode={teamFlagsByCode}
          onNavigate={onNavigate}
        />
      </div>

      <HomeFooter onNavigate={onNavigate} />
    </div>
  );
}
