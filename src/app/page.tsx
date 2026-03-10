'use client';

import { useState, useEffect, useCallback } from 'react';
import { TabId, MatchResult, KnockoutResult } from '@/types';
import { groups } from '@/data/teams';
import { areAllGroupsComplete } from '@/lib/standings';
import { loadPredictions, savePredictions, clearKnockoutDownstream } from '@/lib/storage';
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

export default function Home() {
  const { user } = useAuth();
  const { matchesByLocalId: liveMatchesByLocalId, groupMatchesByGroup, teamFlagsByCode, error: liveError, loading: liveLoading, lastUpdated, refetch } = useLiveData();
  const [activeTab, setActiveTab] = useState<TabId>('groups');

  const [groupPredictions, setGroupPredictions] = useState<Record<string, MatchResult>>({});
  const [knockoutPredictions, setKnockoutPredictions] = useState<Record<string, KnockoutResult>>({});
  const [mounted, setMounted] = useState(false);

  // Load local predictions on mount
  useEffect(() => {
    const saved = loadPredictions();
    setGroupPredictions(saved.groupMatches);
    setKnockoutPredictions(saved.knockoutMatches);
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
          if (data.predictions) {
            const serverPreds = data.predictions;
            const hydrated = {
              groupMatches: serverPreds.group_matches ?? {},
              knockoutMatches: serverPreds.knockout_matches ?? {},
            };
            savePredictions(hydrated);
            setGroupPredictions(hydrated.groupMatches);
            setKnockoutPredictions(hydrated.knockoutMatches);
          }
        })
        .catch(() => {});
    }
  }, [user, mounted]);

  const handleGroupPredict = useCallback((matchId: string, result: MatchResult) => {
    setGroupPredictions(prev => {
      const next = { ...prev, [matchId]: result };
      // Save
      const predictions = loadPredictions();
      predictions.groupMatches = next;
      // When a group prediction changes, clear all knockout predictions
      // as the bracket teams may have changed
      predictions.knockoutMatches = {};
      savePredictions(predictions);
      setKnockoutPredictions({});
      return next;
    });
  }, []);

  const handleKnockoutPredict = useCallback((matchId: string, result: KnockoutResult) => {
    setKnockoutPredictions(prev => {
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
      return cleaned;
    });
  }, []);

  const groupCount = Object.keys(groupPredictions).length;
  const knockoutCount = Object.keys(knockoutPredictions).length;
  const groupsComplete = areAllGroupsComplete(groupPredictions);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-trophy-glow">🏆</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {liveError && (
        <LiveBanner message={liveError} />
      )}
      <main className={`mx-auto pb-8 ${
        activeTab === 'bracket' ? 'max-w-full' :
        activeTab === 'groups' ? 'max-w-md md:max-w-5xl px-4' :
        activeTab === 'ranking' ? 'max-w-md md:max-w-4xl px-4' :
        activeTab === 'profile' ? 'max-w-md px-4' :
        'max-w-md px-4'
      }`}>
        {activeTab === 'groups' && (
          <div>
            <ProgressBar groupCount={groupCount} knockoutCount={knockoutCount} />

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
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

            <ThirdPlaceTable predictions={groupPredictions} />

            <div className="mt-8 mb-4">
              <button
                onClick={() => groupsComplete && setActiveTab('bracket')}
                disabled={!groupsComplete}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue to Bracket
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
              {!groupsComplete && (
                <p className="text-center text-[11px] text-slate-400 mt-2">Complete all group predictions to continue</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'bracket' && (
          <BracketView
            groupPredictions={groupPredictions}
            knockoutPredictions={knockoutPredictions}
            onPredict={handleKnockoutPredict}
            liveMatches={liveMatchesByLocalId}
            teamFlagsByCode={teamFlagsByCode}
          />
        )}

        {activeTab === 'ranking' && (
          <RankingView
            lastUpdated={lastUpdated}
            liveLoading={liveLoading}
            onRefreshScores={refetch}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            groupPredictions={groupPredictions}
            knockoutPredictions={knockoutPredictions}
            onNavigate={setActiveTab}
            onResetPredictions={() => {
              setGroupPredictions({});
              setKnockoutPredictions({});
              savePredictions({ groupMatches: {}, knockoutMatches: {} });
            }}
          />
        )}
      </main>

      {/* Bottom Nav */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        groupsComplete={groupsComplete}
      />
    </div>
  );
}

function ProfileView({ groupPredictions, knockoutPredictions, onNavigate, onResetPredictions }: {
  groupPredictions: Record<string, MatchResult>;
  knockoutPredictions: Record<string, KnockoutResult>;
  onNavigate: (tab: TabId) => void;
  onResetPredictions: () => void;
}) {
  const { user, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const groupCount = Object.keys(groupPredictions).length;
  const knockoutCount = Object.keys(knockoutPredictions).length;
  const totalGroups = 72; // 12 groups × 6 matches
  const hasPredictions = groupCount > 0 || knockoutCount > 0;

  // Per-group completion
  const groupLetters = ['A','B','C','D','E','F','G','H','I','J','K','L'] as const;
  const groupCompletion = groupLetters.map(g => {
    const count = Object.keys(groupPredictions).filter(k => k.startsWith(`${g}-`)).length;
    return { group: g, count, total: 6, complete: count === 6 };
  });

  return (
    <div className="pt-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      </header>

      {/* Auth section */}
      {user ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl font-variation-fill">person</span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">
                {user.user_metadata?.display_name || 'Player'}
              </p>
              <p className="text-sm text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-400 text-xl">person_off</span>
              </div>
              <p className="text-sm text-slate-500">Not signed in</p>
            </div>
            <button
              onClick={() => setShowAuth(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-black font-bold text-xs hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              Sign in
            </button>
          </div>
        </div>
      )}

      {/* Predictions summary */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Your Predictions</h2>
          {hasPredictions && (
            <span className="text-[11px] text-slate-400">{groupCount}/{totalGroups} groups · {knockoutCount} knockout</span>
          )}
        </div>

        {hasPredictions ? (
          <>
            {/* Group predictions grid */}
            <button
              onClick={() => onNavigate('groups')}
              className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-left hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-700">Group Stage</span>
                <span className="material-symbols-outlined text-slate-400 text-[18px]">arrow_forward</span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {groupCompletion.map(g => (
                  <div key={g.group} className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                      g.complete
                        ? 'bg-primary/15 text-primary'
                        : g.count > 0
                          ? 'bg-amber-50 text-amber-500'
                          : 'bg-slate-100 text-slate-400'
                    }`}>
                      {g.group}
                    </div>
                    <span className="text-[9px] text-slate-400">{g.count}/{g.total}</span>
                  </div>
                ))}
              </div>
            </button>

            {/* Knockout predictions */}
            {knockoutCount > 0 && (
              <button
                onClick={() => onNavigate('bracket')}
                className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-left hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-slate-700">Knockout Bracket</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">{knockoutCount} matches predicted</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">arrow_forward</span>
                </div>
              </button>
            )}

            {/* Champion */}
            <ChampionScreen
              groupPredictions={groupPredictions}
              knockoutPredictions={knockoutPredictions}
            />
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center">
            <span className="material-symbols-outlined text-slate-300 text-4xl mb-3 block">sports_soccer</span>
            <p className="text-sm text-slate-500 mb-4">No predictions yet. Start by picking group match winners.</p>
            <button
              onClick={() => onNavigate('groups')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">play_arrow</span>
              Start Predicting
            </button>
          </div>
        )}

        {/* New predictions / Reset */}
        {hasPredictions && (
          <div className="pt-2">
            {confirmReset ? (
              <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                <p className="text-sm text-red-700 font-medium mb-3">Reset all predictions? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { onResetPredictions(); setConfirmReset(false); }}
                    className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-500 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                New Predictions
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sign out */}
      {user && (
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3 mt-8 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Sign out
        </button>
      )}

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuthenticated={() => setShowAuth(false)}
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
