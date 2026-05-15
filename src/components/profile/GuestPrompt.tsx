'use client';

import { TabId } from '@/types';

interface GuestPromptProps {
  darkMode: boolean;
  groupCount: number;
  knockoutCount: number;
  onSignIn: () => void;
  onStartPredicting: (view?: TabId) => void;
}

export default function GuestPrompt({ darkMode: d, groupCount, knockoutCount, onSignIn, onStartPredicting }: GuestPromptProps) {
  const hasPredictions = groupCount > 0 || knockoutCount > 0;

  return (
    <div className="flex flex-col items-center pt-8 pb-4">

      {/* FIFA logo hero */}
      <div className="relative mb-6">
        <div className="absolute inset-0 -m-8 rounded-full bg-primary/[0.04] blur-3xl" />
        <img src="/images/fifa_logov2_transparent.png" alt="FIFA World Cup 2026" className="relative w-28 h-28 animate-trophy-glow" />
      </div>

      {/* Title block */}
      <div className="text-center mb-8">
        <p className="text-[11px] uppercase tracking-[0.35em] text-primary/60 font-semibold mb-2">
          Predict the Tournament
        </p>
        <h1 className="text-3xl font-black tracking-tight leading-tight mb-3">
          <span className="champion-shimmer">FIFA World Cup</span>
          <br />
          <span className="text-white">2026</span>
        </h1>
        <p className="text-sm text-neutral-400 font-body leading-relaxed max-w-[280px] mx-auto">
          Pick every match from group stage to the final. See how your predictions stack up.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex items-center gap-2 mb-10">
        {[
          { icon: 'sports_soccer', label: '72 Matches' },
          { icon: 'account_tree', label: 'Knockout' },
          { icon: 'emoji_events', label: 'Champion' },
        ].map((f) => (
          <div
            key={f.label}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08]"
          >
            <span className="material-symbols-outlined text-primary/70 text-[14px]">{f.icon}</span>
            <span className="text-[11px] font-semibold text-neutral-300 font-body">{f.label}</span>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="w-full max-w-xs mb-8">
        <div className="space-y-3">
          {[
            { step: '1', icon: 'sports_soccer', text: 'Predict all group matches' },
            { step: '2', icon: 'account_tree', text: 'Build your knockout bracket' },
            { step: '3', icon: 'emoji_events', text: 'Pick your champion' },
            { step: '4', icon: 'send', text: 'Submit & compete' },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-black text-primary">{item.step}</span>
              </div>
              <span className="text-sm text-neutral-300 font-body">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={() => onStartPredicting()}
          className="group w-full py-4 rounded-2xl bg-primary text-black font-bold text-base hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_32px_rgba(249,212,6,0.15)]"
        >
          {hasPredictions ? 'Continue Predicting' : 'Start Predicting'}
          <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-0.5">
            arrow_forward
          </span>
        </button>

        <button
          onClick={onSignIn}
          className="w-full py-3 px-4 rounded-2xl font-semibold text-xs text-neutral-300 border border-white/10 bg-white/[0.06] hover:bg-white/[0.10] hover:border-white/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 overflow-hidden"
        >
          <span className="material-symbols-outlined text-[16px] flex-shrink-0">person</span>
          Sign In with a one-time password
        </button>
      </div>
    </div>
  );
}
