'use client';

import ScoringExplainer from './ScoringExplainer';

interface Props {
  onClose: () => void;
}

export default function ScoringInfoModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scoring-info-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-background-dark shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">Info</p>
            <h2 id="scoring-info-title" className="mt-1 text-lg font-black text-white">
              Knockout scoring
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-neutral-400 transition-colors hover:bg-white/15 hover:text-white"
            aria-label="Close scoring info"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <ScoringExplainer variant="knockout-only" surface="plain" />
        </div>
      </div>
    </div>
  );
}
