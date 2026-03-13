'use client';

import { useState, useEffect, useCallback } from 'react';
import { TabId, MatchResult, KnockoutResult, SavedPrediction } from '@/types';
import { groups, teamsByCode } from '@/data/teams';
import { allGroupMatches } from '@/data/matches';
import { areAllGroupsComplete, areThirdPlaceTiesResolved } from '@/lib/standings';
import { loadPredictions, savePredictions, clearKnockoutDownstream, getEditingPredictionId, getEditingPredictionName, setEditingPrediction, loadFromServer, resetAllPredictions } from '@/lib/storage';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLiveData } from '@/hooks/useLiveData';
import GroupSection from '@/components/GroupSection';
import ThirdPlaceTable from '@/components/ThirdPlaceTable';
import BracketView from '@/components/BracketView';
import ChampionScreen from '@/components/ChampionScreen';
import ProgressBar from '@/components/ProgressBar';
import BottomNav from '@/components/BottomNav';
import RankingView from '@/components/RankingView';
import AuthModal from '@/components/AuthModal';
import PullToRefresh from '@/components/PullToRefresh';

export default function Home() {
  const { user } = useAuth();
  const { matchesByLocalId: liveMatchesByLocalId, groupMatchesByGroup, teamFlagsByCode, error: liveError, loading: liveLoading, rateLimited, lastUpdated, refetch } = useLiveData();
  const [showRateLimitToast, setShowRateLimitToast] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('groups');

  const [groupPredictions, setGroupPredictions] = useState<Record<string, MatchResult>>({});
  const [knockoutPredictions, setKnockoutPredictions] = useState<Record<string, KnockoutResult>>({});
  const [thirdPlaceTiebreaker, setThirdPlaceTiebreaker] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  // Load local predictions on mount
  useEffect(() => {
    const saved = loadPredictions();
    setGroupPredictions(saved.groupMatches);
    setKnockoutPredictions(saved.knockoutMatches);
    setThirdPlaceTiebreaker(saved.thirdPlaceTiebreaker ?? []);
    setMounted(true);
  }, []);

  // Sync server predictions on auth (hydrate localStorage if local is empty)
  useEffect(() => {
    if (!user || !mounted) return;

    const local = loadPredictions();
    const hasLocal = Object.keys(local.groupMatches).length > 0;

    if (!hasLocal) {
      fetch('/api/predictions')
        .then(res => res.json())
        .then(data => {
          // API now returns an array of predictions
          const predictions: SavedPrediction[] = data.predictions ?? [];
          // Pick the active prediction, or fall back to the most recent
          const toLoad = predictions.find(p => p.is_active) ?? predictions[0];
          if (toLoad) {
            loadFromServer(toLoad);
            setGroupPredictions(toLoad.group_matches ?? {});
            setKnockoutPredictions(toLoad.knockout_matches ?? {});
            setThirdPlaceTiebreaker(toLoad.third_place_tiebreaker ?? []);
          }
        })
        .catch(() => {});
    }
  }, [user, mounted]);

  const handleGroupPredict = useCallback((matchId: string, result: MatchResult) => {
    setGroupPredictions(prev => {
      if (prev[matchId] === result) return prev; // already selected, do nothing
      const next = { ...prev, [matchId]: result };
      const predictions = loadPredictions();
      predictions.groupMatches = next;
      predictions.knockoutMatches = {};
      predictions.thirdPlaceTiebreaker = [];
      savePredictions(predictions);
      setKnockoutPredictions({});
      setThirdPlaceTiebreaker([]);
      return next;
    });
  }, []);

  const handleTiebreakerChange = useCallback((picks: string[]) => {
    setThirdPlaceTiebreaker(picks);
    setKnockoutPredictions({});
    const predictions = loadPredictions();
    predictions.thirdPlaceTiebreaker = picks;
    predictions.knockoutMatches = {};
    savePredictions(predictions);
  }, []);

  const handleRandomizeGroups = useCallback(() => {
    const outcomes: MatchResult[] = ['home', 'draw', 'away'];
    const randomized: Record<string, MatchResult> = {};
    allGroupMatches.forEach(m => {
      randomized[m.id] = outcomes[Math.floor(Math.random() * 3)];
    });
    const predictions = loadPredictions();
    predictions.groupMatches = randomized;
    predictions.knockoutMatches = {};
    predictions.thirdPlaceTiebreaker = [];
    savePredictions(predictions);
    setGroupPredictions(randomized);
    setKnockoutPredictions({});
    setThirdPlaceTiebreaker([]);
  }, []);

  const handleClearGroups = useCallback(() => {
    const predictions = loadPredictions();
    predictions.groupMatches = {};
    predictions.knockoutMatches = {};
    predictions.thirdPlaceTiebreaker = [];
    savePredictions(predictions);
    setGroupPredictions({});
    setKnockoutPredictions({});
    setThirdPlaceTiebreaker([]);
  }, []);

  const handleKnockoutPredict = useCallback((matchId: string, result: KnockoutResult) => {
    setKnockoutPredictions(prev => {
      if (prev[matchId] === result) {
        // Deselect: remove this match and all downstream
        const next = { ...prev };
        delete next[matchId];
        const roundOrder = ['R32', 'R16', 'QF', 'SF', '3RD', 'F'];
        const [round] = matchId.split('-');
        const roundIdx = roundOrder.indexOf(round);
        for (let i = roundIdx + 1; i < roundOrder.length; i++) {
          Object.keys(next).forEach(key => {
            if (key.startsWith(roundOrder[i])) delete next[key];
          });
        }
        const predictions = loadPredictions();
        predictions.knockoutMatches = next;
        savePredictions(predictions);
        return next;
      }
      const next = { ...prev, [matchId]: result };
      // Clear downstream
      clearKnockoutDownstream(matchId);
      // Remove downstream from state too
      const roundOrder = ['R32', 'R16', 'QF', 'SF', '3RD', 'F'];
      const [round] = matchId.split('-');
      const roundIdx = roundOrder.indexOf(round);
      const cleaned = { ...next };
      for (let i = roundIdx + 1; i < roundOrder.length; i++) {
        Object.keys(cleaned).forEach(key => {
          if (key.startsWith(roundOrder[i])) {
            delete cleaned[key];
          }
        });
      }
      const predictions = loadPredictions();
      predictions.knockoutMatches = cleaned;
      savePredictions(predictions);

      // Navigate to profile after picking the final
      if (matchId === 'F-1') {
        setTimeout(() => {
          setActiveTab('profile');
          setTimeout(() => window.scrollTo({ top: 0, left: 0 }), 0);
        }, 600);
      }

      return cleaned;
    });
  }, []);

  useEffect(() => {
    if (!rateLimited) return;
    setShowRateLimitToast(true);
    const t = setTimeout(() => setShowRateLimitToast(false), 4000);
    return () => clearTimeout(t);
  }, [rateLimited]);

  const groupCount = Object.keys(groupPredictions).length;
  const knockoutCount = Object.keys(knockoutPredictions).length;
  const groupsComplete = areAllGroupsComplete(groupPredictions);
  const tiesResolved = areThirdPlaceTiesResolved(groupPredictions, thirdPlaceTiebreaker);
  const canContinueToBracket = groupsComplete && tiesResolved;

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-trophy-glow">🏆</div>
      </div>
    );
  }

  return (
    <PullToRefresh>
    <div className="min-h-screen pb-page-safe">
      {liveError && (
        <LiveBanner message={liveError} />
      )}
      <main className={`mx-auto ${
        activeTab === 'bracket' ? 'max-w-full' :
        activeTab === 'groups' ? 'max-w-[1700px] px-4' :
        activeTab === 'ranking' ? 'max-w-md md:max-w-4xl px-4' :
        activeTab === 'profile' ? 'max-w-md px-4' :
        'max-w-md px-4'
      }`}>
        {(activeTab === 'groups' || activeTab === 'bracket') && (() => {
          const editName = getEditingPredictionName();
          const editId = getEditingPredictionId();
          return editName ? (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
              <span className="material-symbols-outlined text-primary text-[16px]">edit_note</span>
              <span className="text-xs font-semibold text-primary truncate">Editing: {editName}</span>
            </div>
          ) : editId ? null : (groupCount > 0 || knockoutCount > 0) ? (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200">
              <span className="material-symbols-outlined text-slate-400 text-[16px]">edit_note</span>
              <span className="text-xs font-medium text-slate-500">New Prediction (unsaved)</span>
            </div>
          ) : null;
        })()}

        {activeTab === 'groups' && (
          <div>
            <ProgressBar groupCount={groupCount} knockoutCount={knockoutCount} />

            <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={handleRandomizeGroups}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">casino</span>
                  Randomize
                </button>
                <button
                  onClick={handleClearGroups}
                  disabled={groupCount === 0}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-slate-500 font-semibold text-xs hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[16px]">backspace</span>
                  Clear
                </button>
              </div>

            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-x-6 gap-y-10">
              {groups.map(g => (
                <GroupSection
                  key={g}
                  group={g}
                  predictions={groupPredictions}
                  onPredict={handleGroupPredict}
                  liveMatches={liveMatchesByLocalId}
                  apiGroupMatches={groupMatchesByGroup?.[g]}
                  teamFlagsByCode={teamFlagsByCode}
                />
              ))}
            </div>

            <ThirdPlaceTable
              predictions={groupPredictions}
              tiebreakerPicks={thirdPlaceTiebreaker}
              onTiebreakerChange={handleTiebreakerChange}
              teamFlagsByCode={teamFlagsByCode}
            />

            <div className="mt-8">
              <button
                onClick={() => {
                  if (canContinueToBracket) {
                    setActiveTab('bracket');
                    setTimeout(() => window.scrollTo({ top: 0, left: 0 }), 0);
                  }
                }}
                disabled={!canContinueToBracket}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-black text-white font-bold text-sm hover:bg-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue to Bracket
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
              {!canContinueToBracket && (
                <p className="text-center text-[11px] text-slate-400 mt-2">
                  {!groupsComplete
                    ? 'Complete all group predictions to continue'
                    : 'Resolve the third-place tiebreaker above to continue'}
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'bracket' && (
          <BracketView
            groupPredictions={groupPredictions}
            knockoutPredictions={knockoutPredictions}
            thirdPlaceTiebreaker={thirdPlaceTiebreaker}
            onPredict={handleKnockoutPredict}
            liveMatches={liveMatchesByLocalId}
            teamFlagsByCode={teamFlagsByCode}
          />
        )}

        {activeTab === 'tracking' && (
          <div className="pt-6 pb-12">
            <header className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">Tracking</h1>
              <p className="text-slate-500 text-sm mt-1">Follow live matches and results</p>
            </header>
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <span className="material-symbols-outlined text-slate-300 text-5xl mb-4 block">query_stats</span>
              <h2 className="text-lg font-bold text-slate-700 mb-2">Coming Soon</h2>
              <p className="text-slate-400 text-sm">
                Live match tracking and result updates will appear here once the tournament begins.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'ranking' && (
          <RankingView
            lastUpdated={lastUpdated}
            liveLoading={liveLoading}
            onRefreshScores={refetch}
            liveMatches={liveMatchesByLocalId}
            teamFlagsByCode={teamFlagsByCode}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            groupPredictions={groupPredictions}
            knockoutPredictions={knockoutPredictions}
            thirdPlaceTiebreaker={thirdPlaceTiebreaker}
            onNavigate={setActiveTab}
            onLoadPrediction={(prediction: SavedPrediction) => {
              loadFromServer(prediction);
              setGroupPredictions(prediction.group_matches ?? {});
              setKnockoutPredictions(prediction.knockout_matches ?? {});
              setThirdPlaceTiebreaker(prediction.third_place_tiebreaker ?? []);
            }}
            onNewPrediction={() => {
              resetAllPredictions();
              setGroupPredictions({});
              setKnockoutPredictions({});
              setThirdPlaceTiebreaker([]);
              setActiveTab('groups');
            }}
          />
        )}
      </main>

      {/* Bottom Nav */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setTimeout(() => window.scrollTo({ top: 0 }), 0); }}
        groupsComplete={canContinueToBracket}
      />

      {/* Rate limit toast */}
      {showRateLimitToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg animate-fade-in">
          <span className="material-symbols-outlined text-[15px] text-amber-400">warning</span>
          API rate limit reached (10 req/min) — try again shortly
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}

function ProfileView({ groupPredictions, knockoutPredictions, thirdPlaceTiebreaker, onNavigate, onLoadPrediction, onNewPrediction }: {
  groupPredictions: Record<string, MatchResult>;
  knockoutPredictions: Record<string, KnockoutResult>;
  thirdPlaceTiebreaker?: string[];
  onNavigate: (tab: TabId) => void;
  onLoadPrediction: (prediction: SavedPrediction) => void;
  onNewPrediction: () => void;
}) {
  const { user, signOut, updateDisplayName } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);

  // Saved predictions state
  const [savedPredictions, setSavedPredictions] = useState<SavedPrediction[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [savingCurrent, setSavingCurrent] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [newPredName, setNewPredName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const currentEditingId = getEditingPredictionId();
  const currentEditingName = getEditingPredictionName();

  const groupCount = Object.keys(groupPredictions).length;
  const knockoutCount = Object.keys(knockoutPredictions).length;
  const totalGroups = 72;
  const totalKnockout = 48;
  const hasPredictions = groupCount > 0 || knockoutCount > 0;

  const displayName = user?.user_metadata?.display_name || 'Player';
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

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
    setDeletingId(null);
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
    setActionMenuId(null);
  };

  const handleRename = async (id: string) => {
    if (!renameInput.trim()) return;
    try {
      await fetch(`/api/predictions/manage/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameInput.trim() }),
      });
      if (currentEditingId === id) {
        setEditingPrediction(id, renameInput.trim());
      }
      await fetchSaved();
    } catch { /* ignore */ }
    setRenamingId(null);
  };

  // Helper: compute stats for a saved prediction
  function predictionStats(p: SavedPrediction) {
    const gCount = Object.keys(p.group_matches ?? {}).length;
    const kCount = Object.keys(p.knockout_matches ?? {}).length;
    const pct = Math.round(((gCount + kCount) / (totalGroups + totalKnockout)) * 100);
    const champion = p.champion_code ? teamsByCode[p.champion_code] : null;
    return { gCount, kCount, pct, champion };
  }

  return (
    <div className="pt-4 pb-12 space-y-6">
      {/* User Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -translate-y-10 translate-x-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl translate-y-8 -translate-x-8" />

        {user ? (
          <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-black text-xl">{initials}</span>
            </div>
            <div className="min-w-0 flex-grow">
              {editingName ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!nameInput.trim()) return;
                    setNameSaving(true);
                    await updateDisplayName(nameInput.trim());
                    setNameSaving(false);
                    setEditingName(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    autoFocus
                    className="flex-grow min-w-0 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none text-sm font-bold text-white placeholder-white/40"
                  />
                  <button
                    type="submit"
                    disabled={nameSaving || !nameInput.trim()}
                    className="p-1.5 rounded-lg bg-primary text-black hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingName(false)}
                    className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black truncate">{displayName}</h1>
                  <button
                    onClick={() => {
                      setNameInput(user.user_metadata?.display_name || '');
                      setEditingName(true);
                    }}
                    className="p-1 rounded-md hover:bg-white/10 transition-colors flex-shrink-0"
                  >
                    <span className="material-symbols-outlined text-white/40 text-[16px]">edit</span>
                  </button>
                </div>
              )}
              <p className="text-sm text-white/40 truncate mt-0.5">{user.email}</p>
            </div>
          </div>
        ) : (
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-white/30 text-3xl">person</span>
              </div>
              <div>
                <h1 className="text-xl font-black">Guest</h1>
                <p className="text-sm text-white/40">Sign in to save predictions</p>
              </div>
            </div>
            <button
              onClick={() => setShowAuth(true)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              Sign in
            </button>
          </div>
        )}
      </div>

      {/* Currently editing indicator + Save button */}
      {hasPredictions && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-lg">edit_note</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {currentEditingName || 'New Prediction'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {groupCount}/{totalGroups} groups · {knockoutCount}/{totalKnockout} knockout
                  {!currentEditingId && ' · unsaved'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => onNavigate('groups')}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-slate-400 text-[20px]">arrow_forward</span>
              </button>
              <button
                onClick={() => {
                  if (currentEditingId) {
                    handleSaveCurrent();
                  } else {
                    setNewPredName(`Prediction ${savedPredictions.length + 1}`);
                    setShowNameModal(true);
                  }
                }}
                disabled={savingCurrent || !user}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-black font-bold text-xs hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {savingCurrent ? 'hourglass_empty' : 'save'}
                </span>
                {savingCurrent ? 'Saving...' : currentEditingId ? 'Save' : 'Save As...'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Champion Section */}
      <ChampionScreen
        groupPredictions={groupPredictions}
        knockoutPredictions={knockoutPredictions}
        thirdPlaceTiebreaker={thirdPlaceTiebreaker}
      />

      {/* My Predictions Section */}
      {user && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">
              My Predictions
              {savedPredictions.length > 0 && (
                <span className="text-slate-400 font-normal text-sm ml-2">({savedPredictions.length}/10)</span>
              )}
            </h2>
            <button
              onClick={onNewPrediction}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold text-xs hover:bg-slate-200 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              New
            </button>
          </div>

          {loadingSaved ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-100 rounded w-1/3" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : savedPredictions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center">
              <span className="material-symbols-outlined text-slate-300 text-3xl mb-2 block">folder_open</span>
              <p className="text-sm text-slate-400">No saved predictions yet</p>
              {hasPredictions && (
                <p className="text-xs text-slate-400 mt-1">Use the save button above to save your current predictions</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {savedPredictions.map(p => {
                const stats = predictionStats(p);
                const isCurrentlyEditing = currentEditingId === p.id;

                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-2xl shadow-sm border p-4 transition-colors ${
                      isCurrentlyEditing ? 'border-primary/40 ring-1 ring-primary/20' : 'border-slate-100'
                    }`}
                  >
                    {/* Delete confirmation */}
                    {deletingId === p.id ? (
                      <div>
                        <p className="text-sm text-red-700 font-medium mb-3">Delete &ldquo;{p.name}&rdquo;?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="flex-1 py-2 rounded-lg bg-slate-100 text-slate-600 font-semibold text-sm hover:bg-slate-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : renamingId === p.id ? (
                      <form
                        onSubmit={(e) => { e.preventDefault(); handleRename(p.id); }}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={renameInput}
                          onChange={e => setRenameInput(e.target.value)}
                          autoFocus
                          className="flex-grow min-w-0 px-3 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold"
                        />
                        <button type="submit" className="p-2 rounded-lg bg-primary text-black hover:bg-primary/90 transition-colors">
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        </button>
                        <button type="button" onClick={() => setRenamingId(null)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
                          <span className="material-symbols-outlined text-slate-500 text-[18px]">close</span>
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-3">
                        {/* Champion flag or progress ring */}
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative">
                          {stats.champion ? (
                            <span className="text-2xl">{stats.champion.flag}</span>
                          ) : (
                            <>
                              <svg className="absolute inset-0 w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                                <circle cx="20" cy="20" r="16" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                                <circle
                                  cx="20" cy="20" r="16" fill="none"
                                  stroke={stats.pct > 0 ? '#f9d406' : 'transparent'}
                                  strokeWidth="3" strokeLinecap="round"
                                  strokeDasharray={`${(stats.pct / 100) * 100.5} 100.5`}
                                />
                              </svg>
                              <span className="relative text-[10px] font-bold text-slate-400">{stats.pct}%</span>
                            </>
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                            {p.is_active && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary/15 text-primary text-[10px] font-bold flex-shrink-0">
                                <span className="material-symbols-outlined text-[12px] font-variation-fill">star</span>
                                Active
                              </span>
                            )}
                            {isCurrentlyEditing && (
                              <span className="inline-flex px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-500 text-[10px] font-bold flex-shrink-0">
                                Editing
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {p.is_complete ? (
                              <span className="text-emerald-500 font-medium">Complete</span>
                            ) : (
                              <span className="text-amber-500 font-medium">In Progress</span>
                            )}
                            {' · '}{stats.gCount}/{totalGroups} groups · {stats.kCount}/{totalKnockout} knockout
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!isCurrentlyEditing && (
                            <button
                              onClick={() => { onLoadPrediction(p); onNavigate('groups'); }}
                              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                              title="Edit this prediction"
                            >
                              <span className="material-symbols-outlined text-slate-400 text-[20px]">edit</span>
                            </button>
                          )}
                          <div className="relative">
                            <button
                              onClick={() => setActionMenuId(actionMenuId === p.id ? null : p.id)}
                              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                              <span className="material-symbols-outlined text-slate-400 text-[20px]">more_vert</span>
                            </button>
                            {actionMenuId === p.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setActionMenuId(null)} />
                                <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-slate-200 py-1 w-44">
                                  {p.is_complete && !p.is_active && (
                                    <button
                                      onClick={() => handleSetActive(p.id)}
                                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[18px] text-primary">star</span>
                                      Set Active
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setRenameInput(p.name);
                                      setRenamingId(p.id);
                                      setActionMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">drive_file_rename_outline</span>
                                    Rename
                                  </button>
                                  {p.share_token && (
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/shared/${p.share_token}`);
                                        setActionMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">link</span>
                                      Copy Link
                                    </button>
                                  )}
                                  <button
                                    onClick={() => { setDeletingId(p.id); setActionMenuId(null); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* No predictions at all - CTA */}
      {!hasPredictions && (!user || savedPredictions.length === 0) && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-primary text-3xl">sports_soccer</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No predictions yet</h3>
          <p className="text-sm text-slate-400 mb-5">Start by picking group match winners</p>
          <button
            onClick={() => onNavigate('groups')}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">play_arrow</span>
            Start Predicting
          </button>
        </div>
      )}

      {/* Sign out */}
      {user && (
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-400 font-medium text-sm hover:bg-red-50 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Sign out
        </button>
      )}

      {/* Name modal for new prediction */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowNameModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Name your prediction</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveCurrent(newPredName.trim() || undefined); }}>
              <input
                type="text"
                value={newPredName}
                onChange={e => setNewPredName(e.target.value)}
                autoFocus
                placeholder="e.g. Realistic, Bold Picks..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold mb-4"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingCurrent}
                  className="flex-1 py-3 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {savingCurrent ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNameModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  Cancel
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

function LiveBanner({ message }: { message: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-sm">
      <span className="text-amber-700 font-medium">{message}</span>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-500 hover:text-amber-700 ml-2"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  );
}
