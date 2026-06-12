'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type TrackerTabId = 'active' | 'settled' | 'all';
export type KnockoutRoundTabId = 'R32' | 'R16' | 'QF' | 'SF' | 'FIN';
export type TrackerStageId = 'group' | 'knockout';

const TRACKER_TABS_STORAGE_KEY = 'fifa26_tracker_tabs';

type StoredTrackerTabs = {
  stage: TrackerStageId;
  groupTab: TrackerTabId;
  knockoutRound: KnockoutRoundTabId;
};

const DEFAULT_TRACKER_TABS: StoredTrackerTabs = {
  stage: 'group',
  groupTab: 'all',
  knockoutRound: 'R32',
};

const VALID_STAGES = new Set<TrackerStageId>(['group', 'knockout']);
const VALID_GROUP_TABS = new Set<TrackerTabId>(['active', 'settled', 'all']);
const VALID_KNOCKOUT_ROUNDS = new Set<KnockoutRoundTabId>(['R32', 'R16', 'QF', 'SF', 'FIN']);

function isStoredTrackerTabs(value: unknown): value is StoredTrackerTabs {
  if (!value || typeof value !== 'object') return false;
  const tabs = value as Partial<StoredTrackerTabs>;
  return (
    typeof tabs.stage === 'string'
    && VALID_STAGES.has(tabs.stage as TrackerStageId)
    && typeof tabs.groupTab === 'string'
    && VALID_GROUP_TABS.has(tabs.groupTab as TrackerTabId)
    && typeof tabs.knockoutRound === 'string'
    && VALID_KNOCKOUT_ROUNDS.has(tabs.knockoutRound as KnockoutRoundTabId)
  );
}

function readTrackerTabsFromStorage(): StoredTrackerTabs {
  if (typeof window === 'undefined') return DEFAULT_TRACKER_TABS;
  try {
    const raw = localStorage.getItem(TRACKER_TABS_STORAGE_KEY);
    if (!raw) return DEFAULT_TRACKER_TABS;
    const parsed: unknown = JSON.parse(raw);
    return isStoredTrackerTabs(parsed) ? parsed : DEFAULT_TRACKER_TABS;
  } catch {
    return DEFAULT_TRACKER_TABS;
  }
}

function writeTrackerTabsToStorage(tabs: StoredTrackerTabs) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TRACKER_TABS_STORAGE_KEY, JSON.stringify(tabs));
}

const listeners = new Set<() => void>();
let trackerTabs = DEFAULT_TRACKER_TABS;
let storeHydrated = false;

function emitTrackerTabChange() {
  for (const listener of listeners) listener();
}

function hydrateTrackerTabStore() {
  if (storeHydrated) return;
  trackerTabs = readTrackerTabsFromStorage();
  storeHydrated = true;
}

function getTrackerTabsSnapshot(): StoredTrackerTabs {
  hydrateTrackerTabStore();
  return trackerTabs;
}

function updateTrackerTabs(patch: Partial<StoredTrackerTabs>) {
  hydrateTrackerTabStore();
  trackerTabs = { ...trackerTabs, ...patch };
  writeTrackerTabsToStorage(trackerTabs);
  emitTrackerTabChange();
}

function subscribeToTrackerTabs(listener: () => void) {
  hydrateTrackerTabStore();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTrackerTabState() {
  const tabs = useSyncExternalStore(
    subscribeToTrackerTabs,
    getTrackerTabsSnapshot,
    () => DEFAULT_TRACKER_TABS,
  );

  const setTrackerStage = useCallback((stage: TrackerStageId) => {
    updateTrackerTabs({ stage });
  }, []);

  const setGroupTab = useCallback((groupTab: TrackerTabId) => {
    updateTrackerTabs({ groupTab });
  }, []);

  const setKnockoutRound = useCallback((knockoutRound: KnockoutRoundTabId) => {
    updateTrackerTabs({ knockoutRound });
  }, []);

  return {
    trackerStage: tabs.stage,
    setTrackerStage,
    groupTab: tabs.groupTab,
    setGroupTab,
    knockoutRound: tabs.knockoutRound,
    setKnockoutRound,
  };
}
