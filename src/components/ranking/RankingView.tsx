'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LeaderboardEntry, LeaderboardPrediction, SavedPrediction, LiveMatch } from '@/types';
import { isLateSubmission } from '@/data/tournament';
import { useAuth } from '@/components/providers/AuthProvider';
import { computePredictionResults } from '@/hooks/usePredictionResults';
import PublicPredictionProfileModal from './PublicPredictionProfileModal';
import PredictionCompareModal from './PredictionCompareModal';
import KnockoutScoringCard from '@/components/home/KnockoutScoringCard';
import { computeTiedRanks } from '@/lib/services/leaderboard-position';
import { buildHotMatchRefreshQuery } from '@/lib/utils/hot-matches';

function getPredictionPrimaryName(pred: LeaderboardPrediction): string {
  const accountName = pred.display_name && pred.display_name !== 'Unknown' ? pred.display_name : null;
  const predictionName = pred.name?.trim() || null;
  return predictionName || accountName || 'Anonymous';
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
    details_available: true,
    is_late_submission: isLateSubmission(prediction.completed_at, prediction.prediction_number),
    completed_at: prediction.completed_at,
    created_at: prediction.created_at,
    updated_at: prediction.updated_at,
  };
}

function mergeOwnPredictions(
  publicPredictions: LeaderboardPrediction[],
  ownPredictions: LeaderboardPrediction[],
): LeaderboardPrediction[] {
  const ownByNumber = new Map(
    ownPredictions
      .filter(prediction => prediction.prediction_number != null)
      .map(prediction => [prediction.prediction_number, prediction]),
  );
  const merged = publicPredictions.map(prediction => {
    if (prediction.prediction_number == null) return prediction;
    const own = ownByNumber.get(prediction.prediction_number);
    if (!own) return prediction;
    return {
      ...own,
      total_points: own.total_points ?? prediction.total_points,
      position_change: own.position_change ?? prediction.position_change,
    };
  });
  const publicNumbers = new Set(publicPredictions.map(prediction => prediction.prediction_number));
  const missingOwn = ownPredictions.filter(prediction => !publicNumbers.has(prediction.prediction_number));
  return [...missingOwn, ...merged];
}

function leaderboardEntriesToPredictions(entries: LeaderboardEntry[]): LeaderboardPrediction[] {
  return entries.map(entry => ({
    prediction_number: entry.prediction_number,
    user_id: entry.user_id ?? `prediction-${entry.prediction_number}`,
    name: entry.name ?? null,
    display_name: entry.display_name,
    champion_code: entry.champion_code,
    total_points: entry.total_points,
    position_change: entry.position_change,
    details_available: false,
    is_late_submission: false,
    is_approved: true,
    created_at: entry.calculated_at,
    updated_at: entry.calculated_at,
  }));
}

function formatUpdatedAt(date: Date): string {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function PositionTrendIcon({ icon }: { icon: string }) {
  return (
    <span className="inline-flex size-5 shrink-0 items-center justify-center overflow-hidden md:size-[18px]">
      <span className="material-symbols-outlined origin-center scale-[0.95] text-[22px] leading-none md:scale-[0.88] md:text-xl">{icon}</span>
    </span>
  );
}

function renderPositionChange(change?: number) {
  if (change == null || change === 0) {
    return (
      <span className="inline-flex shrink-0 items-center text-neutral-500" title={change == null ? 'No data' : 'No change'}>
        <PositionTrendIcon icon="remove" />
      </span>
    );
  }
  if (change > 0) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 font-medium text-wc-green" title={`Up ${change} positions today`}>
        <PositionTrendIcon icon="trending_up" />
        <span className="text-base tabular-nums md:text-[12px]">{change}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 font-medium text-wc-red" title={`Down ${Math.abs(change)} positions today`}>
      <PositionTrendIcon icon="trending_down" />
      <span className="text-base tabular-nums md:text-[12px]">{Math.abs(change)}</span>
    </span>
  );
}

function getFallbackPredictions(entries: LeaderboardEntry[]): LeaderboardPrediction[] {
  if (entries.length > 0) return leaderboardEntriesToPredictions(entries);
  return [];
}

function normalizePredictionNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getPredictionKey(prediction: LeaderboardPrediction): string {
  if (prediction.prediction_number != null) return String(prediction.prediction_number);
  return prediction.user_id;
}

