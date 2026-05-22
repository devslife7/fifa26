'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TabId, MatchResult, KnockoutResult, SavedPrediction, GroupLetter } from '@/types';
import { allGroupMatches } from '@/data/matches';
import { groups } from '@/data/teams';
import {
  generateRandomKnockoutPredictions,
  getAffectedR32Matches,
  getDownstreamMatchIds,
  getBestThirdDependentR32Matches,
} from '@/lib/logic/bracket';
import { calculateGroupStandings } from '@/lib/logic/standings';
import { loadPredictions, savePredictions, getEditingPredictionName, loadFromServer, resetAllPredictions, setEditingPrediction } from '@/lib/client/storage';
import { createPredictionSnapshot, getPredictionFlowState, getSubmittedForSnapshot, markSnapshotSubmitted } from '@/lib/logic/prediction-flow';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLiveData } from '@/hooks/useLiveData';
import GroupMatchCard from '@/components/groups/GroupMatchCard';
import GroupQualifiersStrip from '@/components/groups/GroupQualifiersStrip';
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
import TrackerView from '@/components/tracker/TrackerView';

function getOrderedGroupMatches(liveMatchesByLocalId?: Record<string, { utcDate?: string } | undefined>) {
  return groups.flatMap(group =>
    allGroupMatches
      .filter(match => match.group === group)
      .sort((a, b) => {
        const dateA = liveMatchesByLocalId?.[a.id]?.utcDate ?? '';
        const dateB = liveMatchesByLocalId?.[b.id]?.utcDate ?? '';
        const dateSort = dateA.localeCompare(dateB);
        return dateSort || a.matchNumber - b.matchNumber;
      })
  );
}

const ACTIVE_TAB_STORAGE_KEY = 'fifa26_active_tab';
const VALID_TABS: TabId[] = ['groups', 'bracket', 'thirdplace', 'ranking', 'home', 'news', 'submit', 'profile', 'tracker'];

function isTabId(value: string | null): value is TabId {
  return VALID_TABS.includes(value as TabId);
}

