'use client';

import { useState, useEffect } from 'react';
import { LeaderboardEntry, LeaderboardPrediction, SavedPrediction, MatchResult, LiveMatch } from '@/types';
import { teamsByCode } from '@/data/teams';
import { allGroupMatches } from '@/data/matches';
import { detectThirdPlaceTie } from '@/lib/logic/standings';
import { useAuth } from '@/components/providers/AuthProvider';
import PublicPredictionProfileModal from './PublicPredictionProfileModal';
import PredictionCompareModal from './PredictionCompareModal';
import ScoringExplainer from '@/components/scoring/ScoringExplainer';

const PLACEHOLDER_USERS: LeaderboardEntry[] = [
  { user_id: 'p1', display_name: 'Mateo Hernandez', total_points: 87, champion_code: 'BR', calculated_at: '', position_change: 0 },
  { user_id: 'p2', display_name: 'Sarah Jenkins', total_points: 82, champion_code: 'FR', calculated_at: '', position_change: 1 },
  { user_id: 'p3', display_name: 'Luca Rossi', total_points: 76, champion_code: 'IT', calculated_at: '', position_change: -1 },
];

function getLeaderboardEntryKey(entry: LeaderboardEntry, index: number): string {
  return entry.prediction_id ?? `${entry.user_id ?? 'prediction'}-${entry.prediction_number ?? index}`;
}

function getLeaderboardEntryName(entry: LeaderboardEntry): string {
  return entry.name?.trim() || entry.display_name;
}

function getPredictionCardNames(pred: LeaderboardPrediction) {
  const accountName = pred.display_name && pred.display_name !== 'Unknown' ? pred.display_name : null;
  const predictionName = pred.name?.trim() || null;
  const primaryName = predictionName || accountName || 'Anonymous';
  const secondaryName = accountName && accountName !== primaryName ? accountName : null;

  return { primaryName, secondaryName };
}

function savedPredictionToLeaderboardPrediction(prediction: SavedPrediction, userId: string, displayName: string): LeaderboardPrediction {
  return {
    prediction_number: prediction.prediction_number,
    name: prediction.name,
    user_id: userId,
    display_name: displayName,
    champion_code: prediction.champion_code,
    group_matches: prediction.group_matches ?? {},
    knockout_matches: prediction.knockout_matches ?? {},
    third_place_tiebreaker: prediction.third_place_tiebreaker,
    is_approved: prediction.is_approved ?? false,
    created_at: prediction.created_at,
    updated_at: prediction.updated_at,
  };
}

// Generate placeholder predictions from PLACEHOLDER_USERS
function generatePlaceholderPredictions(): LeaderboardPrediction[] {
  const results: MatchResult[] = ['home', 'draw', 'away'];
  return PLACEHOLDER_USERS.map((u, ui) => {
    const gm: Record<string, MatchResult> = {};
    allGroupMatches.forEach((m, mi) => {
      gm[m.id] = results[(ui + mi) % 3];
    });
    const km: Record<string, 'home' | 'away'> = {};
    for (let i = 0; i < 16; i++) {
      km[`R32-${i + 1}`] = (ui + i) % 2 === 0 ? 'home' : 'away';
    }
    for (let i = 0; i < 8; i++) {
      km[`R16-${i + 1}`] = (ui + i + 1) % 2 === 0 ? 'home' : 'away';
    }
    for (let i = 0; i < 4; i++) {
      km[`QF-${i + 1}`] = (ui + i + 2) % 2 === 0 ? 'home' : 'away';
    }
    for (let i = 0; i < 2; i++) {
      km[`SF-${i + 1}`] = (ui + i + 3) % 2 === 0 ? 'home' : 'away';
    }
    km['3RD-1'] = ui % 2 === 0 ? 'home' : 'away';
    km['FIN-1'] = (ui + 1) % 2 === 0 ? 'home' : 'away';
    // Compute third-place tiebreaker so the bracket can resolve
    const { tied, slotsToFill } = detectThirdPlaceTie(gm);
    const tiebreaker = slotsToFill > 0 ? tied.slice(0, slotsToFill).map(t => t.team) : null;
    return {
      user_id: u.user_id ?? `placeholder-${ui + 1}`,
      display_name: u.display_name,
      champion_code: u.champion_code,
      group_matches: gm,
      knockout_matches: km,
      third_place_tiebreaker: tiebreaker,
      is_approved: ui % 2 === 0,
    };
  });
}

