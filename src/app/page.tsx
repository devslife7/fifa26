'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TabId, MatchResult, KnockoutResult, SavedPrediction } from '@/types';
import { allGroupMatches } from '@/data/matches';
import { groups } from '@/data/teams';
import { generateRandomKnockoutPredictions, getAffectedR32Matches, getDownstreamMatchIds } from '@/lib/logic/bracket';
import { loadPredictions, savePredictions, getEditingPredictionName, loadFromServer, resetAllPredictions, setEditingPrediction } from '@/lib/client/storage';
import { createPredictionSnapshot, getPredictionFlowState, getSubmittedForSnapshot, markSnapshotSubmitted } from '@/lib/logic/prediction-flow';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLiveData } from '@/hooks/useLiveData';
import GroupMatchCard from '@/components/groups/GroupMatchCard';
import ThirdPlaceTable from '@/components/groups/ThirdPlaceTable';
import BracketView from '@/components/bracket/BracketView';
import BottomNav from '@/components/layout/BottomNav';
import StepperBar from '@/components/layout/StepperBar';
import SaveIndicator from '@/components/ui/SaveIndicator';
import RankingView from '@/components/ranking/RankingView';
import PullToRefresh from '@/components/ui/PullToRefresh';
import ChampionOverlay from '@/components/champion/ChampionOverlay';
import HomeView from '@/components/HomeView';
import NewsView from '@/components/news/NewsView';
import ProfileView from '@/components/profile/ProfileView';

