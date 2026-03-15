'use client';

import { SavedPrediction } from '@/types';
import { teamsByCode } from '@/data/teams';

interface ActivePredictionCardProps {
  activePrediction: SavedPrediction | null;
  darkMode: boolean;
}

export default function ActivePredictionCard({ activePrediction, darkMode: d }: ActivePredictionCardProps) {
  if (!activePrediction) {
    return (
      <div className={`rounded-2xl border p-5 text-center ${d ? 'bg-white/5 border-white/10' : 'bg-white border-neutral-100'}`}>
        <span className={`material-symbols-outlined text-2xl mb-2 block ${d ? 'text-white/20' : 'text-neutral-300'}`}>emoji_events</span>
        <p className={`text-sm font-semibold ${d ? 'text-white/50' : 'text-neutral-500'}`}>No active prediction</p>
        <p className={`text-xs mt-1 ${d ? 'text-white/30' : 'text-neutral-400'}`}>Complete a prediction and set it as active to appear on the leaderboard</p>
      </div>
    );
  }

  const champion = activePrediction.champion_code ? teamsByCode[activePrediction.champion_code] : null;
  const groupCount = Object.keys(activePrediction.group_matches ?? {}).length;
  const knockoutCount = Object.keys(activePrediction.knockout_matches ?? {}).length;

  const handleShare = () => {
    if (activePrediction.share_token) {
      navigator.clipboard.writeText(`${window.location.origin}/shared/${activePrediction.share_token}`);
    }
  };

  return (
    <div className={`rounded-2xl border p-4 ${d ? 'bg-white/5 border-primary/20' : 'bg-white border-primary/15 shadow-sm'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary font-variation-fill">star</span>
          <span className={`text-[11px] font-bold uppercase tracking-wider ${d ? 'text-white/40' : 'text-neutral-400'}`}>Active Prediction</span>
        </div>
        {activePrediction.share_token && (
          <button
            onClick={handleShare}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
              d ? 'bg-white/10 text-white/60 hover:bg-white/15' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">share</span>
            Share
          </button>
        )}
      </div>

      {/* Prediction name */}
      <p className={`text-base font-bold mb-2 ${d ? 'text-white' : 'text-neutral-900'}`}>{activePrediction.name}</p>

      {/* Champion */}
      {champion && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{champion.flag}</span>
          <span className={`text-sm font-semibold ${d ? 'text-white/80' : 'text-neutral-700'}`}>{champion.name}</span>
          <span className={`text-xs ${d ? 'text-white/30' : 'text-neutral-400'}`}>Champion Pick</span>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`inline-flex items-center gap-1 text-[11px] ${d ? 'text-white/40' : 'text-neutral-400'}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-wc-green inline-block" />
          {groupCount}/72 groups
        </span>
        <span className={`inline-flex items-center gap-1 text-[11px] ${d ? 'text-white/40' : 'text-neutral-400'}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-wc-blue inline-block" />
          {knockoutCount}/48 knockout
        </span>
        {activePrediction.is_complete ? (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-wc-green-light text-wc-green text-[10px] font-bold border border-wc-green-border">
            <span className="material-symbols-outlined text-[11px] font-variation-fill">check_circle</span>
            Complete
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-wc-amber-light text-wc-amber text-[10px] font-bold border border-wc-amber-border">
            <span className="material-symbols-outlined text-[11px]">pending</span>
            In Progress
          </span>
        )}
      </div>
    </div>
  );
}
