'use client';

import { useState, useEffect, useCallback } from 'react';
import { TabId, MatchResult, KnockoutResult } from '@/types';
import { groups } from '@/data/teams';
import { allGroupMatches } from '@/data/matches';
import { areAllGroupsComplete, areThirdPlaceTiesResolved } from '@/lib/standings';
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
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            groupPredictions={groupPredictions}
            knockoutPredictions={knockoutPredictions}
            thirdPlaceTiebreaker={thirdPlaceTiebreaker}
            onNavigate={setActiveTab}
            onResetPredictions={() => {
              setGroupPredictions({});
              setKnockoutPredictions({});
              setThirdPlaceTiebreaker([]);
              savePredictions({ groupMatches: {}, knockoutMatches: {}, thirdPlaceTiebreaker: [] });
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

function ProfileView({ groupPredictions, knockoutPredictions, thirdPlaceTiebreaker, onNavigate, onResetPredictions }: {
  groupPredictions: Record<string, MatchResult>;
  knockoutPredictions: Record<string, KnockoutResult>;
  thirdPlaceTiebreaker?: string[];
  onNavigate: (tab: TabId) => void;
  onResetPredictions: () => void;
}) {
  const { user, signOut, updateDisplayName } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);

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

  const totalKnockout = 48;
  const totalPredictions = totalGroups + totalKnockout;
  const completedPredictions = groupCount + knockoutCount;
  const completionPercent = totalPredictions > 0 ? Math.round((completedPredictions / totalPredictions) * 100) : 0;
  const groupsComplete = groupCompletion.filter(g => g.complete).length;

  const displayName = user?.user_metadata?.display_name || 'Player';
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

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

        {/* Completion bar inside hero */}
        {hasPredictions && (
          <div className="relative mt-5 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Progress</span>
              <span className="text-xs font-bold text-primary">{completionPercent}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[11px] text-white/30">{groupCount}/{totalGroups} groups</span>
              <span className="text-[11px] text-white/30">{knockoutCount}/{totalKnockout} knockout</span>
            </div>
          </div>
        )}
      </div>

      {/* Champion Section */}
      <ChampionScreen
        groupPredictions={groupPredictions}
        knockoutPredictions={knockoutPredictions}
        thirdPlaceTiebreaker={thirdPlaceTiebreaker}
      />

      {/* Predictions Breakdown */}
      {hasPredictions ? (
        <div className="space-y-3">
          {/* Group Stage Card */}
          <button
            onClick={() => onNavigate('groups')}
            className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-5 text-left hover:border-primary/30 transition-colors group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-xl">trophy</span>
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900">Group Stage</span>
                  <p className="text-[11px] text-slate-400">{groupsComplete}/12 groups complete</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-300 text-[20px] group-hover:text-primary transition-colors">arrow_forward</span>
            </div>
            <div className="grid grid-cols-6 gap-x-2 gap-y-3">
              {groupCompletion.map(g => (
                <div key={g.group} className="flex flex-col items-center gap-1.5">
                  <div className="relative w-10 h-10 rounded-xl flex items-center justify-center">
                    {/* Background ring */}
                    <svg className="absolute inset-0 w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                      <circle cx="20" cy="20" r="16" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                      <circle
                        cx="20" cy="20" r="16" fill="none"
                        stroke={g.complete ? '#f9d406' : g.count > 0 ? '#f59e0b' : 'transparent'}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${(g.count / g.total) * 100.5} 100.5`}
                      />
                    </svg>
                    <span className={`relative text-xs font-bold ${
                      g.complete ? 'text-primary' : g.count > 0 ? 'text-amber-500' : 'text-slate-400'
                    }`}>{g.group}</span>
                  </div>
                </div>
              ))}
            </div>
          </button>

          {/* Knockout Card */}
          {knockoutCount > 0 && (
            <button
              onClick={() => onNavigate('bracket')}
              className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-5 text-left hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-500 text-xl">account_tree</span>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900">Knockout Bracket</span>
                    <p className="text-[11px] text-slate-400">{knockoutCount}/{totalKnockout} matches predicted</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-300 text-[20px] group-hover:text-emerald-500 transition-colors">arrow_forward</span>
              </div>
            </button>
          )}

          {/* Reset */}
          <div className="pt-1">
            {confirmReset ? (
              <div className="bg-red-50 rounded-2xl border border-red-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="material-symbols-outlined text-red-500 text-xl">warning</span>
                  <p className="text-sm text-red-700 font-semibold">Reset all predictions? This cannot be undone.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { onResetPredictions(); setConfirmReset(false); }}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors"
                  >
                    Reset Everything
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                  >
                    Keep
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-slate-400 font-medium text-sm hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                Start Over
              </button>
            )}
          </div>
        </div>
      ) : (
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
