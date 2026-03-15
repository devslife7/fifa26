'use client';

import { useState, useEffect, useCallback } from 'react';
import { TabId, MatchResult, KnockoutResult, SavedPrediction } from '@/types';
import { groups } from '@/data/teams';
import { allGroupMatches } from '@/data/matches';
import { areAllGroupsComplete, areThirdPlaceTiesResolved } from '@/lib/standings';
import { loadPredictions, savePredictions, clearKnockoutDownstream, getEditingPredictionId, getEditingPredictionName, loadFromServer, resetAllPredictions } from '@/lib/storage';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLiveData } from '@/hooks/useLiveData';
import GroupSection from '@/components/GroupSection';
import ThirdPlaceTable from '@/components/ThirdPlaceTable';
import BracketView from '@/components/BracketView';
import ProgressBar from '@/components/ProgressBar';
import BottomNav from '@/components/BottomNav';
import RankingView from '@/components/RankingView';
import PullToRefresh from '@/components/PullToRefresh';
import ProfileView from '@/components/ProfileView';
import ChampionScreen from '@/components/ChampionScreen';

export default function Home() {
  const { user } = useAuth();
  const { matchesByLocalId: liveMatchesByLocalId, groupMatchesByGroup, teamFlagsByCode, error: liveError, loading: liveLoading, rateLimited, lastUpdated, refetch } = useLiveData();
  const [showRateLimitToast, setShowRateLimitToast] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('groups');

  const [groupPredictions, setGroupPredictions] = useState<Record<string, MatchResult>>({});
  const [knockoutPredictions, setKnockoutPredictions] = useState<Record<string, KnockoutResult>>({});
  const [thirdPlaceTiebreaker, setThirdPlaceTiebreaker] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showChampionModal, setShowChampionModal] = useState(false);

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

      // Show champion screen after picking the final
      if (matchId === 'F-1') {
        setTimeout(() => {
          setShowChampionModal(true);
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
        activeTab === 'groups' ? 'max-w-[1700px] px-3 sm:px-4' :
        activeTab === 'ranking' ? 'max-w-md md:max-w-4xl px-3 sm:px-4' :
        activeTab === 'profile' ? 'max-w-2xl px-3 sm:px-4' :
        'max-w-md px-3 sm:px-4'
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
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-white/10 border border-white/10">
              <span className="material-symbols-outlined text-neutral-500 text-[16px]">edit_note</span>
              <span className="text-xs font-medium text-neutral-400">New Prediction (unsaved)</span>
            </div>
          ) : null;
        })()}

        {activeTab === 'groups' && (
          <div>
            <ProgressBar groupCount={groupCount} knockoutCount={knockoutCount} groupsComplete={groupsComplete} tiesResolved={tiesResolved} onContinueToBracket={() => { setActiveTab('bracket'); setTimeout(() => window.scrollTo({ top: 0, left: 0 }), 0); }} />

            <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={handleRandomizeGroups}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-white/10 text-neutral-300 font-semibold text-xs hover:bg-white/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">casino</span>
                  Randomize
                </button>
                <button
                  onClick={handleClearGroups}
                  disabled={groupCount === 0}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-white/10 text-neutral-400 font-semibold text-xs hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

        {activeTab === 'ranking' && (
          <RankingView
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

      {/* Champion modal */}
      {showChampionModal && (
        <div className="fixed inset-0 z-50 bg-background-dark/95 overflow-y-auto">
          <button
            onClick={() => setShowChampionModal(false)}
            className="absolute top-4 right-4 z-10 p-2 text-white/60 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
          <ChampionScreen
            groupPredictions={groupPredictions}
            knockoutPredictions={knockoutPredictions}
            thirdPlaceTiebreaker={thirdPlaceTiebreaker}
            onComplete={() => {
              setShowChampionModal(false);
              setActiveTab('profile');
              setTimeout(() => window.scrollTo({ top: 0 }), 0);
            }}
          />
        </div>
      )}

      {/* Rate limit toast */}
      {showRateLimitToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-neutral-900 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg animate-fade-in">
          <span className="material-symbols-outlined text-[15px] text-wc-amber">warning</span>
          API rate limit reached (10 req/min) — try again shortly
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}

function LiveBanner({ message }: { message: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="bg-wc-amber/15 border-b border-wc-amber/30 px-4 py-2 flex items-center justify-between text-sm">
      <span className="text-wc-amber font-medium">{message}</span>
      <button
        onClick={() => setDismissed(true)}
        className="text-wc-amber hover:text-wc-amber ml-2"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  );
}
