'use client';

import { TabId } from '@/types';

interface GuestPromptProps {
  darkMode: boolean;
  groupCount: number;
  knockoutCount: number;
  onSignIn: () => void;
  onNavigate: (tab: TabId) => void;
}

export default function GuestPrompt({ darkMode: d, groupCount, knockoutCount, onSignIn, onNavigate }: GuestPromptProps) {
  const hasPredictions = groupCount > 0 || knockoutCount > 0;

  return (
    <div className="space-y-4">
      {/* Value proposition */}
      <div className={`rounded-2xl border p-5 ${d ? 'bg-white/5 border-white/10' : 'bg-white border-neutral-100 shadow-sm'}`}>
        <h3 className={`text-sm font-bold mb-3 ${d ? 'text-white' : 'text-neutral-800'}`}>Sign in to unlock</h3>
        <ul className="space-y-2 mb-4">
          {[
            { icon: 'save', text: 'Save up to 10 prediction sets' },
            { icon: 'leaderboard', text: 'Compete on the leaderboard' },
            { icon: 'share', text: 'Share your bracket with friends' },
          ].map(({ icon, text }) => (
            <li key={icon} className="flex items-center gap-2.5">
              <span className={`material-symbols-outlined text-[16px] ${d ? 'text-primary/70' : 'text-primary'}`}>{icon}</span>
              <span className={`text-sm ${d ? 'text-white/60' : 'text-neutral-600'}`}>{text}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={onSignIn}
          className="w-full py-2.5 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors"
        >
          Sign In
        </button>
      </div>

      {/* Local progress or start CTA */}
      {hasPredictions ? (
        <div className={`rounded-2xl border p-5 ${d ? 'bg-white/5 border-white/10' : 'bg-white border-neutral-100 shadow-sm'}`}>
          <p className={`text-sm font-semibold mb-1 ${d ? 'text-white' : 'text-neutral-800'}`}>Your progress so far</p>
          <p className={`text-xs mb-3 flex items-center gap-1.5 ${d ? 'text-white/40' : 'text-neutral-400'}`}>
            <span className="inline-flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-wc-green inline-block" />{groupCount}/72 groups
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-wc-blue inline-block" />{knockoutCount}/48 knockout
            </span>
          </p>
          <button
            onClick={() => onNavigate('groups')}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-colors ${
              d ? 'bg-white/10 text-white/80 hover:bg-white/15' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
            Continue Predicting
          </button>
          <p className={`text-[11px] text-center mt-2 ${d ? 'text-white/25' : 'text-neutral-400'}`}>Sign in to save your progress</p>
        </div>
      ) : (
        <div className={`rounded-2xl border p-6 text-center ${d ? 'bg-white/5 border-white/10' : 'bg-white border-neutral-100 shadow-sm'}`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
            d ? 'bg-wc-green/10' : 'bg-gradient-to-br from-wc-green/15 to-wc-blue/15 border border-wc-green/20'
          }`}>
            <span className="material-symbols-outlined text-wc-green text-2xl">sports_soccer</span>
          </div>
          <h3 className={`text-base font-bold mb-1 ${d ? 'text-white' : 'text-neutral-800'}`}>No predictions yet</h3>
          <p className={`text-sm mb-4 ${d ? 'text-white/40' : 'text-neutral-400'}`}>Start by picking group match winners</p>
          <button
            onClick={() => onNavigate('groups')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
            Start Predicting
          </button>
        </div>
      )}
    </div>
  );
}