interface RankingViewProps {
  liveMatches?: Record<string, LiveMatch>;
  teamFlagsByCode?: Record<string, string>;
}

export default function RankingView({ liveMatches, teamFlagsByCode }: RankingViewProps) {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [predictions, setPredictions] = useState<LeaderboardPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [usePlaceholder, setUsePlaceholder] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedPrediction, setSelectedPrediction] = useState<LeaderboardPrediction | null>(null);
  const [selectedRank, setSelectedRank] = useState<number | undefined>(undefined);
  const [comparisonBasePrediction, setComparisonBasePrediction] = useState<LeaderboardPrediction | null>(null);
  const [selectedComparePrediction, setSelectedComparePrediction] = useState<LeaderboardPrediction | null>(null);
  const [selectedCompareRank, setSelectedCompareRank] = useState<number | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => data.leaderboard ?? [])
      .catch(() => []);

    const fetchPredictions = fetch('/api/leaderboard/predictions')
      .then(res => res.json())
      .then(data => ({ predictions: data.predictions ?? [], totalUsers: data.total_users ?? 0 }))
      .catch(() => ({ predictions: [], totalUsers: 0 }));

    const fetchMyPredictions = user
      ? fetch('/api/predictions')
          .then(res => res.json())
          .then(data => (data.predictions ?? []) as SavedPrediction[])
          .catch(() => [] as SavedPrediction[])
      : Promise.resolve([] as SavedPrediction[]);

    Promise.all([fetchLeaderboard, fetchPredictions, fetchMyPredictions]).then(([entries, { predictions: preds, totalUsers: total }, myPreds]) => {
      if (entries.length === 0) {
        setLeaderboard(PLACEHOLDER_USERS);
        setUsePlaceholder(true);
      } else {
        setLeaderboard(entries);
      }

      // Build all of the user's completed predictions as LeaderboardPredictions
      const displayName = user?.display_name ?? 'You';
      const myLeaderboardPreds: LeaderboardPrediction[] = user
        ? myPreds
            .filter((p: SavedPrediction) => p.is_complete)
            .map((p: SavedPrediction) => savedPredictionToLeaderboardPrediction(p, user.id, displayName))
        : [];

      if (preds.length === 0) {
        setPredictions(myLeaderboardPreds);
        setTotalUsers(myLeaderboardPreds.length);
      } else {
        // Merge user's predictions that aren't already in the leaderboard data.
        // preds[].user_id is synthetic (`prediction-<n>`), so dedupe by prediction_number.
        const existing = new Set(preds.map((p: LeaderboardPrediction) => p.prediction_number));
        const missing = myLeaderboardPreds.filter(p => !existing.has(p.prediction_number));
        setPredictions([...missing, ...preds]);
        setTotalUsers(total || preds.length);
      }
      setLoading(false);
    });
  }, [user]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetch('/api/football/matches?force=true', { cache: 'no-store' });
      const [lbRes, predsRes, myPredsRes] = await Promise.all([
        fetch('/api/leaderboard', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ leaderboard: [] })),
        fetch('/api/leaderboard/predictions', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ predictions: [], total_users: 0 })),
        user
          ? fetch('/api/predictions', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ predictions: [] }))
          : Promise.resolve({ predictions: [] }),
      ]);
      const entries: LeaderboardEntry[] = lbRes.leaderboard ?? [];
      const preds: LeaderboardPrediction[] = predsRes.predictions ?? [];
      const myPreds: SavedPrediction[] = myPredsRes.predictions ?? [];

      if (entries.length === 0) {
        setLeaderboard(PLACEHOLDER_USERS);
        setUsePlaceholder(true);
      } else {
        setLeaderboard(entries);
        setUsePlaceholder(false);
      }

      const displayName = user?.display_name ?? 'You';
      const myLeaderboardPreds: LeaderboardPrediction[] = user
        ? myPreds
            .filter(p => p.is_complete)
            .map(p => savedPredictionToLeaderboardPrediction(p, user.id, displayName))
        : [];

      if (preds.length === 0) {
        setPredictions(myLeaderboardPreds);
        setTotalUsers(myLeaderboardPreds.length);
      } else {
        const existing = new Set(preds.map(p => p.prediction_number));
        const missing = myLeaderboardPreds.filter(p => !existing.has(p.prediction_number));
        setPredictions([...missing, ...preds]);
        setTotalUsers(predsRes.total_users || preds.length);
      }

      setJustRefreshed(true);
      setTimeout(() => setJustRefreshed(false), 2000);
    } finally {
      setTimeout(() => setRefreshing(false), 5000);
    }
  };

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return <span className="material-symbols-outlined text-medal-gold text-3xl font-variation-fill">emoji_events</span>;
    if (rank === 2) return <span className="material-symbols-outlined text-medal-silver text-2xl font-variation-fill">emoji_events</span>;
    if (rank === 3) return <span className="material-symbols-outlined text-medal-bronze text-2xl font-variation-fill">emoji_events</span>;
    return null;
  };

  const getChampionLabel = (code: string | null) => {
    if (!code) return null;
    const team = teamsByCode[code];
    return team ? `${team.flag} ${team.name}` : code;
  };

  const isSamePrediction = (a?: LeaderboardPrediction | null, b?: LeaderboardPrediction | null) => {
    if (!a || !b) return false;
    if (a.prediction_number != null && b.prediction_number != null) {
      return a.prediction_number === b.prediction_number;
    }
    return a.user_id === b.user_id && a.name === b.name;
  };

  const entryMatchesPrediction = (entry: LeaderboardEntry, prediction: LeaderboardPrediction) => {
    if (entry.prediction_number != null && prediction.prediction_number != null) {
      return entry.prediction_number === prediction.prediction_number;
    }
    return entry.user_id === prediction.user_id;
  };

  const openPredictionDetails = (prediction: LeaderboardPrediction, rank?: number) => {
    setSelectedPrediction(prediction);
    setSelectedRank(rank);
  };

  const openPredictionCompare = (prediction: LeaderboardPrediction, rank?: number) => {
    if (!comparisonBasePrediction) {
      setComparisonBasePrediction(prediction);
      return;
    }
    if (isSamePrediction(comparisonBasePrediction, prediction)) {
      setComparisonBasePrediction(null);
      return;
    }
    setSelectedComparePrediction(prediction);
    setSelectedCompareRank(rank);
  };

  const renderPredictionActions = (prediction: LeaderboardPrediction, rank?: number) => {
    const isSelectedForCompare = isSamePrediction(comparisonBasePrediction, prediction);
    const compareLabel = isSelectedForCompare ? 'Selected' : comparisonBasePrediction ? 'Compare' : 'Pick';
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openPredictionDetails(prediction, rank);
          }}
          className="inline-flex h-9 w-10 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 px-0 text-[11px] font-bold text-neutral-300 transition-colors hover:border-primary/30 hover:text-primary sm:h-auto sm:w-auto sm:px-2.5 sm:py-1.5"
          aria-label="View prediction"
          title="View prediction"
        >
          <span className="material-symbols-outlined text-[18px] sm:text-[14px]">visibility</span>
          <span className="hidden sm:inline">View</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openPredictionCompare(prediction, rank);
          }}
          className={`inline-flex h-9 w-10 items-center justify-center gap-1 rounded-lg px-0 text-[11px] font-black transition-colors sm:h-auto sm:w-auto sm:px-2.5 sm:py-1.5 ${
            isSelectedForCompare
              ? 'bg-wc-green/15 text-wc-green hover:bg-wc-green/20'
              : 'bg-primary text-black hover:bg-primary/90'
          }`}
          aria-label={isSelectedForCompare ? 'Clear comparison selection' : compareLabel}
          title={isSelectedForCompare ? 'Click to clear comparison selection' : compareLabel}
        >
          <span className="material-symbols-outlined text-[18px] sm:text-[14px]">{isSelectedForCompare ? 'check' : 'compare_arrows'}</span>
          <span className="hidden sm:inline">{compareLabel}</span>
        </button>
      </div>
    );
  };

  return (
    <div className="flex-grow pt-4 pb-2">

      <div className="md:grid md:grid-cols-[1fr,300px] md:gap-8">
        <div className="flex-grow">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <img src="/images/fifa_logo.svg" alt="FIFA World Cup 2026" className="w-12 h-12 animate-trophy-glow" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Predictions Section */}
              {predictions.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-xl font-variation-fill">assignment</span>
                      <h2 className="font-bold text-lg">Predictions</h2>
                    </div>
                    <button
                      type="button"
                      onClick={handleRefresh}
                      disabled={refreshing}
                      aria-label="Refresh leaderboard"
                      title={justRefreshed ? 'Updated' : 'Refresh'}
                      className={`flex h-9 w-10 items-center justify-center gap-1.5 rounded-lg border px-0 text-xs font-bold font-body transition-colors sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 ${
                        justRefreshed
                          ? 'border-wc-green/50 text-wc-green bg-wc-green/10'
                          : 'border-white/10 text-neutral-300 hover:border-primary/30 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[16px] ${refreshing ? 'animate-spin' : ''}`}>
                        {justRefreshed ? 'check' : 'refresh'}
                      </span>
                      <span className="hidden sm:inline">{justRefreshed ? 'Updated' : 'Refresh'}</span>
                    </button>
                  </div>
                  {(() => {
                    const approved = predictions.filter(p => p.is_approved).sort((a, b) => {
                      if (!a.updated_at || !b.updated_at) return 0;
                      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
                    });
                    const pending = predictions.filter(p => !p.is_approved).sort((a, b) => {
                      if (!a.created_at || !b.created_at) return 0;
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    });

                    const formatCreatedAt = (date?: string | null) => {
                      if (!date) return null;
                      return new Date(date).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      });
                    };

                    const renderCard = (pred: LeaderboardPrediction, idx: number) => {
                      const { primaryName, secondaryName } = getPredictionCardNames(pred);
                      const lbIdx = leaderboard.findIndex(e => entryMatchesPrediction(e, pred));
                      const rank = lbIdx >= 0 ? lbIdx + 1 : undefined;
                      return (
                      <div
                        key={`${pred.user_id}-${pred.prediction_number ?? idx}`}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-neutral-900 hover:bg-white/5 hover:border-primary/30 transition-colors text-left group"
                      >
                        <button
                          type="button"
                          onClick={() => openPredictionDetails(pred, rank)}
                          className="flex-grow min-w-0 text-left"
                        >
                          <div className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                            {primaryName}
                            <span className="text-neutral-500 font-mono ml-1.5">#{pred.prediction_number ?? idx + 1}</span>
                            {secondaryName && <span className="text-neutral-400 font-normal ml-1.5">— {secondaryName}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-neutral-400 truncate font-body">
                              {getChampionLabel(pred.champion_code) ?? 'No champion pick'}
                            </span>
                            {pred.created_at && (
                              <>
                                <span className="text-neutral-600 text-[10px]">·</span>
                                <span className="text-[11px] text-neutral-500 font-body shrink-0">
                                  {formatCreatedAt(pred.created_at)}
                                </span>
                              </>
                            )}
                          </div>
                        </button>
                        {renderPredictionActions(pred, rank)}
                      </div>
                      );
                    };

                    return (
                      <>
                        {approved.length > 0 && (
                          <div className="mb-4">
                            <div className="flex items-center gap-1.5 mb-2">
                              <svg className="w-2.5 h-2.5 text-wc-green" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm3.41 5.59L7 10l-2.41-2.41L3.5 8.68 7 12.18l5.5-5.5-1.09-1.09z"/></svg>
                              <span className="text-xs font-bold font-body text-wc-green">Approved</span>
                            </div>
                            <div className="space-y-2">
                              {approved.map((pred, idx) => renderCard(pred, idx))}
                            </div>
                          </div>
                        )}
                        {pending.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <svg className="w-2.5 h-2.5 text-wc-amber" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM7.25 4v4.75H11v-1.5H8.75V4h-1.5z"/></svg>
                              <span className="text-xs font-bold font-body text-wc-amber">Pending</span>
                            </div>
                            <div className="space-y-2">
                              {pending.map((pred, idx) => renderCard(pred, idx))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Leaderboard List */}
              {!usePlaceholder && (
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-xl font-variation-fill">emoji_events</span>
                <h2 className="font-bold text-lg">Rankings</h2>
              </div>
              )}

              {!usePlaceholder && leaderboard.map((entry, idx) => {
                const rank = idx + 1;
                const isCurrentUser = !usePlaceholder && user?.id === entry.user_id;
                const medal = getMedalIcon(rank);
                const userPrediction = predictions.find(p => entryMatchesPrediction(entry, p));
                const entryName = getLeaderboardEntryName(entry);
                
                const renderPositionChange = (change?: number) => {
                  if (!change) return (
                    <div className="flex items-center justify-center text-neutral-300 ml-2" title="No change">
                      <span className="material-symbols-outlined text-[14px]">remove</span>
                    </div>
                  );
                  if (change > 0) return (
                    <div className="flex items-center gap-0.5 text-[11px] font-bold text-wc-green ml-2" title={`Up ${change} positions`}>
                      <span className="material-symbols-outlined text-[16px] leading-none">trending_up</span>
                      {change}
                    </div>
                  );
                  return (
                    <div className="flex items-center gap-0.5 text-[11px] font-bold text-wc-red ml-2" title={`Down ${Math.abs(change)} positions`}>
                      <span className="material-symbols-outlined text-[16px] leading-none">trending_down</span>
                      {Math.abs(change)}
                    </div>
                  );
                };

                if (isCurrentUser) {
                  return (
                    <div
                      key={getLeaderboardEntryKey(entry, idx)} 
                      className={`w-full flex items-center gap-3 bg-background-dark text-white p-4 rounded-xl border-2 border-primary shadow-lg ring-4 ring-primary/10 mb-2 text-left ${userPrediction ? 'hover:bg-neutral-800 transition-colors group' : ''}`}
                    >
                      <div className="w-10 text-center font-black text-primary text-lg">
                        {medal ?? rank}
                      </div>
                      <button
                        type="button"
                        onClick={() => { if (userPrediction) openPredictionDetails(userPrediction, rank); }}
                        disabled={!userPrediction}
                        className="ml-1 flex-grow text-left disabled:cursor-default"
                      >
                        <div className="font-bold flex items-center gap-2">
                          {entryName}
                          {renderPositionChange(entry.position_change)}
                          <span className="bg-primary text-black text-[9px] px-1.5 py-0.5 rounded font-black">YOU</span>
                        </div>
                        {entry.champion_code && (
                          <div className="text-xs text-neutral-400 flex items-center gap-1 font-body">
                            Champion Pick: {getChampionLabel(entry.champion_code)}
                          </div>
                        )}
                      </button>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <div className="font-black text-lg text-primary">{entry.total_points}</div>
                          <div className="text-[10px] font-bold text-white/50 uppercase">Points</div>
                        </div>
                        {userPrediction && renderPredictionActions(userPrediction, rank)}
                      </div>
                    </div>
                  );
                }

                if (rank <= 3) {
                  return (
                    <div
                      key={getLeaderboardEntryKey(entry, idx)} 
                      className={`w-full flex items-center gap-3 bg-neutral-900 p-4 rounded-xl shadow-sm border mb-2 text-left ${rank === 1 ? 'border-primary/20' : 'border-white/10'} ${userPrediction ? 'hover:bg-white/5 hover:border-primary/30 transition-colors group' : ''}`}
                    >
                      <div className="w-10 flex justify-center">
                        {medal}
                      </div>
                      <button
                        type="button"
                        onClick={() => { if (userPrediction) openPredictionDetails(userPrediction, rank); }}
                        disabled={!userPrediction}
                        className="ml-1 flex-grow text-left disabled:cursor-default"
                      >
                        <div className={`font-bold ${rank === 1 ? 'text-lg' : ''} flex items-center gap-2 ${userPrediction ? 'group-hover:text-primary transition-colors' : ''}`}>
                          {entryName}
                          {renderPositionChange(entry.position_change)}
                        </div>
                        {entry.champion_code && (
                          <div className="text-xs text-neutral-400 font-body">
                            Predicted {getChampionLabel(entry.champion_code)} as Champion
                          </div>
                        )}
                      </button>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <div className={`font-bold ${rank === 1 ? 'font-black text-xl text-primary' : 'text-lg text-neutral-300'}`}>
                            {rank === 1 ? '+' : ''}{entry.total_points}
                          </div>
                          <div className="text-[10px] font-bold text-neutral-400 uppercase">Points</div>
                        </div>
                        {userPrediction && renderPredictionActions(userPrediction, rank)}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={getLeaderboardEntryKey(entry, idx)} 
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors mb-1 text-left ${userPrediction ? 'hover:bg-white/5 hover:shadow-sm border border-transparent hover:border-white/10 group' : 'hover:bg-white/5'}`}
                  >
                    <div className="w-10 text-center text-sm font-bold text-neutral-400">
                      {rank}
                    </div>
                    <button
                      type="button"
                      onClick={() => { if (userPrediction) openPredictionDetails(userPrediction, rank); }}
                      disabled={!userPrediction}
                      className="ml-1 flex-grow flex items-center gap-2 text-left disabled:cursor-default"
                    >
                      <span className={`font-medium ${userPrediction ? 'group-hover:text-primary transition-colors' : ''}`}>{entryName}</span>
                      {renderPositionChange(entry.position_change)}
                    </button>
                    <div className="text-right flex items-center gap-3">
                      <div className="font-bold">{entry.total_points}</div>
                      {userPrediction && renderPredictionActions(userPrediction, rank)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* How to Score Points */}
        <section className="mt-10 md:mt-0 mb-4 md:sticky md:top-20 md:self-start">
          <ScoringExplainer variant="full" />
        </section>
      </div>

      {selectedPrediction && (
        <PublicPredictionProfileModal
          prediction={selectedPrediction}
          rank={selectedRank}
          onClose={() => { setSelectedPrediction(null); setSelectedRank(undefined); }}
          liveMatches={liveMatches}
          teamFlagsByCode={teamFlagsByCode}
        />
      )}
      {comparisonBasePrediction && selectedComparePrediction && (
        <PredictionCompareModal
          mine={comparisonBasePrediction}
          friend={selectedComparePrediction}
          friendRank={selectedCompareRank}
          onClose={() => { setSelectedComparePrediction(null); setSelectedCompareRank(undefined); }}
          liveMatches={liveMatches}
          teamFlagsByCode={teamFlagsByCode}
        />
      )}
    </div>
  );
}
