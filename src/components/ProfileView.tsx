'use client';

import { useState, useEffect, useCallback } from 'react';
import { MatchResult, KnockoutResult, SavedPrediction, TabId } from '@/types';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  loadPredictions, getEditingPredictionId, getEditingPredictionName,
  setEditingPrediction, getDarkMode, setDarkMode as persistDarkMode,
} from '@/lib/storage';
import { getChampion } from '@/lib/bracket';
import AuthModal from '@/components/AuthModal';
import ProfileHeader from '@/components/profile/ProfileHeader';
import WorkingDraftCard from '@/components/profile/WorkingDraftCard';
import PredictionsList from '@/components/profile/PredictionsList';
import GuestPrompt from '@/components/profile/GuestPrompt';
import ChampionScreen from '@/components/ChampionScreen';

interface ProfileViewProps {
  groupPredictions: Record<string, MatchResult>;
  knockoutPredictions: Record<string, KnockoutResult>;
  thirdPlaceTiebreaker?: string[];
  onNavigate: (tab: TabId) => void;
  onLoadPrediction: (prediction: SavedPrediction) => void;
  onNewPrediction: () => void;
  onClearPredictions: () => void;
}

export default function ProfileView({
  groupPredictions, knockoutPredictions, thirdPlaceTiebreaker,
  onNavigate, onLoadPrediction, onNewPrediction, onClearPredictions,
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
  const [error, setError] = useState<string | null>(null);
  const predictionsSnapshot = JSON.stringify(groupPredictions) + JSON.stringify(knockoutPredictions) + JSON.stringify(thirdPlaceTiebreaker);

  const [submitted, setSubmitted] = useState(() => {
    if (typeof window === 'undefined') return false;
    const wasSubmitted = localStorage.getItem('prediction_submitted') === 'true';
    if (!wasSubmitted) return false;
    // Check if predictions changed since submission
    const savedSnapshot = localStorage.getItem('prediction_submitted_snapshot');
    if (!savedSnapshot || savedSnapshot !== predictionsSnapshot) {
      localStorage.removeItem('prediction_submitted');
      localStorage.removeItem('prediction_submitted_snapshot');
      return false;
    }
    return true;
  });

  const currentEditingId = getEditingPredictionId();
  const currentEditingName = getEditingPredictionName();

  const groupCount = Object.keys(groupPredictions).length;
  const knockoutCount = Object.keys(knockoutPredictions).length;
  const hasPredictions = groupCount > 0 || knockoutCount > 0;

  // Also check at runtime when predictions change via props
  useEffect(() => {
    if (!submitted) return;
    const savedSnapshot = localStorage.getItem('prediction_submitted_snapshot');
    if (!savedSnapshot || savedSnapshot !== predictionsSnapshot) {
      setSubmitted(false);
      localStorage.removeItem('prediction_submitted');
      localStorage.removeItem('prediction_submitted_snapshot');
    }
  }, [predictionsSnapshot, submitted]);

  const d = darkMode;
  const championCode = getChampion(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker);

  // Fetch saved predictions
  const fetchSaved = useCallback(async () => {
    if (!user) return;
    setLoadingSaved(true);
    try {
      const res = await fetch('/api/predictions');
      const data = await res.json();
      setSavedPredictions(data.predictions ?? []);
    } catch { setError('Failed to load saved predictions.'); }
    setLoadingSaved(false);
  }, [user]);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  // Save current working draft
  const handleSaveCurrent = async (name?: string) => {
    if (!user) { setShowAuth(true); return; }
    setSavingCurrent(true);
    setError(null);
    try {
      const local = loadPredictions();
      const predictionId = currentEditingId;

      // Compute champion from current state
      const championCode = getChampion(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker) ?? null;

      // Preserve completion status if this prediction was previously completed
      const existing = savedPredictions.find(p => p.id === predictionId);
      const isComplete = existing?.is_complete ?? false;

      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predictionId: predictionId || undefined,
          name: name || currentEditingName || 'My Predictions',
          groupMatches: local.groupMatches,
          knockoutMatches: local.knockoutMatches,
          thirdPlaceTiebreaker: local.thirdPlaceTiebreaker,
          championCode,
          isComplete,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed to save predictions.');
        return;
      }
      const data = await res.json();
      if (data.predictions?.id) {
        setEditingPrediction(data.predictions.id, data.predictions.name);
        await fetchSaved();
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSavingCurrent(false);
      setShowNameModal(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/predictions/manage/${id}`, { method: 'DELETE' });
      if (currentEditingId === id) {
        setEditingPrediction(null);
      }
      await fetchSaved();
    } catch { setError('Failed to delete prediction.'); }
  };

  const handleSetActive = async (id: string) => {
    try {
      await fetch('/api/predictions/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictionId: id }),
      });
      await fetchSaved();
    } catch { setError('Failed to set active prediction.'); }
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
    } catch { setError('Failed to rename prediction.'); }
  };

  const activePrediction = savedPredictions.find(p => p.is_active) ?? null;

  // Determine if the working draft is different from the active prediction
  const isEditingActive = currentEditingId && activePrediction && currentEditingId === activePrediction.id;

  return (
    <div className="pt-2 pb-12 space-y-4">
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-wc-red/15 border border-wc-red/30 rounded-xl text-wc-red text-sm font-medium">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {error}
        </div>
      )}

      {/* Zone 1: Identity Header (only for signed-in users) */}
      {user && (
        <ProfileHeader
          darkMode={d}
          onSignIn={() => setShowAuth(true)}
        />
      )}

      {/* Champion Section — show if champion is picked and not yet submitted/saved */}
      {championCode && !submitted && !loadingSaved && !savedPredictions.some(p => p.id === currentEditingId && p.is_complete) && (
        <ChampionScreen
          groupPredictions={groupPredictions}
          knockoutPredictions={knockoutPredictions}
          thirdPlaceTiebreaker={thirdPlaceTiebreaker}
          onSaved={() => {
            setSubmitted(true);
            localStorage.setItem('prediction_submitted', 'true');
            localStorage.setItem('prediction_submitted_snapshot', predictionsSnapshot);
            fetchSaved();
            onNavigate('ranking');
          }}
          user={user}
          onSignIn={() => setShowAuth(true)}
          onEdit={() => onNavigate(groupCount < 72 ? 'groups' : 'bracket')}
        />
      )}

      {user ? (
        <>
          {/* Zone 3: Working Draft (only if editing something, not the active prediction, and no champion section showing) */}
          {hasPredictions && !isEditingActive && !championCode && (
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
      ) : submitted ? (
        /* Post-submission state for guests */
        <div className="flex flex-col items-center pt-8 pb-4 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 -m-8 rounded-full bg-wc-green/[0.06] blur-3xl" />
            <div className="w-16 h-16 rounded-full bg-wc-green/15 border border-wc-green/20 flex items-center justify-center relative">
              <span className="material-symbols-outlined text-wc-green text-3xl font-variation-fill">check_circle</span>
            </div>
          </div>

          <h2 className="text-2xl font-black mb-2">Prediction Submitted!</h2>
          <p className="text-sm text-neutral-400 font-body leading-relaxed max-w-[300px] mx-auto mb-8">
            Sign in to track your prediction, see how it stacks up on the leaderboard, and manage multiple predictions.
          </p>

          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={() => setShowAuth(true)}
              className="group w-full py-4 rounded-2xl bg-primary text-black font-bold text-base hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_32px_rgba(249,212,6,0.15)]"
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
              Sign In
            </button>

            <button
              onClick={() => onNavigate('ranking')}
              className="w-full py-3 rounded-xl font-semibold text-sm text-neutral-400 hover:text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">leaderboard</span>
              View Leaderboard
            </button>
          </div>
        </div>
      ) : !championCode ? (
        /* Guest State — hidden when champion section is showing (it has its own Sign In / Edit buttons) */
        <GuestPrompt
          darkMode={d}
          groupCount={groupCount}
          knockoutCount={knockoutCount}
          onSignIn={() => setShowAuth(true)}
          onNavigate={onNavigate}
        />
      ) : null}

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
