'use client';

import { TabId } from '@/types';

interface WorkingDraftCardProps {
  name: string | null;
  predictionId: string | null;
  groupCount: number;
  knockoutCount: number;
  saving: boolean;
  darkMode: boolean;
  onSave: () => void;
  onNavigate: (tab: TabId) => void;
}

export default function WorkingDraftCard({
  name, predictionId, groupCount, knockoutCount, saving, darkMode: d, onSave, onNavigate,
}: WorkingDraftCardProps) {
  return (
    <div className={`rounded-2xl border p-4 ${d ? 'bg-white/5 border-white/10' : 'bg-white border-neutral-100 shadow-sm'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-wc-blue/10 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-wc-blue text-base">edit_note</span>
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-bold truncate ${d ? 'text-white' : 'text-neutral-800'}`}>
              {name || 'New Prediction'}
            </p>
            <p className={`text-[11px] flex items-center gap-1.5 flex-wrap sm:flex-nowrap ${d ? 'text-white/40' : 'text-neutral-400'}`}>
              <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-wc-green inline-block" />{groupCount}/72 groups
              </span>
              <span className="hidden sm:block">·</span>
              <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-wc-blue inline-block" />{knockoutCount}/48 knockout
              </span>
              {!predictionId && <><span className="hidden sm:block">·</span><span className="text-wc-amber font-medium whitespace-nowrap">unsaved</span></>}
            </p>
          </div>
        </div>
        <div className="flex items-stretch gap-2 flex-shrink-0 w-full sm:w-auto mt-1 sm:mt-0">
          <button
            onClick={() => onNavigate('groups')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              d ? 'bg-white/10 text-white/60 hover:bg-white/15' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
            }`}
          >
            Continue
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 rounded-lg bg-primary text-black font-bold text-xs hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">
              {saving ? 'hourglass_empty' : 'save'}
            </span>
            {saving ? 'Saving...' : predictionId ? 'Save' : 'Save As...'}
          </button>
        </div>
      </div>
    </div>
  );
}
