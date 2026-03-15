'use client';

import { useState, useEffect, useCallback } from 'react';
import { MatchResult, KnockoutResult, SavedPrediction, TabId } from '@/types';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  loadPredictions, getEditingPredictionId, getEditingPredictionName,
  setEditingPrediction, getDarkMode, setDarkMode as persistDarkMode,
} from '@/lib/storage';
import AuthModal from '@/components/AuthModal';
import ProfileHeader from '@/components/profile/ProfileHeader';
import WorkingDraftCard from '@/components/profile/WorkingDraftCard';
import PredictionsList from '@/components/profile/PredictionsList';
import GuestPrompt from '@/components/profile/GuestPrompt';

interface ProfileViewProps {
  groupPredictions: Record<string, MatchResult>;
  knockoutPredictions: Record<string, KnockoutResult>;
  thirdPlaceTiebreaker?: string[];
  onNavigate: (tab: TabId) => void;
  onLoadPrediction: (prediction: SavedPrediction) => void;
  onNewPrediction: () => void;
}

export default function ProfileView({
  groupPredictions, knockoutPredictions, thirdPlaceTiebreaker,
  onNavigate, onLoadPrediction, onNewPrediction,
}: ProfileViewProps) {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const darkMode = true;

  // Saved predictions state
  const [savedPredictions, setSavedPredictions] = useState<SavedPrediction[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [savingCurrent, setSavingCurrent] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [newPredName, setNewPredName] = useState('');

  const currentEditingId = getEditingPredictionId();
  const currentEditingName = getEditingPredictionName();

  const groupCount = Object.keys(groupPredictions).length;
  const knockoutCount = Object.keys(knockoutPredictions).length;
  const hasPredictions = groupCount > 0 || knockoutCount > 0;

  const d = darkMode;

  // Fetch saved predictions
  const fetchSaved = useCallback(async () => {
    if (!user) return;
    setLoadingSaved(true);
    try {
      const res = await fetch('/api/predictions');
      const data = await res.json();
      setSavedPredictions(data.predictions ?? []);
    } catch { /* ignore */ }
    setLoadingSaved(false);
  }, [user]);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  // Save current working draft
  const handleSaveCurrent = async (name?: string) => {
    if (!user) { setShowAuth(true); return; }
    setSavingCurrent(true);
    try {
      const local = loadPredictions();
      const predictionId = currentEditingId;
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predictionId: predictionId || undefined,
          name: name || currentEditingName || 'My Predictions',
          groupMatches: local.groupMatches,
          knockoutMatches: local.knockoutMatches,
          thirdPlaceTiebreaker: local.thirdPlaceTiebreaker,
          championCode: null,
          isComplete: false,
        }),
      });
      const data = await res.json();
      if (res.ok && data.predictions?.id) {
        setEditingPrediction(data.predictions.id, data.predictions.name);
        await fetchSaved();
      }
    } catch { /* ignore */ }
    setSavingCurrent(false);
    setShowNameModal(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/predictions/manage/${id}`, { method: 'DELETE' });
      if (currentEditingId === id) {
        setEditingPrediction(null);
      }
      await fetchSaved();
    } catch { /* ignore */ }
  };

  const handleSetActive = async (id: string) => {
    try {
      await fetch('/api/predictions/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictionId: id }),
      });
      await fetchSaved();
    } catch { /* ignore */ }
  };

  const handleRename = async (id: string, newName: string) => {
    try {
      await fetch(`/api/predictions/manage/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (currentEditingId === id) {
        setEditingPrediction(id, newName);
      }
      await fetchSaved();
    } catch { /* ignore */ }
  };

  const activePrediction = savedPredictions.find(p => p.is_active) ?? null;

  // Determine if the working draft is different from the active prediction
  const isEditingActive = currentEditingId && activePrediction && currentEditingId === activePrediction.id;

  return (
    <div className="pt-2 pb-12 space-y-4">
      {/* Zone 1: Identity Header */}
      <ProfileHeader
        darkMode={d}
        onSignIn={() => setShowAuth(true)}
      />

      {user ? (
        <>
          {/* Zone 3: Working Draft (only if editing something and it's not the active prediction) */}
          {hasPredictions && !isEditingActive && (
            <WorkingDraftCard
              name={currentEditingName}
              predictionId={currentEditingId}
              groupCount={groupCount}
              knockoutCount={knockoutCount}
              saving={savingCurrent}
              darkMode={d}
              onSave={() => {
                if (currentEditingId) {
                  handleSaveCurrent();
                } else {
                  setNewPredName(`Prediction ${savedPredictions.length + 1}`);
                  setShowNameModal(true);
                }
              }}
              onNavigate={onNavigate}
            />
          )}

          {/* Zone 4: Predictions Library */}
          <PredictionsList
            predictions={savedPredictions}
            loading={loadingSaved}
            currentEditingId={currentEditingId}
            darkMode={d}
            hasPredictions={hasPredictions}
            onLoadPrediction={onLoadPrediction}
            onNavigate={onNavigate}
            onNewPrediction={onNewPrediction}
            onRename={handleRename}
            onSetActive={handleSetActive}
            onDelete={handleDelete}
          />

        </>
      ) : (
        /* Guest State */
        <GuestPrompt
          darkMode={d}
          groupCount={groupCount}
          knockoutCount={knockoutCount}
          onSignIn={() => setShowAuth(true)}
          onNavigate={onNavigate}
        />
      )}

      {/* Name modal for new prediction */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowNameModal(false)}>
          <div className={`rounded-2xl p-6 w-full max-w-sm shadow-xl ${d ? 'bg-neutral-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg font-bold mb-4 ${d ? 'text-white' : ''}`}>Name your prediction</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveCurrent(newPredName.trim() || undefined); }}>
              <input
                type="text"
                value={newPredName}
                onChange={e => setNewPredName(e.target.value)}
                autoFocus
                placeholder="e.g. Realistic, Bold Picks..."
                className={`w-full px-4 py-3 rounded-xl border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-base font-bold mb-4 ${
                  d ? 'bg-white/10 border-white/20 text-white placeholder-white/30' : 'border-neutral-200'
                }`}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNameModal(false)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${
                    d ? 'bg-white/10 text-white/60 hover:bg-white/15' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCurrent}
                  className="flex-1 py-3 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {savingCurrent ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuthenticated={() => { setShowAuth(false); fetchSaved(); }}
        />
      )}
    </div>
  );
}
