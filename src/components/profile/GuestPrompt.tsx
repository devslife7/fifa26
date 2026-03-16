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
      <button
        onClick={onSignIn}
        className="w-full py-3 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors"
      >
        Sign In
      </button>

      {hasPredictions && (
        <button
          onClick={() => onNavigate(groupCount < 72 ? 'groups' : 'bracket')}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors ${
            d ? 'bg-white/10 text-white/80 hover:bg-white/15' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
          Edit Predictions
        </button>
      )}
    </div>
  );
}
