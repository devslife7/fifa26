'use client';

import { useState, useEffect } from 'react';
import { TabId } from '@/types';
import { BRACKET_TOTAL, GROUP_TOTAL, PredictionFlowState } from '@/lib/logic/prediction-flow';
import { teamsByCode } from '@/data/teams';
import { useAuth } from '@/components/providers/AuthProvider';
import AuthModal from '@/components/auth/AuthModal';

interface HomeViewProps {
  flowState: PredictionFlowState;
  champion: string | null;
  teamFlagsByCode: Record<string, string>;
  onNavigate: (tab: TabId) => void;
  onManagePredictions: () => void;
  onClear?: () => void;
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

const TOURNAMENT_START = new Date('2026-06-11T00:00:00Z');

function getTimeRemaining(): TimeRemaining | null {
  const now = Date.now();
  const diff = TOURNAMENT_START.getTime() - now;
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
      <span className="font-display text-[34px] font-black leading-none tabular-nums text-neutral-50 drop-shadow-[0_2px_12px_rgba(249,212,6,0.22)] sm:text-[38px]">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1.5 font-body text-[8px] font-black uppercase tracking-[0.24em] text-neutral-500">
        {label}
      </span>
    </div>
  );
}

function HomeHeader({ timeLeft }: { timeLeft: TimeRemaining | null }) {
  const live = !timeLeft;

  return (
    <section className="relative -mx-3 pb-3 sm:-mx-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[55vh] bg-[radial-gradient(ellipse_at_50%_0%,rgba(249,212,6,0.22),rgba(249,212,6,0.05)_40%,transparent_72%)]"
      />

      <div className="relative mx-auto w-full sm:max-w-[440px]">
        <div className="relative overflow-hidden shadow-[0_24px_60px_-24px_rgba(0,0,0,0.85)] sm:rounded-b-[32px]">
          <img
            src="/images/promotional-image-hero.png"
            alt="FIFA World Cup 2026"
            className="block aspect-[4/5] w-full object-cover object-[50%_32%]"
          />

          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent"
          />

          <div className="absolute inset-x-4 top-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 backdrop-blur-md">
              <span className="size-1 rounded-full bg-primary" />
              <span className="font-body text-[9px] font-black uppercase tracking-[0.22em] text-neutral-100">
                FIFA 26 · Edition
              </span>
            </span>
            {live && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-wc-green/30 bg-black/50 px-2.5 py-1 backdrop-blur-md">
                <span className="size-1.5 rounded-full bg-wc-green animate-pulse" />
                <span className="font-body text-[9px] font-black uppercase tracking-[0.2em] text-wc-green">
                  Live
                </span>
              </span>
            )}
          </div>

        </div>

        <div className="relative -mt-12 px-3 sm:px-4">
          <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] px-4 py-3.5 backdrop-blur-2xl shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
            />

            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-neutral-100">Jun 11, 2026</p>
                <p className="mt-0.5 font-body text-[11px] font-semibold text-neutral-500">
                  Estadio Azteca · Mexico City
                </p>
              </div>
              <span className="font-body text-[9px] font-black uppercase tracking-[0.2em] text-primary/85">
                {live ? 'In Progress' : 'Counting Down'}
              </span>
            </div>

            {timeLeft ? (
              <div className="grid grid-cols-4 gap-1">
                <HeroCountUnit value={timeLeft.days} label="days" />
                <HeroCountUnit value={timeLeft.hours} label="hrs" />
                <HeroCountUnit value={timeLeft.minutes} label="min" />
                <HeroCountUnit value={timeLeft.seconds} label="sec" />
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
  onNavigate,
  nextTab,
}: {
  groupCount: number;
  knockoutCount: number;
  champion: string | null;
  teamFlagsByCode: Record<string, string>;
  onNavigate: (tab: TabId) => void;
  nextTab: TabId;
}) {
  const target: TabId = nextTab;
  const championName = champion ? teamsByCode[champion]?.name ?? champion : 'Not selected';
  const championFlag = champion ? teamsByCode[champion]?.flag ?? '' : '';

  return (
    <button
      onClick={() => onNavigate(target)}
      className="w-full rounded-[24px] bg-white/[0.025] px-4 py-5 text-left transition-transform active:scale-[0.99]"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-black text-neutral-100">Your Predictions</p>
          <p className="mt-0.5 font-body text-xs font-semibold text-neutral-500">
            Groups, bracket, and champion status
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
        <span className="material-symbols-outlined text-[20px] text-neutral-700">chevron_right</span>
      </div>
    </button>
  );
}

function ClearPredictionsAction({
  confirmingClear,
  onClear,
  onConfirmingChange,
}: {
  confirmingClear: boolean;
  onClear: () => void;
  onConfirmingChange: (value: boolean) => void;
}) {
  return (
    <button
      onClick={() => {
        if (confirmingClear) {
          onClear();
          onConfirmingChange(false);
          return;
        }
        onConfirmingChange(true);
        setTimeout(() => onConfirmingChange(false), 3000);
      }}
      className={`flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left transition-transform active:scale-[0.99] ${
        confirmingClear
          ? 'bg-wc-red/10'
          : 'bg-white/[0.018]'
      }`}
    >
      <span
        className={`material-symbols-outlined flex size-10 shrink-0 items-center justify-center rounded-xl border text-[22px] ${
          confirmingClear
            ? 'border-wc-red/20 bg-wc-red/10 text-wc-red'
            : 'border-white/5 bg-white/[0.025] text-neutral-500'
        }`}
      >
        {confirmingClear ? 'warning' : 'restart_alt'}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-black ${confirmingClear ? 'text-wc-red' : 'text-neutral-100'}`}>
          {confirmingClear ? 'Tap again to confirm' : 'Start New Predictions'}
        </span>
        <span className="mt-0.5 block font-body text-xs font-semibold text-neutral-500">
          {confirmingClear ? 'Your current picks will be cleared' : 'Clear your picks and begin fresh'}
        </span>
      </span>
    </button>
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
        <button
          onClick={onManagePredictions}
          className="shrink-0 rounded-xl border border-white/10 bg-white/6 px-3 py-2 font-body text-xs font-black text-neutral-100 transition-colors hover:bg-white/10"
        >
          Manage
        </button>
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

export default function HomeView({ flowState, champion, teamFlagsByCode, onNavigate, onManagePredictions, onClear }: HomeViewProps) {
  const { user, signOut } = useAuth();
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeRemaining()), 1000);
    return () => clearInterval(id);
  }, []);

  const action = getHomeAction(flowState);
  const { groupCount, knockoutCount } = flowState;
  const hasPicks = groupCount > 0 || knockoutCount > 0;

  return (
    <div className="flex flex-col gap-3 pt-0 pb-8">
      <HomeHeader timeLeft={timeLeft} />

      <PrimaryAction action={action} onNavigate={onNavigate} />

      <PredictionDashboard
        groupCount={groupCount}
        knockoutCount={knockoutCount}
        champion={champion}
        teamFlagsByCode={teamFlagsByCode}
        onNavigate={onNavigate}
        nextTab={flowState.nextPredictionTab}
      />

      {onClear && hasPicks && (
        <ClearPredictionsAction
          confirmingClear={confirmingClear}
          onClear={onClear}
          onConfirmingChange={setConfirmingClear}
        />
      )}

      <AccountPanel
        user={user}
        onSignIn={() => setShowAuth(true)}
        onSignOut={() => signOut()}
        onManagePredictions={onManagePredictions}
      />

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuthenticated={() => setShowAuth(false)}
        />
      )}
    </div>
  );
}
