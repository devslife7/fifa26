'use client';

import { useState } from 'react';
import { SavedPrediction, TabId } from '@/types';
import PredictionRow from './PredictionRow';

interface PredictionsListProps {
  predictions: SavedPrediction[];
  loading: boolean;
  currentEditingId: string | null;
  darkMode: boolean;
  hasPredictions: boolean;
  onLoadPrediction: (prediction: SavedPrediction) => void;
  onNavigate: (tab: TabId) => void;
  onNewPrediction: () => void;
  onRename: (id: string, name: string) => void;
  onSetActive: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function PredictionsList({
  predictions, loading, currentEditingId, darkMode: d, hasPredictions,
  onLoadPrediction, onNavigate, onNewPrediction, onRename, onSetActive, onDelete,
}: PredictionsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className={`text-base font-bold ${d ? 'text-white' : ''}`}>
          My Predictions
          {predictions.length > 0 && (
            <span className={`font-normal text-sm ml-2 ${d ? 'text-white/30' : 'text-neutral-400'}`}>({predictions.length}/10)</span>
          )}
        </h2>
        <button
          onClick={onNewPrediction}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
            d ? 'bg-wc-green/15 text-wc-green hover:bg-wc-green/25' : 'bg-wc-green-light text-wc-green border border-wc-green-border hover:bg-wc-green/10'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          New
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className={`rounded-2xl border p-4 animate-pulse ${d ? 'bg-white/5 border-white/10' : 'bg-white border-neutral-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${d ? 'bg-white/10' : 'bg-neutral-100'}`} />
                <div className="flex-1 space-y-2">
                  <div className={`h-4 rounded w-1/3 ${d ? 'bg-white/10' : 'bg-neutral-100'}`} />
                  <div className={`h-3 rounded w-1/2 ${d ? 'bg-white/10' : 'bg-neutral-100'}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : predictions.length === 0 ? (
        <div className={`rounded-2xl border p-6 text-center ${d ? 'bg-white/5 border-white/10' : 'bg-white border-neutral-100'}`}>
          <span className={`material-symbols-outlined text-3xl mb-2 block ${d ? 'text-white/20' : 'text-neutral-300'}`}>folder_open</span>
          <p className={`text-sm ${d ? 'text-white/40' : 'text-neutral-400'}`}>No saved predictions yet</p>
          {hasPredictions && (
            <p className={`text-xs mt-1 ${d ? 'text-white/30' : 'text-neutral-400'}`}>Use the save button above to save your current predictions</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {predictions.map(p => (
            <PredictionRow
              key={p.id}
              prediction={p}
              isCurrentlyEditing={currentEditingId === p.id}
              isExpanded={expandedId === p.id}
              darkMode={d}
              onToggleExpand={() => setExpandedId(expandedId === p.id ? null : p.id)}
              onEdit={() => { onLoadPrediction(p); onNavigate('groups'); }}
              onRename={(name) => onRename(p.id, name)}
              onSetActive={() => onSetActive(p.id)}
              onCopyLink={() => {
                if (p.share_token) {
                  navigator.clipboard.writeText(`${window.location.origin}/shared/${p.share_token}`);
                }
              }}
              onDelete={() => onDelete(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
