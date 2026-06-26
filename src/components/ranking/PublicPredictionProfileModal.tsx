'use client';

import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { LeaderboardPrediction, LiveMatch, SavedPrediction } from '@/types';
import { teamsByCode } from '@/data/teams';
import { usePredictionResults } from '@/hooks/usePredictionResults';
import PredictionExpandedTracker from '@/components/profile/PredictionExpandedTracker';

interface Props {
  prediction: LeaderboardPrediction;
  rank?: number;
  onClose: () => void;
  onCompare?: () => void;
  liveMatches?: Record<string, LiveMatch>;
  teamFlagsByCode?: Record<string, string>;
}

function displayName(prediction: LeaderboardPrediction): string {
  if (prediction.display_name && prediction.display_name !== 'Unknown') return prediction.display_name;
  return prediction.name?.trim() || 'Anonymous';
}

function predictionTitle(prediction: LeaderboardPrediction): string {
  return prediction.name?.trim() || `${displayName(prediction)}'s Prediction`;
}

function toSavedPrediction(prediction: LeaderboardPrediction): SavedPrediction {
  const now = new Date().toISOString();
  return {
    id: `public-${prediction.prediction_number ?? prediction.user_id}`,
    prediction_number: prediction.prediction_number,
    name: predictionTitle(prediction),
    is_complete: true,
    champion_code: prediction.champion_code,
    share_token: null,
    group_matches: prediction.group_matches ?? {},
    knockout_matches: prediction.knockout_matches ?? {},
    group_tiebreakers: prediction.group_tiebreakers ?? null,
    third_place_tiebreaker: prediction.third_place_tiebreaker ?? null,
    is_approved: prediction.is_approved,
    completed_at: prediction.updated_at ?? prediction.created_at ?? null,
    created_at: prediction.created_at ?? now,
    updated_at: prediction.updated_at ?? prediction.created_at ?? now,
  };
}

export default function PublicPredictionProfileModal({
  prediction,
  rank,
  onClose,
  onCompare,
  liveMatches,
  teamFlagsByCode,
}: Props) {
  const name = displayName(prediction);
  const subtitleTitle = predictionTitle(prediction);
  const showSubtitleTitle = subtitleTitle !== name;
  const savedPrediction = useMemo(() => toSavedPrediction(prediction), [prediction]);
  const champion = prediction.champion_code ? teamsByCode[prediction.champion_code] : null;
  const { summary } = usePredictionResults(savedPrediction, liveMatches);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-0 py-3 backdrop-blur-sm animate-fade-in sm:px-4 sm:py-4">
      <div
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-none border border-white/10 bg-background-dark text-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-baseline gap-2">
                <h2 className="truncate text-xl font-black text-white md:text-base">{name}</h2>
                <span className="shrink-0 text-2xl font-black tabular-nums text-primary md:text-lg">{summary.totalPoints} pts</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-neutral-400 font-body md:mt-0.5 md:text-xs">
                {showSubtitleTitle && (
                  <span className="truncate">{subtitleTitle}</span>
                )}
                {prediction.prediction_number != null && (
                  <>
                    {showSubtitleTitle && <span className="text-neutral-600">·</span>}
                    <span className="font-mono">#{prediction.prediction_number}</span>
                  </>
                )}
                {rank && (
                  <>
                    {(showSubtitleTitle || prediction.prediction_number != null) && (
                      <span className="text-neutral-600">·</span>
                    )}
                    <span className="font-bold text-primary">Rank #{rank}</span>
                  </>
                )}
                {champion && (
                  <>
                    {(showSubtitleTitle || prediction.prediction_number != null || rank) && (
                      <span className="text-neutral-600">·</span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <span>{champion.flag}</span>
                      <span>{champion.name}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-neutral-400 transition-colors hover:bg-white/15 hover:text-white md:h-9 md:w-9"
              aria-label="Close prediction profile"
            >
              <span className="material-symbols-outlined text-xl md:text-[18px]">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-4 pt-0">
          {onCompare && (
            <div className="px-4 pt-2 pb-2">
              <button
                type="button"
                onClick={onCompare}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary/30 px-4 py-2.5 text-[13px] font-bold text-primary transition-colors hover:bg-white/5"
              >
                <span className="material-symbols-outlined text-[18px]">compare_arrows</span>
                Compare with another prediction
              </button>
            </div>
          )}

          <PredictionExpandedTracker
            prediction={savedPrediction}
            liveMatches={liveMatches ?? {}}
            teamFlagsByCode={teamFlagsByCode ?? {}}
            hidePointsInStats
          />
        </div>
      </div>
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>,
    document.body,
  );
}
