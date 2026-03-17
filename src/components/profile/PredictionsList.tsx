'use client';

import { useState, useRef, useCallback } from 'react';
import { SavedPrediction } from '@/types';
import PredictionRow from './PredictionRow';
import UserPredictionsModal from '@/components/UserPredictionsModal';
import PredictionCapture from '@/components/PredictionCapture';
import { copyImageToClipboard } from '@/lib/clipboard';

interface PredictionsListProps {
  predictions: SavedPrediction[];
  loading: boolean;
  currentEditingId: string | null;
  darkMode: boolean;
  hasPredictions: boolean;
  onLoadPrediction: (prediction: SavedPrediction) => void;
  onNavigateToPredictions: (view: 'groups' | 'bracket') => void;
  onNewPrediction: () => void;
  onRename: (id: string, name: string) => void;
  onSetActive: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function PredictionsList({
  predictions, loading, currentEditingId, darkMode: d, hasPredictions,
  onLoadPrediction, onNavigateToPredictions, onNewPrediction, onRename, onSetActive, onDelete,
}: PredictionsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewingPrediction, setViewingPrediction] = useState<SavedPrediction | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [copySuccessId, setCopySuccessId] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  const handleCopyImage = useCallback(async (predictionId: string) => {
    if (!captureRef.current) return;
    setCopyingId(predictionId);
    const result = await copyImageToClipboard(captureRef.current);
    setCopyingId(null);
    if (result === 'copied') {
      setCopySuccessId(predictionId);
      setTimeout(() => setCopySuccessId(null), 2000);
    }
  }, []);

  const expandedPrediction = predictions.find(p => p.id === expandedId) ?? null;

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
          <span className={`material-symbols-outlined text-3xl mb-2 block ${d ? 'text-white/20' : 'text-neutral-300'}`}>emoji_events</span>
          <p className={`text-sm font-semibold ${d ? 'text-white/50' : 'text-neutral-500'}`}>No predictions yet</p>
          <p className={`text-xs mt-1 ${d ? 'text-white/30' : 'text-neutral-400'}`}>
            {hasPredictions
              ? 'Save your current predictions to compete on the leaderboard'
              : 'Create your first prediction to compete on the leaderboard'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...predictions].sort((a, b) => (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1)).map(p => (
            <PredictionRow
              key={p.id}
              prediction={p}
              isCurrentlyEditing={currentEditingId === p.id}
              isExpanded={expandedId === p.id}
              darkMode={d}
              onToggleExpand={() => setExpandedId(expandedId === p.id ? null : p.id)}
              onView={() => setViewingPrediction(p)}
              onEdit={() => { onLoadPrediction(p); onNavigateToPredictions('groups'); }}
              onRename={(name) => onRename(p.id, name)}
              onSetActive={() => onSetActive(p.id)}
              onCopyLink={() => {
                if (p.share_token) {
                  navigator.clipboard.writeText(`${window.location.origin}/shared/${p.share_token}`);
                }
              }}
              onDelete={() => onDelete(p.id)}
              onCopyImage={() => handleCopyImage(p.id)}
              isCopyingImage={copyingId === p.id}
              copySuccess={copySuccessId === p.id}
            />
          ))}
        </div>
      )}
      {viewingPrediction && (
        <UserPredictionsModal
          prediction={{
            user_id: '',
            display_name: viewingPrediction.name,
            champion_code: viewingPrediction.champion_code ?? null,
            group_matches: viewingPrediction.group_matches ?? {},
            knockout_matches: viewingPrediction.knockout_matches ?? {},
            third_place_tiebreaker: viewingPrediction.third_place_tiebreaker,
          }}
          onClose={() => setViewingPrediction(null)}
        />
      )}
      {expandedPrediction && (
        <PredictionCapture ref={captureRef} prediction={expandedPrediction} />
      )}
    </div>
  );
}