export default function Home() {
  const { user } = useAuth();
  const { matchesByLocalId: liveMatchesByLocalId, teamFlagsByCode, error: liveError, loading: liveLoading, rateLimited, lastUpdated, refetch } = useLiveData();
  const [showRateLimitToast, setShowRateLimitToast] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('home');

  const [groupPredictions, setGroupPredictions] = useState<Record<string, MatchResult>>({});
  const [knockoutPredictions, setKnockoutPredictions] = useState<Record<string, KnockoutResult>>({});
  const [thirdPlaceTiebreaker, setThirdPlaceTiebreaker] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [focusedMatchId, setFocusedMatchId] = useState<string | null>(null);
  const focusClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoScrollTimerRef = useRef<number | null>(null);
  const [userExpandedGroups, setUserExpandedGroups] = useState<Set<GroupLetter>>(new Set());
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const toggleGroupExpanded = useCallback((group: GroupLetter) => {
    setUserExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);

  const getAutoScrollBehavior = useCallback((): ScrollBehavior => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }, []);

  const scrollToElement = useCallback((id: string, force = true): boolean => {
    const el = document.getElementById(id);
    if (!el) return false;

    const targetEl = el.querySelector<HTMLElement>('[data-prediction-choice-area]') ?? el;
    const rect = targetEl.getBoundingClientRect();
    const stickyHeader = document.querySelector('.sticky.top-0');
    const stickyBottom = stickyHeader?.getBoundingClientRect().bottom ?? 0;
    const bottomNavTop = document.querySelector<HTMLElement>('nav.fixed.bottom-0')?.getBoundingClientRect().top ?? window.innerHeight;
    const topInset = Math.max(88, stickyBottom + 14);
    const bottomInset = Math.max(96, window.innerHeight - bottomNavTop + 16);
    const availableHeight = Math.max(180, window.innerHeight - topInset - bottomInset);
    const comfortablyVisible =
      rect.top >= topInset &&
      (rect.height > availableHeight || rect.bottom <= window.innerHeight - bottomInset);

    if (!force && comfortablyVisible) return true;

    const viewportTargetCenter = topInset + availableHeight / 2;
    const elementCenter = window.scrollY + rect.top + rect.height / 2;
    const targetTop = Math.max(0, elementCenter - viewportTargetCenter);
    window.scrollTo({ top: targetTop, behavior: getAutoScrollBehavior() });
    return true;
  }, [getAutoScrollBehavior]);

  const scrollGroupSummaryIntoView = useCallback((group: GroupLetter): boolean => {
    const el = document.getElementById(`group-section-${group}`);
    if (!el) return false;

    const targetEl = el.querySelector<HTMLElement>('[data-group-summary-area]');
    if (!targetEl) return false;

    const rect = targetEl.getBoundingClientRect();
    const stickyHeader = document.querySelector('.sticky.top-0');
    const stickyBottom = stickyHeader?.getBoundingClientRect().bottom ?? 0;
    const topInset = Math.max(88, stickyBottom + 14);
    const targetTop = window.scrollY + rect.top - topInset;

    window.scrollTo({ top: Math.max(0, targetTop), behavior: getAutoScrollBehavior() });
    return true;
  }, [getAutoScrollBehavior]);

  const scheduleScrollToElement = useCallback((id: string, force = true) => {
    if (autoScrollTimerRef.current) clearTimeout(autoScrollTimerRef.current);

    let attempts = 0;
    const tryScroll = () => {
      if (scrollToElement(id, force)) {
        autoScrollTimerRef.current = null;
        return;
      }
      attempts += 1;
      if (attempts <= 6) {
        autoScrollTimerRef.current = window.setTimeout(tryScroll, 60);
      } else {
        autoScrollTimerRef.current = null;
      }
    };

    requestAnimationFrame(tryScroll);
  }, [scrollToElement]);

  const scheduleScrollToGroupSummary = useCallback((group: GroupLetter) => {
    if (autoScrollTimerRef.current) clearTimeout(autoScrollTimerRef.current);

    let attempts = 0;
    const tryScroll = () => {
      if (scrollGroupSummaryIntoView(group)) {
        autoScrollTimerRef.current = null;
        return;
      }
      attempts += 1;
      if (attempts <= 6) {
        autoScrollTimerRef.current = window.setTimeout(tryScroll, 60);
      } else {
        autoScrollTimerRef.current = null;
      }
    };

    requestAnimationFrame(tryScroll);
  }, [scrollGroupSummaryIntoView]);

  const scrollToMatch = useCallback((matchId: string, force = true) => {
    scheduleScrollToElement(`group-match-${matchId}`, force);
  }, [scheduleScrollToElement]);

  const scrollToGroupSummary = useCallback((group: GroupLetter) => {
    scheduleScrollToGroupSummary(group);
  }, [scheduleScrollToGroupSummary]);

  const triggerAutoAdvance = useCallback((matchId: string, forceScroll = true) => {
    if (focusClearTimerRef.current) clearTimeout(focusClearTimerRef.current);
    setFocusedMatchId(matchId);
    scrollToMatch(matchId, forceScroll);
    focusClearTimerRef.current = setTimeout(() => {
      setFocusedMatchId(null);
      focusClearTimerRef.current = null;
    }, 1200);
  }, [scrollToMatch]);

  // Load local predictions on mount
  useEffect(() => {
    const saved = loadPredictions();
    const savedTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    setGroupPredictions(saved.groupMatches);
    setKnockoutPredictions(saved.knockoutMatches);
    setThirdPlaceTiebreaker(saved.thirdPlaceTiebreaker ?? []);
    if (isTabId(savedTab)) {
      setActiveTab(savedTab);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab, mounted]);

  const orderedGroupMatches = useMemo(() => {
    return getOrderedGroupMatches(liveMatchesByLocalId);
  }, [liveMatchesByLocalId]);

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
      const wasEmpty = prev[matchId] === undefined;
      const next = { ...prev, [matchId]: result };

      // Smart clearing: only clear affected knockout predictions
      const groupLetter = matchId.split('-')[0] as GroupLetter;
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

      // Auto-advance: when filling an empty slot, focus + scroll to the next undecided match
      if (wasEmpty) {
        const groupMatches = orderedGroupMatches.filter(m => m.group === groupLetter);
        const completedGroup = groupMatches.every(m => next[m.id]);
        if (completedGroup) {
          scrollToGroupSummary(groupLetter);
        } else {
          const clickedIndex = orderedGroupMatches.findIndex(m => m.id === matchId);
          const matchesAfterClick = clickedIndex >= 0 ? orderedGroupMatches.slice(clickedIndex + 1) : [];
          const nextMatch = matchesAfterClick.find(m => !next[m.id])
            ?? orderedGroupMatches.find(m => !next[m.id]);
          if (!nextMatch) return next;
          triggerAutoAdvance(nextMatch.id);
        }
      }

      return next;
    });
  }, [orderedGroupMatches, scrollToGroupSummary, triggerAutoAdvance]);

  const handleTiebreakerChange = useCallback((picks: string[]) => {
    setThirdPlaceTiebreaker(picks);

    // Clear all R32 matches whose source includes a best-third qualifier,
    // plus everything downstream.
    const idsToClear = new Set<string>();
    for (const r32Id of getBestThirdDependentR32Matches()) {
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
    setEditingPrediction(null);
    setGroupPredictions({});
    setKnockoutPredictions({});
    setThirdPlaceTiebreaker([]);
    setUserExpandedGroups(new Set());
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
  const readyForBracket = flowState.groupsComplete && flowState.thirdPlaceComplete;
  const needsThirdPlaceInput = flowState.groupsComplete && flowState.thirdPlaceRequired && !flowState.thirdPlaceComplete;
  const champion = flowState.championCode;
  const predictionSnapshot = useMemo(
    () => createPredictionSnapshot(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker),
    [groupPredictions, knockoutPredictions, thirdPlaceTiebreaker]
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);

  useEffect(() => {
    if (!mounted) return;
    setIsSubmitted(getSubmittedForSnapshot(predictionSnapshot));
  }, [mounted, predictionSnapshot]);

  useEffect(() => {
    if (!user || !isSubmitted) {
      setUserRank(null);
      setTotalUsers(null);
      return;
    }
    let cancelled = false;
    fetch('/api/leaderboard')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('failed'))))
      .then((data: { leaderboard?: Array<{ user_id: string }> }) => {
        if (cancelled) return;
        const entries = data.leaderboard ?? [];
        const idx = entries.findIndex(e => e.user_id === user.id);
        setTotalUsers(entries.length || null);
        setUserRank(idx >= 0 ? idx + 1 : null);
      })
      .catch(() => {
        if (cancelled) return;
        setUserRank(null);
        setTotalUsers(null);
      });
    return () => { cancelled = true; };
  }, [user, isSubmitted]);

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
    if (prev < 72 && groupCount === 72 && activeTab === 'groups' && flowState.groupsComplete) {
      if (autoNavTimerRef.current) clearTimeout(autoNavTimerRef.current);
      autoNavTimerRef.current = setTimeout(() => {
        autoNavTimerRef.current = null;
        if (needsThirdPlaceInput) {
          setActiveTab('thirdplace');
        } else {
          setActiveTab('bracket');
        }
        setTimeout(() => window.scrollTo({ top: 0 }), 0);
      }, needsThirdPlaceInput ? 300 : 400);
    }
  }, [groupCount, mounted, activeTab, flowState.groupsComplete, needsThirdPlaceInput]);

  // Auto-navigate after group and third-place ties are resolved.
  useEffect(() => {
    if (!mounted) return;
    const prev = prevTiesResolvedRef.current;
    prevTiesResolvedRef.current = readyForBracket;
    if (prev === null) return; // skip initial load
    if (prev === readyForBracket) return;

    const currentTab = activeTabRef.current;
    if (groupCount >= 72 && (currentTab === 'groups' || currentTab === 'thirdplace')) {
      const target = readyForBracket ? 'bracket' : needsThirdPlaceInput ? 'thirdplace' : null;
      if (!target || target === currentTab) return;
      if (autoNavTimerRef.current) clearTimeout(autoNavTimerRef.current);
      autoNavTimerRef.current = setTimeout(() => {
        autoNavTimerRef.current = null;
        setActiveTab(target);
        setTimeout(() => window.scrollTo({ top: 0 }), 0);
      }, 400);
    }
  }, [readyForBracket, needsThirdPlaceInput, mounted, groupCount]);

  const handleNextIncompleteGroupMatch = useCallback(() => {
    const next = orderedGroupMatches.find(match => !groupPredictions[match.id]);
    if (next) scrollToMatch(next.id);
  }, [groupPredictions, orderedGroupMatches, scrollToMatch]);

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

  const handlePullRefresh = useCallback(async () => {
    if (activeTab === 'news') {
      await new Promise<void>(resolve => {
        const timeout = window.setTimeout(resolve, 8000);
        window.dispatchEvent(new CustomEvent('news:refresh', {
          detail: {
            done: () => {
              window.clearTimeout(timeout);
              resolve();
            },
          },
        }));
      });
      return;
    }
    await refetch();
  }, [activeTab, refetch]);

  const matchesByGroup = useMemo(() => {
    return groups.map(group => {
      const matches = orderedGroupMatches.filter(m => m.group === group);
      return { label: `Group ${group}`, matches };
    });
  }, [orderedGroupMatches]);

  const { liveMatch, nextMatch, userPickForNextMatch } = useMemo(() => {
    const entries = Object.values(liveMatchesByLocalId ?? {});
    const live = entries
      .filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED')
      .sort((a, b) => a.utcDate.localeCompare(b.utcDate))[0] ?? null;
    const upcoming = entries
      .filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED')
      .sort((a, b) => a.utcDate.localeCompare(b.utcDate))[0] ?? null;
    const pickTarget = upcoming?.localMatchId;
    const pick = pickTarget ? groupPredictions[pickTarget] : undefined;
    return { liveMatch: live, nextMatch: upcoming, userPickForNextMatch: pick };
  }, [liveMatchesByLocalId, groupPredictions]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <img src="/images/fifa_logo.svg" alt="FIFA World Cup 2026" className="w-12 h-12 animate-trophy-glow" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handlePullRefresh}>
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
        activeTab === 'home' ? 'max-w-md md:max-w-5xl px-3 sm:px-4' :
        'max-w-md px-3 sm:px-4'
      }`}>
        {activeTab === 'home' && (
          <HomeView
            flowState={flowState}
            champion={champion ?? null}
            teamFlagsByCode={teamFlagsByCode ?? {}}
            liveMatch={liveMatch}
            nextMatch={nextMatch}
            userPickForNextMatch={userPickForNextMatch}
            isSubmitted={isSubmitted}
            userRank={userRank}
            totalUsers={totalUsers}
            onNavigate={navigateTo}
            onManagePredictions={() => navigateTo('profile')}
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

        {activeTab === 'groups' && (() => {
          const totalGroups = matchesByGroup.length;
          return (
          <div>
            <div className="mt-4">
              <h2 className="text-[21px] font-black text-white">Group Stage</h2>
              {groupCount === 0 && (
                <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide mt-0.5">Tap a team or TIE to predict each match</p>
              )}
              <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setShowClearConfirm(true)}
                  disabled={groupCount === 0}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/10 text-neutral-400 font-semibold text-[11px] hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[13px]">backspace</span>
                  Clear all predictions
                </button>
                <button
                  onClick={handleRandomizeGroups}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/10 text-neutral-300 font-semibold text-[11px] hover:bg-white/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[13px]">casino</span>
                  Randomize
                </button>
                <button
                  onClick={handleNextIncompleteGroupMatch}
                  disabled={groupCount >= 72}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border border-primary/20 text-primary font-semibold text-[11px] hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[13px]">my_location</span>
                  Continue
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-5">
              {matchesByGroup.map((section, idx) => {
                const groupLetter = section.matches[0].group;
                const picked = section.matches.filter(match => groupPredictions[match.id]).length;
                const complete = picked === section.matches.length;
                const standings = calculateGroupStandings(groupLetter, groupPredictions);
                const collapsed = complete && !userExpandedGroups.has(groupLetter);
                return (
                  <div key={section.label} id={`group-section-${groupLetter}`}>
                    <div className="py-2 mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                        {section.label}
                        <span className="ml-2 tabular-nums">
                          ({idx + 1}/{totalGroups})
                        </span>
                      </span>
                    </div>
                    {collapsed ? (
                      <div data-group-summary-area>
                        <GroupQualifiersStrip
                          group={groupLetter}
                          standings={standings}
                          expanded={false}
                          onToggle={() => toggleGroupExpanded(groupLetter)}
                          teamFlagsByCode={teamFlagsByCode}
                          thirdPlaceRelevant={flowState.thirdPlaceRequired}
                        />
                      </div>
                    ) : (
                      <div className="bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden">
                        {complete && (
                          <button
                            onClick={() => toggleGroupExpanded(groupLetter)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.06] transition-colors border-b border-white/5"
                          >
                            <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                              Group {groupLetter} · Complete
                            </span>
                            <span className="material-symbols-outlined text-[18px] text-neutral-400">expand_less</span>
                          </button>
                        )}
                        {section.matches.map(match => (
                          <div key={match.id} id={`group-match-${match.id}`} className="scroll-mt-32">
                            <GroupMatchCard
                              matchId={match.id}
                              homeCode={match.home}
                              awayCode={match.away}
                              result={groupPredictions[match.id]}
                              onPredict={handleGroupPredict}
                              focused={focusedMatchId === match.id}
                              liveMatch={liveMatchesByLocalId?.[match.id]}
                              teamFlagsByCode={teamFlagsByCode}
                              groupLabel={match.group}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
          );
        })()}

        {activeTab === 'thirdplace' && (
          <ThirdPlaceTable
            predictions={groupPredictions}
            tiebreakerPicks={thirdPlaceTiebreaker}
            onTiebreakerChange={handleTiebreakerChange}
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

        {activeTab === 'tracker' && (
          <TrackerView
            liveMatches={liveMatchesByLocalId}
            teamFlagsByCode={teamFlagsByCode}
            onNavigate={navigateTo}
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

      {/* Clear all predictions confirmation */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6 animate-fade-in"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-white/10 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-base">Clear all predictions?</h3>
            <p className="mt-1 text-neutral-400 text-sm">This will remove every group stage and bracket pick. This can&rsquo;t be undone.</p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-white/10 text-neutral-200 font-semibold text-sm hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { handleClearGroups(); setShowClearConfirm(false); }}
                className="flex-1 py-2.5 rounded-lg bg-wc-red text-white font-semibold text-sm hover:bg-wc-red/90 transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>
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
