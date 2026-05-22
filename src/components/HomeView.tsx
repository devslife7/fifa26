'use client';

import { useState, useEffect } from 'react';
import { LiveMatch, MatchResult, TabId } from '@/types';
import { BRACKET_TOTAL, GROUP_TOTAL, PredictionFlowState } from '@/lib/logic/prediction-flow';
import { teamsByCode } from '@/data/teams';
import { useAuth } from '@/components/providers/AuthProvider';
import AuthModal from '@/components/auth/AuthModal';
import NextMatchCard from '@/components/home/NextMatchCard';
import SocialLoopCard from '@/components/home/SocialLoopCard';
import { TOURNAMENT_KICKOFF } from '@/data/tournament';

interface HomeViewProps {
  flowState: PredictionFlowState;
  champion: string | null;
  teamFlagsByCode: Record<string, string>;
  liveMatch: LiveMatch | null;
  nextMatch: LiveMatch | null;
  userPickForNextMatch: MatchResult | undefined;
  isSubmitted: boolean;
  userRank: number | null;
  totalUsers: number | null;
  onNavigate: (tab: TabId) => void;
  onManagePredictions: () => void;
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

function getHomeAction(flowState: PredictionFlowState): HomeAction {
  const { groupCount, championCode, nextPredictionTab } = flowState;

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

function CountdownTile({ value, label, featured = false }: { value: number; label: string; featured?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 ${featured ? 'min-w-[70px]' : 'min-w-10'}`}>
      <span
        className={`font-display font-black leading-none text-primary tabular-nums ${
          featured ? 'text-[44px] drop-shadow-[0_0_18px_rgba(249,212,6,0.2)]' : 'text-[26px]'
        }`}
      >
        {String(value).padStart(2, '0')}
      </span>
      <span
        className={`font-body font-bold uppercase text-neutral-500 ${
          featured ? 'text-[9px] tracking-[0.18em]' : 'text-[8px] tracking-[0.14em]'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function ProgressRow({ label, current, total }: { label: string; current: number; total: number }) {
  const complete = current === total;
  const pct = Math.min((current / total) * 100, 100);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-body text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
          {label}
        </span>
        <span className={`text-sm font-black tabular-nums ${complete ? 'text-primary' : 'text-neutral-200'}`}>
          {current}
          <span className="text-[11px] font-semibold text-neutral-600">/{total}</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${
            complete ? 'bg-gradient-to-r from-wc-green to-green-400' : 'bg-gradient-to-r from-primary-dark to-primary'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
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
      : 'Jun 11, 2026';
  const subtitleLine: string = showLive
    ? `${liveMatch!.venue ?? 'Match in progress'}`
    : showUpNext
      ? `${HERO_DATE_FORMATTER.format(new Date(nextMatch!.utcDate))}${nextMatch!.venue ? ` · ${nextMatch!.venue}` : ''}`
      : 'Estadio Azteca · Mexico City';
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

function PredictionDashboard({
  groupCount,
  knockoutCount,
  champion,
  teamFlagsByCode,
}: {
  groupCount: number;
  knockoutCount: number;
  champion: string | null;
  teamFlagsByCode: Record<string, string>;
}) {
  const championName = champion ? teamsByCode[champion]?.name ?? champion : 'Not selected';
  const championFlag = champion ? teamsByCode[champion]?.flag ?? '' : '';
  const isEmpty = groupCount === 0 && knockoutCount === 0 && !champion;
  const subtitle = isEmpty
    ? 'About 5 minutes. 88 picks. Then watch your bracket play out.'
    : 'Groups, bracket, and champion status';

  return (
    <div className="w-full rounded-[24px] bg-white/[0.025] px-4 py-5 text-left">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-black text-neutral-100">Your Predictions</p>
          <p className="mt-0.5 font-body text-xs font-semibold text-neutral-500">
            {subtitle}
          </p>
        </div>
        {champion && groupCount === GROUP_TOTAL && knockoutCount === BRACKET_TOTAL && (
          <span className="rounded-full border border-wc-green/25 bg-wc-green/10 px-3 py-1 font-body text-[9px] font-black uppercase tracking-[0.12em] text-green-400">
            Complete
          </span>
        )}
      </div>

      <div className="space-y-4">
        <ProgressRow label="Groups" current={groupCount} total={GROUP_TOTAL} />
        <ProgressRow label="Bracket" current={knockoutCount} total={BRACKET_TOTAL} />
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-[18px] bg-black/10 p-3">
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-black/14">
          {champion && teamFlagsByCode[champion] ? (
            <img src={teamFlagsByCode[champion]} alt={championName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl">{championFlag || '—'}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-body text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500">Champion</p>
          <p className={`truncate text-sm font-black ${champion ? 'text-primary' : 'text-neutral-300'}`}>
            {championName}
          </p>
        </div>
      </div>
    </div>
  );
}

const PAST_SEASONS = [
  { year: '2024', label: 'Copa America 2024', href: 'https://copaamerica24.vercel.app/' },
  { year: '2022', label: 'Qatar World Cup 2022', href: 'https://main.d311px3iblll1g.amplifyapp.com/' },
];

function PastSeasonsPanel() {
  return (
    <section className="rounded-[22px] bg-white/[0.018] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-neutral-500">history</span>
        <p className="text-sm font-black text-neutral-100">Past Seasons</p>
      </div>
      <ul className="space-y-1.5">
        {PAST_SEASONS.map(s => (
          <li key={s.year}>
            <a
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-white/[0.03]"
            >
              <span className="font-display text-[15px] font-black tabular-nums text-primary/80">
                {s.year}
              </span>
              <span className="min-w-0 flex-1 truncate font-body text-xs font-bold text-neutral-300">
                {s.label}
              </span>
              <span className="material-symbols-outlined text-[16px] text-neutral-600">
                open_in_new
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AccountPanel({
  user,
  onSignIn,
  onSignOut,
  onManagePredictions,
}: {
  user: { display_name?: string | null; email?: string | null } | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onManagePredictions: () => void;
}) {
  if (user) {
    return (
      <section className="rounded-[22px] bg-white/[0.018] p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
            <span className="material-symbols-outlined text-[23px] text-primary">person</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-neutral-100">{user.display_name || 'Player'}</p>
            <p className="truncate font-body text-xs font-semibold text-neutral-500">{user.email}</p>
          </div>
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 rounded-xl border border-wc-red/20 bg-wc-red/10 px-3 py-2 font-body text-xs font-black text-wc-red transition-colors hover:bg-wc-red/15"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Sign Out
          </button>
          <button
            onClick={onManagePredictions}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/6 px-3 py-2 font-body text-xs font-black text-neutral-100 transition-colors hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-[16px]">folder_open</span>
            Manage
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[22px] bg-white/[0.018] p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/8">
          <span className="material-symbols-outlined text-[22px] text-primary">cloud_done</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-neutral-100">Save picks across devices</p>
          <p className="mt-0.5 font-body text-xs font-semibold text-neutral-500">Use a one-time email code.</p>
        </div>
      </div>
      <button
        onClick={onSignIn}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 font-body text-xs font-black text-primary transition-colors hover:bg-primary/15"
      >
        <span className="material-symbols-outlined text-[16px]">login</span>
        Sign In
      </button>
    </section>
  );
}

function HomeFooter({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const footerLinks: Array<{ label: string; target: TabId }> = [
    { label: 'Home', target: 'home' },
    { label: 'Predictor', target: 'groups' },
    { label: 'Leaderboard', target: 'ranking' },
    { label: 'News', target: 'news' },
  ];

  return (
    <footer className="md:col-span-2 mt-2 overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.025] px-4 py-5 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.85)] sm:px-5">
      <div className="grid gap-6 sm:grid-cols-[1.3fr_1fr_1fr]">
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
          </div>
        </nav>

        <div>
          <p className="mb-3 font-body text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
            Past Seasons
          </p>
          <div className="grid gap-2">
            {PAST_SEASONS.map(season => (
              <a
                key={season.year}
                href={season.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-fit font-body text-xs font-bold text-neutral-300 transition-colors hover:text-primary"
              >
                {season.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 border-t border-white/8 pt-3 font-body text-[11px] font-semibold text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
        <span>Unofficial fan project. Not affiliated with FIFA.</span>
        <div className="flex items-center gap-3">
          <span>&copy; 2026 FIFA 26 Predictor</span>
          <a
            href="/admin"
            className="text-[10px] text-neutral-700 transition-colors hover:text-neutral-500"
            aria-label="Admin"
          >
            Ops
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function HomeView({
  flowState,
  champion,
  teamFlagsByCode,
  liveMatch,
  nextMatch,
  userPickForNextMatch,
  isSubmitted,
  userRank,
  totalUsers,
  onNavigate,
  onManagePredictions,
}: HomeViewProps) {
  const { user, signOut } = useAuth();
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeRemaining()), 1000);
    return () => clearInterval(id);
  }, []);

  const action = getHomeAction(flowState);
  const { groupCount, knockoutCount } = flowState;

  return (
    <div className="flex flex-col gap-3 pt-0 pb-8 md:grid md:grid-cols-2 md:items-start md:gap-6">
      <div className="flex flex-col gap-3 md:col-start-1">
        <HomeHeader
          timeLeft={timeLeft}
          liveMatch={liveMatch}
          nextMatch={nextMatch}
          teamFlagsByCode={teamFlagsByCode}
        />
        <PrimaryAction action={action} onNavigate={onNavigate} />
      </div>

      <div className="flex flex-col gap-3 md:col-start-2">
        <PredictionDashboard
          groupCount={groupCount}
          knockoutCount={knockoutCount}
          champion={champion}
          teamFlagsByCode={teamFlagsByCode}
        />

        <NextMatchCard
          liveMatch={liveMatch}
          nextMatch={nextMatch}
          userPickForNextMatch={userPickForNextMatch}
          teamFlagsByCode={teamFlagsByCode}
          onNavigate={onNavigate}
        />

        <SocialLoopCard
          isSignedIn={!!user}
          isSubmitted={isSubmitted}
          userRank={userRank}
          totalUsers={totalUsers}
          nextPredictionTab={flowState.nextPredictionTab}
          onNavigate={onNavigate}
          onSignIn={() => setShowAuth(true)}
        />

        <AccountPanel
          user={user}
          onSignIn={() => setShowAuth(true)}
          onSignOut={() => signOut()}
          onManagePredictions={onManagePredictions}
        />

        <PastSeasonsPanel />
      </div>

      <HomeFooter onNavigate={onNavigate} />

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuthenticated={() => setShowAuth(false)}
        />
      )}
    </div>
  );
}
