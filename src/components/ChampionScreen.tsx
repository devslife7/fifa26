'use client';

import { useState } from 'react';
import { MatchResult, KnockoutResult } from '@/types';
import { getChampion } from '@/lib/bracket';
import { teamsByCode } from '@/data/teams';
import { useAuth } from '@/components/providers/AuthProvider';
import { loadPredictions } from '@/lib/storage';
import AuthModal from '@/components/AuthModal';

interface Props {
  groupPredictions: Record<string, MatchResult>;
  knockoutPredictions: Record<string, KnockoutResult>;
}

export default function ChampionScreen({ groupPredictions, knockoutPredictions }: Props) {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const championCode = getChampion(groupPredictions, knockoutPredictions);
  const champion = championCode ? teamsByCode[championCode] : null;

  const handleSave = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    await savePredictions();
  };

  const savePredictions = async () => {
    setSaving(true);
    setError(null);

    try {
      const local = loadPredictions();
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupMatches: local.groupMatches,
          knockoutMatches: local.knockoutMatches,
          championCode,
          isComplete: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save');
        return;
      }

      if (data.predictions?.share_token) {
        setShareUrl(`${window.location.origin}/shared/${data.predictions.share_token}`);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  if (!champion) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-7xl mb-6 animate-trophy-glow">🏆</div>
        <h2 className="text-3xl font-bold mb-3">Your Champion</h2>
        <p className="text-slate-400 max-w-md">
          Complete all match predictions to reveal your predicted FIFA World Cup 2026 champion
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-8">
        <div className="text-8xl animate-trophy-glow">🏆</div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-3 bg-primary/20 rounded-full blur-xl" />
      </div>

      <div className="mb-6">
        <span className="text-7xl">{champion.flag}</span>
      </div>

      <h2 className="text-4xl font-black mb-2 text-primary">
        {champion.name}
      </h2>

      <p className="text-slate-400 text-sm uppercase tracking-[0.2em] font-medium mb-8">
        Your Predicted Champion
      </p>

      <div className="bg-white rounded-2xl border border-primary/20 px-8 py-6 max-w-sm shadow-sm animate-pulse-gold">
        <p className="text-slate-500 text-sm">
          FIFA World Cup 2026
        </p>
        <p className="text-primary font-bold text-lg mt-1">
          {champion.flag} {champion.name}
        </p>
      </div>

      {/* Save & Share Section */}
      <div className="mt-10 w-full max-w-sm">
        {shareUrl ? (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <span className="material-symbols-outlined text-green-600 text-2xl font-variation-fill">check_circle</span>
              <p className="text-green-700 font-bold mt-1">Predictions Saved!</p>
            </div>
            <button
              onClick={handleCopyLink}
              className="w-full py-3 bg-background-dark text-white font-bold rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">content_copy</span>
              Copy Share Link
            </button>
            <p className="text-xs text-slate-400 break-all">{shareUrl}</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
            >
              {saving ? (
                'Saving...'
              ) : (
                <>
                  <span className="material-symbols-outlined font-variation-fill">share</span>
                  Save & Share
                </>
              )}
            </button>
            {!user && (
              <p className="text-xs text-slate-400 mt-2">You&apos;ll need to sign in to save</p>
            )}
          </>
        )}
      </div>

      {/* Auth Modal */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuthenticated={() => {
            setShowAuth(false);
            savePredictions();
          }}
        />
      )}
    </div>
  );
}
