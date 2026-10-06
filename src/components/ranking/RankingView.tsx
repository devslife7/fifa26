'use client';

import { useState } from 'react';
import { archive, archiveDate } from '@/lib/client/archive';
import { LeaderboardPrediction, LiveMatch } from '@/types';
import PublicPredictionProfileModal from './PublicPredictionProfileModal';
import PredictionCompareModal from './PredictionCompareModal';
import KnockoutScoringCard from '@/components/home/KnockoutScoringCard';
import { computeTiedRanks } from '@/lib/services/leaderboard-position';

function getPredictionPrimaryName(pred: LeaderboardPrediction): string {
  const accountName = pred.display_name && pred.display_name !== 'Unknown' ? pred.display_name : null;
  const predictionName = pred.name?.trim() || null;
  return predictionName || accountName || 'Anonymous';
}

function samePredictionIdentity(a?: LeaderboardPrediction | null, b?: LeaderboardPrediction | null): boolean {
  if (!a || !b) return false;
  if (a.prediction_number != null && b.prediction_number != null) {
    return a.prediction_number === b.prediction_number;
  }
  return a.user_id === b.user_id && a.name === b.name;
}

interface RankingViewProps {
  liveMatches?: Record<string, LiveMatch>;
  teamFlagsByCode?: Record<string, string>;
}

export default function RankingView({ liveMatches, teamFlagsByCode }: RankingViewProps) {
  const predictions = archive.predictions;
  const loading = false;
  const totalUsers = archive.leaderboard.length;
  const [selectedPrediction, setSelectedPrediction] = useState<LeaderboardPrediction | null>(null);
  const [selectedRank, setSelectedRank] = useState<number | undefined>(undefined);
  const [comparisonBasePrediction, setComparisonBasePrediction] = useState<LeaderboardPrediction | null>(null);
  const [comparisonBaseRank, setComparisonBaseRank] = useState<number | undefined>(undefined);
  const [selectedComparePrediction, setSelectedComparePrediction] = useState<LeaderboardPrediction | null>(null);
  const [selectedCompareRank, setSelectedCompareRank] = useState<number | undefined>(undefined);
  const [showPreview, setShowPreview] = useState(false);

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return <span className="material-symbols-outlined text-medal-gold text-3xl font-variation-fill">emoji_events</span>;
    if (rank === 2) return <span className="material-symbols-outlined text-medal-silver text-2xl font-variation-fill">emoji_events</span>;
    if (rank === 3) return <span className="material-symbols-outlined text-medal-bronze text-2xl font-variation-fill">emoji_events</span>;
    return null;
  };

  const isSamePrediction = samePredictionIdentity;

  const visiblePredictions = predictions.filter(prediction => prediction.is_approved);
  const previewPredictions = predictions.filter(prediction => !prediction.is_approved);

  const getPredictionPoints = (prediction: LeaderboardPrediction): number | null => prediction.total_points ?? null;

  const openPredictionDetails = (prediction: LeaderboardPrediction, rank?: number) => {
    if (!prediction.details_available) return;
    setSelectedPrediction(prediction);
    setSelectedRank(rank);
  };

  const openPredictionCompare = (prediction: LeaderboardPrediction, rank?: number) => {
    if (!prediction.details_available) return;
    if (!comparisonBasePrediction) {
      setComparisonBasePrediction(prediction);
      setComparisonBaseRank(rank);
      return;
    }
    if (isSamePrediction(comparisonBasePrediction, prediction)) {
      setComparisonBasePrediction(null);
      setComparisonBaseRank(undefined);
      return;
    }
    setSelectedComparePrediction(prediction);
    setSelectedCompareRank(rank);
  };

  const startCompareFromProfile = () => {
    if (!selectedPrediction) return;
    setComparisonBasePrediction(selectedPrediction);
    setComparisonBaseRank(selectedRank);
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
            onClick={() => { setComparisonBasePrediction(null); setComparisonBaseRank(undefined); }}
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
                      <span className="font-body text-xs text-primary">Final standings</span>
                    </div>
                    <div className="mt-1 flex min-w-0 items-start justify-between gap-2 text-xs text-neutral-400 font-body md:text-sm">
                      <span className="shrink-0">
                        {visiblePredictions.length} {visiblePredictions.length === 1 ? 'participant' : 'participants'}
                        {showPreview && previewPredictions.length > 0 && (
                          <span className="text-neutral-500"> · {previewPredictions.length} preview</span>
                        )}
                      </span>
                      <span className="text-right text-neutral-500">Archived {archiveDate}</span>
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
          mineRank={comparisonBaseRank}
          friendRank={selectedCompareRank}
          onClose={() => { setSelectedComparePrediction(null); setSelectedCompareRank(undefined); }}
          liveMatches={liveMatches}
          teamFlagsByCode={teamFlagsByCode}
        />
      )}
    </div>
  );
}
