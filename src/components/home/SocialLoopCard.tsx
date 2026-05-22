'use client';

import { TabId } from '@/types';

interface Props {
  isSignedIn: boolean;
  isSubmitted: boolean;
  userRank: number | null;
  totalUsers: number | null;
  nextPredictionTab: TabId;
  onNavigate: (tab: TabId) => void;
  onSignIn: () => void;
}

export default function SocialLoopCard({
  isSignedIn,
  isSubmitted,
  userRank,
  totalUsers,
  nextPredictionTab,
  onNavigate,
  onSignIn,
}: Props) {
  if (!isSignedIn) {
    return (
      <button
        onClick={onSignIn}
        className="flex w-full items-center gap-3 rounded-[22px] bg-white/[0.025] px-4 py-3.5 text-left transition-transform active:scale-[0.99]"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10">
          <span className="material-symbols-outlined text-[22px] text-primary">leaderboard</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-neutral-100">Sign in to join the leaderboard</span>
          <span className="mt-0.5 block font-body text-xs font-semibold text-neutral-500">
            Compare your picks with everyone else.
          </span>
        </span>
        <span className="material-symbols-outlined text-[20px] text-neutral-500">arrow_forward</span>
      </button>
    );
  }

  if (!isSubmitted) {
    return (
      <button
        onClick={() => onNavigate(nextPredictionTab)}
        className="flex w-full items-center gap-3 rounded-[22px] bg-white/[0.025] px-4 py-3.5 text-left transition-transform active:scale-[0.99]"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10">
          <span className="material-symbols-outlined text-[22px] text-primary">groups</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-neutral-100">Submit your picks to join the leaderboard</span>
          <span className="mt-0.5 block font-body text-xs font-semibold text-neutral-500">
            Lock in predictions to start scoring.
          </span>
        </span>
        <span className="material-symbols-outlined text-[20px] text-neutral-500">arrow_forward</span>
      </button>
    );
  }

  if (userRank !== null && totalUsers !== null && totalUsers > 0) {
    return (
      <button
        onClick={() => onNavigate('tracker')}
        className="flex w-full items-center gap-3 rounded-[22px] bg-white/[0.025] px-4 py-3.5 text-left transition-transform active:scale-[0.99]"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10">
          <span className="material-symbols-outlined text-[22px] text-primary">event_available</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-neutral-100">
            Your rank: <span className="text-primary">#{userRank}</span> of {totalUsers}
          </span>
          <span className="mt-0.5 block font-body text-xs font-semibold text-neutral-500">
            Track active picks and points.
          </span>
        </span>
        <span className="material-symbols-outlined text-[20px] text-neutral-500">arrow_forward</span>
      </button>
    );
  }

  return (
    <div className="flex w-full items-center gap-3 rounded-[22px] bg-white/[0.018] px-4 py-3.5 text-left">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/[0.025]">
        <span className="material-symbols-outlined text-[22px] text-neutral-500">schedule</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-neutral-200">My Picks updates after match results</span>
        <span className="mt-0.5 block font-body text-xs font-semibold text-neutral-500">
          You're entered. Scores roll in as games finish.
        </span>
      </span>
    </div>
  );
}