export default function Home() {
  const { user } = useAuth();
  const { matchesByLocalId: liveMatchesByLocalId, teamFlagsByCode, error: liveError, loading: liveLoading, rateLimited, lastUpdated, refetch } = useLiveData();
  const [showRateLimitToast, setShowRateLimitToast] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('home');

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
      if (prev[matchId] === result) return prev;
      const next = { ...prev, [matchId]: result };

      // Smart clearing: only clear affected knockout predictions
      const groupLetter = matchId.split('-')[0] as import('@/types').GroupLetter;
      const affectedR32 = getAffectedR32Matches(groupLetter);
      const idsToClear = new Set<string>();
      for (const r32Id of affectedR32) {
        idsToClear.add(r32Id);
        for (const downId of getDownstreamMatchIds(r32Id)) {
          idsToClear.add(downId);
        }
      }

      setKnockoutPredictions(prevKO => {
        const nextKO = { ...prevKO };
        for (const id of idsToClear) {
          delete nextKO[id];
        }
        const predictions = loadPredictions();
        predictions.groupMatches = next;
        predictions.knockoutMatches = nextKO;
        predictions.thirdPlaceTiebreaker = [];
        savePredictions(predictions);
        return nextKO;
      });

      setThirdPlaceTiebreaker([]);
      return next;
    });
  }, []);

  const handleTiebreakerChange = useCallback((picks: string[]) => {
    setThirdPlaceTiebreaker(picks);

    // Only clear R32-13 through R32-16 + their downstream chains
    const thirdPlaceR32 = ['R32-13', 'R32-14', 'R32-15', 'R32-16'];
    const idsToClear = new Set<string>();
    for (const r32Id of thirdPlaceR32) {
      idsToClear.add(r32Id);
      for (const downId of getDownstreamMatchIds(r32Id)) {
        idsToClear.add(downId);
      }
    }

    setKnockoutPredictions(prevKO => {
      const nextKO = { ...prevKO };
      for (const id of idsToClear) {
        delete nextKO[id];
      }
      const predictions = loadPredictions();
      predictions.thirdPlaceTiebreaker = picks;
      predictions.knockoutMatches = nextKO;
      savePredictions(predictions);
      return nextKO;
    });
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
    if (autoNavTimerRef.current) {
      clearTimeout(autoNavTimerRef.current);
      autoNavTimerRef.current = null;
    }
    const predictions = loadPredictions();
    predictions.groupMatches = {};
    predictions.knockoutMatches = {};
    predictions.thirdPlaceTiebreaker = [];
    savePredictions(predictions);
    setGroupPredictions({});
    setKnockoutPredictions({});
    setThirdPlaceTiebreaker([]);
  }, []);

  const handleRandomizeBracket = useCallback(() => {
    const randomPredictions = generateRandomKnockoutPredictions(groupPredictions, thirdPlaceTiebreaker);
    setKnockoutPredictions(randomPredictions);
    const predictions = loadPredictions();
    predictions.knockoutMatches = randomPredictions;
    savePredictions(predictions);
  }, [groupPredictions, thirdPlaceTiebreaker]);

  const handleKnockoutPredict = useCallback((matchId: string, result: KnockoutResult) => {
    setKnockoutPredictions(prev => {
      const downstream = getDownstreamMatchIds(matchId);

      if (prev[matchId] === result) {
        // Deselect: remove this match and its downstream chain
        const next = { ...prev };
        delete next[matchId];
        for (const id of downstream) {
          delete next[id];
        }
        const predictions = loadPredictions();
        predictions.knockoutMatches = next;
        savePredictions(predictions);
        return next;
      }

      const next = { ...prev, [matchId]: result };
      // Clear downstream chain
      for (const id of downstream) {
        delete next[id];
      }
      const predictions = loadPredictions();
      predictions.knockoutMatches = next;
      savePredictions(predictions);

      // Auto-navigate to submit tab after picking the final
      if (matchId === 'FIN-1') {
        setTimeout(() => setActiveTab('submit'), 400);
      }

      return next;
    });
  }, []);

  useEffect(() => {
    if (!rateLimited) return;
    setShowRateLimitToast(true);
    const t = setTimeout(() => setShowRateLimitToast(false), 4000);
    return () => clearTimeout(t);
  }, [rateLimited]);

  const prevGroupCountRef = useRef<number>(-1);
  const prevTiesResolvedRef = useRef<boolean | null>(null);
  const autoNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollPositionsRef = useRef<Partial<Record<TabId, number>>>({});
  const activeTabRef = useRef<TabId>(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  const PREDICTION_TABS: TabId[] = useMemo(() => ['groups', 'bracket', 'thirdplace', 'submit'], []);
  const [lastPredictionTab, setLastPredictionTab] = useState<TabId | null>(null);

  const flowState = useMemo(
    () => getPredictionFlowState(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker),
    [groupPredictions, knockoutPredictions, thirdPlaceTiebreaker]
  );
  const groupCount = flowState.groupCount;
  const tiesResolved = flowState.thirdPlaceComplete;
  const champion = flowState.championCode;
  const predictionSnapshot = useMemo(
    () => createPredictionSnapshot(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker),
    [groupPredictions, knockoutPredictions, thirdPlaceTiebreaker]
  );
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    setIsSubmitted(getSubmittedForSnapshot(predictionSnapshot));
  }, [mounted, predictionSnapshot]);

  const navigateTo = useCallback((tab: TabId) => {
    const prev = activeTabRef.current;
    if (prev !== tab) {
      scrollPositionsRef.current[prev] = window.scrollY;
      if (PREDICTION_TABS.includes(prev)) {
        setLastPredictionTab(prev);
      }
    }
    setActiveTab(tab);
    const target = scrollPositionsRef.current[tab] ?? 0;
    requestAnimationFrame(() => window.scrollTo({ top: target }));
  }, [PREDICTION_TABS]);

  // Auto-advance when user completes the 72nd group prediction
  useEffect(() => {
    if (!mounted) return;
    const prev = prevGroupCountRef.current;
    prevGroupCountRef.current = groupCount;
    if (prev === -1) return; // skip initial load
    if (prev < 72 && groupCount === 72 && activeTab === 'groups') {
      if (autoNavTimerRef.current) clearTimeout(autoNavTimerRef.current);
      autoNavTimerRef.current = setTimeout(() => {
        autoNavTimerRef.current = null;
        if (tiesResolved) {
          setActiveTab('bracket');
        } else {
          setActiveTab('thirdplace');
        }
        setTimeout(() => window.scrollTo({ top: 0 }), 0);
      }, tiesResolved ? 400 : 300);
    }
  }, [groupCount, mounted, activeTab, tiesResolved]);

  // Auto-navigate to bracket when ties are resolved after completing all group matches
  useEffect(() => {
    if (!mounted) return;
    const prev = prevTiesResolvedRef.current;
    prevTiesResolvedRef.current = tiesResolved;
    if (prev === null) return; // skip initial load
    if (!prev && tiesResolved && groupCount >= 72 && (activeTab === 'groups' || activeTab === 'thirdplace')) {
      if (autoNavTimerRef.current) clearTimeout(autoNavTimerRef.current);
      autoNavTimerRef.current = setTimeout(() => {
        autoNavTimerRef.current = null;
        setActiveTab('bracket');
        setTimeout(() => window.scrollTo({ top: 0 }), 0);
      }, 400);
    }
  }, [tiesResolved, mounted, groupCount, activeTab]);

  const scrollToMatch = useCallback((matchId: string) => {
    const el = document.getElementById(`group-match-${matchId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleNextIncompleteGroupMatch = useCallback(() => {
    const next = allGroupMatches.find(match => !groupPredictions[match.id]);
    if (next) scrollToMatch(next.id);
  }, [groupPredictions, scrollToMatch]);

  const handleContinueAfterGroup = useCallback((group: string) => {
    const currentIndex = groups.indexOf(group as typeof groups[number]);
    const nextGroup = groups.slice(currentIndex + 1).find(g =>
      allGroupMatches.some(match => match.group === g && !groupPredictions[match.id])
    );
    const nextMatch = allGroupMatches.find(match => match.group === nextGroup && !groupPredictions[match.id]);
    if (nextMatch) scrollToMatch(nextMatch.id);
  }, [groupPredictions, scrollToMatch]);

  const handleLoadPrediction = useCallback((prediction: SavedPrediction) => {
    loadFromServer(prediction);
    const nextGroupPredictions = prediction.group_matches ?? {};
    const nextKnockoutPredictions = prediction.knockout_matches ?? {};
    const nextThirdPlaceTiebreaker = prediction.third_place_tiebreaker ?? [];
    setGroupPredictions(nextGroupPredictions);
    setKnockoutPredictions(nextKnockoutPredictions);
    setThirdPlaceTiebreaker(nextThirdPlaceTiebreaker);
    const nextFlow = getPredictionFlowState(nextGroupPredictions, nextKnockoutPredictions, nextThirdPlaceTiebreaker);
    navigateTo(nextFlow.nextPredictionTab);
  }, [navigateTo]);

  const handleNewPrediction = useCallback(() => {
    resetAllPredictions();
    localStorage.removeItem('prediction_submitted');
    localStorage.removeItem('prediction_submitted_snapshot');
    setGroupPredictions({});
    setKnockoutPredictions({});
    setThirdPlaceTiebreaker([]);
    setEditingPrediction(null);
    setIsSubmitted(false);
    navigateTo('groups');
  }, [navigateTo]);

  const handleNavigateToPredictions = useCallback((view?: TabId) => {
    navigateTo(view ?? flowState.nextPredictionTab);
  }, [flowState.nextPredictionTab, navigateTo]);

  const matchesByGroup = useMemo(() => {
    return groups.map(group => {
      const matches = allGroupMatches
        .filter(m => m.group === group)
        .sort((a, b) => {
          const dateA = liveMatchesByLocalId?.[a.id]?.utcDate ?? '';
          const dateB = liveMatchesByLocalId?.[b.id]?.utcDate ?? '';
          return dateA.localeCompare(dateB);
        });
      return { label: `Group ${group}`, matches };
    });
  }, [liveMatchesByLocalId]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <img src="/images/fifa_logo.svg" alt="FIFA World Cup 2026" className="w-12 h-12 animate-trophy-glow" />
      </div>
    );
  }

  return (
    <PullToRefresh>
    <div className="min-h-screen pb-page-safe">
      {liveError && (
        <LiveBanner message={liveError} />
      )}
      <SaveIndicator />
      {(activeTab === 'groups' || activeTab === 'bracket' || activeTab === 'thirdplace' || activeTab === 'submit') && (
        <div className="sticky top-0 z-30 bg-background-dark border-b border-white/5">
          <div className="max-w-2xl mx-auto px-3 sm:px-4">
            <StepperBar
            flowState={flowState}
            isSubmitted={isSubmitted}
            activeTab={activeTab}
            onNavigate={navigateTo}
            />
          </div>
        </div>
      )}
      <main className={`mx-auto ${
        activeTab === 'bracket' ? 'max-w-full' :
        activeTab === 'groups' || activeTab === 'thirdplace' || activeTab === 'submit' ? 'max-w-2xl px-3 sm:px-4' :
        activeTab === 'ranking' ? 'max-w-md md:max-w-4xl px-3 sm:px-4' :
        activeTab === 'profile' ? 'max-w-md px-3 sm:px-4' :
        'max-w-md px-3 sm:px-4'
      }`}>
        {activeTab === 'home' && (
          <HomeView
            flowState={flowState}
            champion={champion ?? null}
            teamFlagsByCode={teamFlagsByCode ?? {}}
            onNavigate={navigateTo}
            onManagePredictions={() => navigateTo('profile')}
            onClear={handleClearGroups}
          />
        )}

        {(activeTab === 'groups' || activeTab === 'bracket' || activeTab === 'thirdplace') && (() => {
          const editName = getEditingPredictionName();
          return editName ? (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
              <span className="material-symbols-outlined text-primary text-[16px]">edit_note</span>
              <span className="text-xs font-semibold text-primary truncate">Editing: {editName}</span>
            </div>
          ) : null;
        })()}

        {activeTab === 'groups' && (
          <div>
            <div className="mt-4">
              <div className="flex items-start justify-between gap-2 mb-0">
                <div>
                  <h2 className="text-[21px] font-black text-white">Group Stage</h2>
                  {groupCount < 72 && (
                    <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide mt-0.5">Tap a team or TIE to predict each match</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={handleNextIncompleteGroupMatch}
                    disabled={groupCount >= 72}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-primary/20 text-primary font-semibold text-[11px] hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[13px]">my_location</span>
                    Next
                  </button>
                  <button
                    onClick={handleRandomizeGroups}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-white/10 text-neutral-300 font-semibold text-[11px] hover:bg-white/5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[13px]">casino</span>
                    Randomize
                  </button>
                  <button
                    onClick={handleClearGroups}
                    disabled={groupCount === 0}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-white/10 text-neutral-400 font-semibold text-[11px] hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[13px]">backspace</span>
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-5">
              {matchesByGroup.map(section => (
                <div key={section.label}>
                  <div className="py-2 mb-2 flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{section.label}</span>
                    {(() => {
                      const picked = section.matches.filter(match => groupPredictions[match.id]).length;
                      const complete = picked === section.matches.length;
                      const hasLaterIncomplete = groups
                        .slice(groups.indexOf(section.matches[0].group) + 1)
                        .some(group => allGroupMatches.some(match => match.group === group && !groupPredictions[match.id]));
                      return (
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black tabular-nums ${complete ? 'text-wc-green' : 'text-neutral-500'}`}>
                            {picked}/{section.matches.length}
                          </span>
                          {complete && hasLaterIncomplete && (
                            <button
                              onClick={() => handleContinueAfterGroup(section.matches[0].group)}
                              className="flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-1 text-[10px] font-bold text-neutral-300 hover:bg-white/[0.10]"
                            >
                              Continue
                              <span className="material-symbols-outlined text-[12px]">arrow_downward</span>
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden">
                    {section.matches.map(match => (
                      <div key={match.id} id={`group-match-${match.id}`} className="scroll-mt-32">
                        <GroupMatchCard
                          matchId={match.id}
                          homeCode={match.home}
                          awayCode={match.away}
                          result={groupPredictions[match.id]}
                          onPredict={handleGroupPredict}
                          liveMatch={liveMatchesByLocalId?.[match.id]}
                          teamFlagsByCode={teamFlagsByCode}
                          groupLabel={match.group}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {activeTab === 'thirdplace' && (
          <ThirdPlaceTable
            predictions={groupPredictions}
            tiebreakerPicks={thirdPlaceTiebreaker}
            onTiebreakerChange={handleTiebreakerChange}
            onContinue={() => navigateTo('bracket')}
            teamFlagsByCode={teamFlagsByCode}
          />
        )}

        {activeTab === 'bracket' && (
          <BracketView
            groupPredictions={groupPredictions}
            knockoutPredictions={knockoutPredictions}
            thirdPlaceTiebreaker={thirdPlaceTiebreaker}
            onPredict={handleKnockoutPredict}
            onRandomize={handleRandomizeBracket}
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

        {activeTab === 'news' && <NewsView />}

        {activeTab === 'profile' && (
          <ProfileView
            groupPredictions={groupPredictions}
            knockoutPredictions={knockoutPredictions}
            thirdPlaceTiebreaker={thirdPlaceTiebreaker}
            onNavigate={navigateTo}
            onNavigateToPredictions={handleNavigateToPredictions}
            onLoadPrediction={handleLoadPrediction}
            onNewPrediction={handleNewPrediction}
            onClearPredictions={handleClearGroups}
          />
        )}

        {activeTab === 'submit' && (
          <ChampionOverlay
            isPage
            groupPredictions={groupPredictions}
            knockoutPredictions={knockoutPredictions}
            thirdPlaceTiebreaker={thirdPlaceTiebreaker}
            user={user ?? null}
            onDismiss={() => setActiveTab('bracket')}
            onSubmitted={() => {
              markSnapshotSubmitted(predictionSnapshot);
              setIsSubmitted(true);
            }}
            onNavigateToRanking={() => {
              navigateTo('ranking');
            }}
          />
        )}
      </main>

      {/* Bottom Nav */}
      <BottomNav
        activeTab={activeTab}
        nextPredictionTab={lastPredictionTab ?? flowState.nextPredictionTab}
        onTabChange={navigateTo}
      />

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