function entryMatchesPrediction(entry: LeaderboardEntry, prediction: LeaderboardPrediction): boolean {
  const entryNum = normalizePredictionNumber(entry.prediction_number);
  const predNum = normalizePredictionNumber(prediction.prediction_number);
  if (entryNum != null && predNum != null) {
    return entryNum === predNum;
  }

  if (entry.user_id && prediction.user_id && entry.user_id === prediction.user_id) {
    return true;
  }

  if (entryNum != null && prediction.user_id === `prediction-${entryNum}`) {
    return true;
  }

  if (entry.prediction_id && prediction.user_id === `prediction-${entry.prediction_id}`) {
    return true;
  }

  return false;
}

function buildFastRefreshQuery(liveMatches?: Record<string, LiveMatch>): string {
  return buildHotMatchRefreshQuery(liveMatches) ?? 'mode=today';
}

interface RankingViewProps {
  liveMatches?: Record<string, LiveMatch>;
  teamFlagsByCode?: Record<string, string>;
  onRefreshLiveData?: (query?: string) => Promise<void>;
}

export default function RankingView({ liveMatches, teamFlagsByCode, onRefreshLiveData }: RankingViewProps) {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [predictions, setPredictions] = useState<LeaderboardPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedPrediction, setSelectedPrediction] = useState<LeaderboardPrediction | null>(null);
  const [selectedRank, setSelectedRank] = useState<number | undefined>(undefined);
  const [comparisonBasePrediction, setComparisonBasePrediction] = useState<LeaderboardPrediction | null>(null);
  const [selectedComparePrediction, setSelectedComparePrediction] = useState<LeaderboardPrediction | null>(null);
  const [selectedCompareRank, setSelectedCompareRank] = useState<number | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showResultDelayNotice, setShowResultDelayNotice] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const resultDelayNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadLeaderboard = useCallback(async () => {
    const fetchLeaderboard = fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => data.leaderboard ?? [])
      .catch(() => []);

    const fetchPredictions = fetch('/api/leaderboard/predictions?preview=1')
      .then(res => res.json())
      .then(data => ({ predictions: data.predictions ?? [], totalUsers: data.total_users ?? 0 }))
      .catch(() => ({ predictions: [], totalUsers: 0 }));

    const fetchMyPredictions = user
      ? fetch('/api/predictions')
          .then(res => res.json())
          .then(data => (data.predictions ?? []) as SavedPrediction[])
          .catch(() => [] as SavedPrediction[])
      : Promise.resolve([] as SavedPrediction[]);

    const [entries, { predictions: preds, totalUsers: total }, myPreds] = await Promise.all([fetchLeaderboard, fetchPredictions, fetchMyPredictions]);

    setLeaderboard(entries);

    // Build all of the user's completed predictions as LeaderboardPredictions
    const displayName = user?.display_name ?? 'You';
    const myLeaderboardPreds: LeaderboardPrediction[] = user
      ? myPreds
          .filter((p: SavedPrediction) => p.is_complete)
          .map((p: SavedPrediction) => savedPredictionToLeaderboardPrediction(p, user.id, displayName))
      : [];

    if (preds.length === 0) {
      const fallbackPredictions = getFallbackPredictions(entries);
      setPredictions(mergeOwnPredictions(fallbackPredictions, myLeaderboardPreds));
      setTotalUsers(total || fallbackPredictions.length || myLeaderboardPreds.length);
    } else {
      setPredictions(mergeOwnPredictions(preds, myLeaderboardPreds));
      setTotalUsers(total || preds.length);
    }
    setLastUpdated(new Date());
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  useEffect(() => {
    return () => {
      if (resultDelayNoticeTimeoutRef.current) {
        clearTimeout(resultDelayNoticeTimeoutRef.current);
      }
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const refreshQuery = buildFastRefreshQuery(liveMatches);
      if (onRefreshLiveData) {
        await onRefreshLiveData(refreshQuery);
      } else {
        await fetch(`/api/football/matches?${refreshQuery}&force=true`, { cache: 'no-store' }).catch(() => null);
      }
      await loadLeaderboard();
      setShowResultDelayNotice(true);
      if (resultDelayNoticeTimeoutRef.current) {
        clearTimeout(resultDelayNoticeTimeoutRef.current);
      }
      resultDelayNoticeTimeoutRef.current = setTimeout(() => {
        setShowResultDelayNotice(false);
        resultDelayNoticeTimeoutRef.current = null;
      }, 6000);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, liveMatches, loadLeaderboard, onRefreshLiveData]);

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return <span className="material-symbols-outlined text-medal-gold text-3xl font-variation-fill">emoji_events</span>;
    if (rank === 2) return <span className="material-symbols-outlined text-medal-silver text-2xl font-variation-fill">emoji_events</span>;
    if (rank === 3) return <span className="material-symbols-outlined text-medal-bronze text-2xl font-variation-fill">emoji_events</span>;
    return null;
  };

  const isSamePrediction = (a?: LeaderboardPrediction | null, b?: LeaderboardPrediction | null) => {
    if (!a || !b) return false;
    if (a.prediction_number != null && b.prediction_number != null) {
      return a.prediction_number === b.prediction_number;
    }
    return a.user_id === b.user_id && a.name === b.name;
  };

  const visiblePredictions = predictions.filter(prediction => prediction.is_approved);
  const previewPredictions = predictions.filter(prediction => !prediction.is_approved);

  const livePointsByPrediction = useMemo(() => {
    if (!liveMatches) return new Map<string, number>();
    const points = new Map<string, number>();
    for (const prediction of predictions) {
      if (!prediction.details_available) continue;
      points.set(
        getPredictionKey(prediction),
        computePredictionResults(prediction, liveMatches).summary.totalPoints,
      );
    }
    return points;
  }, [predictions, liveMatches]);

  const getPredictionPoints = (prediction: LeaderboardPrediction): number | null => {
    if (prediction.details_available && liveMatches) {
      const livePoints = livePointsByPrediction.get(getPredictionKey(prediction));
      if (livePoints != null) return livePoints;
    }
    if (typeof prediction.total_points === 'number') return prediction.total_points;
    const entry = leaderboard.find(e => entryMatchesPrediction(e, prediction));
    return entry?.total_points ?? null;
  };

  const openPredictionDetails = (prediction: LeaderboardPrediction, rank?: number) => {
    if (!prediction.details_available) return;
    setSelectedPrediction(prediction);
    setSelectedRank(rank);
  };

  const openPredictionCompare = (prediction: LeaderboardPrediction, rank?: number) => {
    if (!prediction.details_available) return;
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

  const startCompareFromProfile = () => {
    if (!selectedPrediction) return;
    setComparisonBasePrediction(selectedPrediction);
    setSelectedPrediction(null);
    setSelectedRank(undefined);
  };

  const comparisonBaseName = comparisonBasePrediction
    ? getPredictionPrimaryName(comparisonBasePrediction)
    : null;

  return (
    <div className="flex-grow pt-4 pb-2">

      {comparisonBasePrediction && !selectedComparePrediction && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
          <span className="material-symbols-outlined shrink-0 text-primary text-xl">compare_arrows</span>
          <p className="min-w-0 flex-1 text-sm text-white font-body">
            Comparing with <span className="font-bold text-primary">{comparisonBaseName}</span>.
            {' '}Select another prediction below to compare.
          </p>
          <button
            type="button"
            onClick={() => setComparisonBasePrediction(null)}
            className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-neutral-400 transition-colors hover:border-white/20 hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="md:grid md:grid-cols-[1fr,300px] md:gap-8">
        <div className="flex-grow">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <img src="/images/fifa_logo.svg" alt="FIFA World Cup 2026" className="w-12 h-12 animate-trophy-glow" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Predictions Section */}
              {(visiblePredictions.length > 0 || (showPreview && previewPredictions.length > 0)) && (
                <div className="mb-6">
                  <div className="mb-2.5 md:mb-3">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="min-w-0 font-bold text-2xl leading-none md:text-xl md:leading-normal">Leaderboard</h2>
                      <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/10 px-0 text-xs font-bold text-neutral-300 transition-all hover:border-white/20 hover:text-primary disabled:opacity-50 active:scale-95 min-[390px]:w-auto min-[390px]:px-2.5 md:h-9 md:px-3"
                        aria-label="Reload leaderboard"
                        title="Reload leaderboard"
                      >
                        <span className={`material-symbols-outlined text-[13px] md:text-[18px] ${refreshing ? 'animate-spin' : ''}`}>
                          refresh
                        </span>
                        <span className="hidden min-[390px]:inline">Reload</span>
                      </button>
                    </div>
                    <div className="mt-1 flex min-w-0 items-start justify-between gap-2 text-xs text-neutral-400 font-body md:text-sm">
                      <span className="shrink-0">
                        {visiblePredictions.length} {visiblePredictions.length === 1 ? 'participant' : 'participants'}
                        {showPreview && previewPredictions.length > 0 && (
                          <span className="text-neutral-500"> · {previewPredictions.length} preview</span>
                        )}
                      </span>
                      {lastUpdated && (
                        <span className="min-w-0 truncate text-right text-neutral-500">Updated at {formatUpdatedAt(lastUpdated)}</span>
                      )}
                    </div>
                    {showPreview && previewPredictions.length > 0 && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-2.5 py-2 text-[11px] text-neutral-400 font-body md:text-xs">
                        <span className="material-symbols-outlined mt-px shrink-0 text-[14px] text-neutral-500">science</span>
                        <span>Preview rows (marked) aren&apos;t competing — shown only to compare where they&apos;d rank.</span>
                      </div>
                    )}
                  </div>
                  {(() => {
                    const comparePredictions = (a: LeaderboardPrediction, b: LeaderboardPrediction) => {
                      const pointsA = getPredictionPoints(a) ?? 0;
                      const pointsB = getPredictionPoints(b) ?? 0;
                      if (pointsB !== pointsA) return pointsB - pointsA;
                      return getPredictionPrimaryName(a).localeCompare(
                        getPredictionPrimaryName(b),
                        undefined,
                        { sensitivity: 'base' },
                      );
                    };

                    const approved = [...visiblePredictions].sort(comparePredictions);
                    const approvedRanks = computeTiedRanks(
                      approved,
                      pred => getPredictionPoints(pred) ?? 0,
                    );

                    type LeaderboardRow = { pred: LeaderboardPrediction; rank: number; isPreview: boolean };
                    const rows: LeaderboardRow[] = approved.map((pred, idx) => ({
                      pred,
                      rank: approvedRanks[idx],
                      isPreview: false,
                    }));

                    if (showPreview) {
                      for (const pred of previewPredictions) {
                        const points = getPredictionPoints(pred) ?? 0;
                        // Where this prediction would slot in among the real
                        // competitors, without renumbering the official board.
                        const wouldBeRank = approved.filter(a => (getPredictionPoints(a) ?? 0) > points).length + 1;
                        rows.push({ pred, rank: wouldBeRank, isPreview: true });
                      }
                      rows.sort((x, y) => comparePredictions(x.pred, y.pred));
                    }

                    const renderPredictionRow = ({ pred, rank, isPreview }: LeaderboardRow) => {
                      const primaryName = getPredictionPrimaryName(pred);
                      const medal = isPreview ? null : getMedalIcon(rank);
                      const points = getPredictionPoints(pred);
                      const entry = leaderboard.find(e => entryMatchesPrediction(e, pred));
                      const positionChange = pred.position_change ?? entry?.position_change;
                      const isSelectedForCompare = isSamePrediction(comparisonBasePrediction, pred);
                      const isCompareTarget = comparisonBasePrediction
                        && !isSelectedForCompare
                        && pred.details_available;
                      return (
                      <button
                        key={`${pred.user_id}-${pred.prediction_number ?? primaryName}`}
                        type="button"
                        onClick={() => {
                          if (isCompareTarget) {
                            openPredictionCompare(pred, rank);
                            return;
                          }
                          openPredictionDetails(pred, rank);
                        }}
                        disabled={!pred.details_available}
                        className={`w-full flex items-center gap-2 py-2 text-left group md:gap-3 md:py-2.5 ${
                          pred.details_available ? 'hover:bg-white/5 transition-colors cursor-pointer' : 'cursor-default'
                        } ${isSelectedForCompare ? 'bg-primary/10' : ''} ${isCompareTarget ? 'ring-1 ring-inset ring-primary/30' : ''} ${isPreview ? 'opacity-60' : ''}`}
                      >
                        <div className="w-8 shrink-0 flex justify-center md:w-10">
                          {medal ? (
                            <span className="scale-75 md:scale-100">{medal}</span>
                          ) : (
                            <span className="text-xs font-bold text-neutral-400 tabular-nums">{isPreview ? `~${rank}` : rank}</span>
                          )}
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className={`font-medium text-base flex items-center gap-1.5 min-w-0 transition-colors md:text-sm ${pred.details_available ? 'group-hover:text-primary' : ''}`}>
                            <span className="truncate">{primaryName}</span>
                            {!isPreview && renderPositionChange(positionChange)}
                            {isPreview && (
                              <span className="shrink-0 rounded-full border border-dashed border-white/25 bg-white/5 px-1.5 py-0.5 text-[10px] md:text-[9px] font-black uppercase text-neutral-400">
                                Preview
                              </span>
                            )}
                            {pred.is_late_submission && (
                              <span className="shrink-0 rounded-full bg-wc-red/15 px-1.5 py-0.5 text-[10px] md:text-[9px] font-black uppercase text-wc-red">
                                Late
                              </span>
                            )}
                          </div>
                        </div>
                        {pred.details_available ? (
                          <div className="flex shrink-0 items-center gap-2">
                            {isCompareTarget && (
                              <span className="hidden text-[11px] font-bold uppercase text-primary sm:inline">Compare</span>
                            )}
                            {isSelectedForCompare && (
                              <span className="material-symbols-outlined text-primary text-[18px]">check</span>
                            )}
                            <div className="w-12 pr-1 text-right font-bold text-base tabular-nums md:w-14 md:pr-3">{points ?? 0}</div>
                          </div>
                        ) : (
                          <span
                            className="inline-flex w-12 shrink-0 items-center justify-end pr-1 text-neutral-500 md:w-14 md:pr-3"
                            aria-label="Prediction details unlock after kickoff"
                            title="Prediction details unlock after kickoff"
                          >
                            <span className="material-symbols-outlined text-[15px] md:text-[18px]">lock</span>
                          </span>
                        )}
                      </button>
                      );
                    };

                    return (
                      <>
                        {rows.length > 0 && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-white/10 md:gap-3 md:pb-2.5">
                              <div className="w-8 shrink-0 text-center text-[11px] font-bold text-neutral-500 uppercase md:w-10 md:text-xs">#</div>
                              <div className="flex-grow text-[11px] font-bold text-neutral-500 uppercase md:text-xs">Name</div>
                              <div className="w-12 shrink-0 pr-1 text-right text-[11px] font-bold text-neutral-500 uppercase md:w-14 md:pr-3 md:text-xs">Points</div>
                            </div>
                            <div className="divide-y divide-white/10">
                              {rows.map(row => renderPredictionRow(row))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* How to Score Points */}
        <section className="mt-10 md:mt-0 mb-4 md:sticky md:top-20 md:self-start">
          <KnockoutScoringCard />

          {/* Just for fun: preview non-competing predictions */}
          <div className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-bold text-sm">
                  <span className="material-symbols-outlined text-primary text-[18px]">science</span>
                  Just for fun
                </p>
                <p className="mt-0.5 text-xs text-neutral-400 font-body">
                  Show predictions that aren&apos;t competing to preview where they&apos;d rank.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showPreview}
                aria-label="Show non-competing predictions"
                onClick={() => setShowPreview(value => !value)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                  showPreview ? 'bg-primary border-primary' : 'bg-white/10 border-white/15'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    showPreview ? 'translate-x-[22px]' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>
      </div>

      {selectedPrediction && (
        <PublicPredictionProfileModal
          prediction={selectedPrediction}
          rank={selectedRank}
          onClose={() => { setSelectedPrediction(null); setSelectedRank(undefined); }}
          onCompare={startCompareFromProfile}
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
      {showResultDelayNotice && (
        <div className="fixed bottom-24 left-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 items-start gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-xs font-normal text-white shadow-lg animate-fade-in md:text-sm">
          <span className="material-symbols-outlined mt-0.5 text-[16px] text-primary">info</span>
          <span>Reload requested. Final match results can take up to 7 minutes to update on the server.</span>
        </div>
      )}
    </div>
  );
}
