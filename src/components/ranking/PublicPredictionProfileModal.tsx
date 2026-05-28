'use client';

import { useMemo } from 'react';
import type { LeaderboardPrediction, LiveMatch, SavedPrediction } from '@/types';
import { teamsByCode } from '@/data/teams';
import { getTopThree } from '@/lib/logic/bracket';
import { usePredictionResults } from '@/hooks/usePredictionResults';
import PredictionDetailCard from '@/components/profile/PredictionDetailCard';
import PredictionExpandedTracker from '@/components/profile/PredictionExpandedTracker';

interface Props {
  prediction: LeaderboardPrediction;
  rank?: number;
  onClose: () => void;
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

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'P';
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

function TeamPodium({
  label,
  code,
  tone,
}: {
  label: string;
  code: string | null | undefined;
  tone: string;
}) {
  const team = code ? teamsByCode[code] : null;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className={`text-[10px] font-black uppercase tracking-wider ${tone}`}>{label}</div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="text-xl leading-none">{team?.flag ?? '?'}</span>
        <span className="min-w-0 truncate text-xs font-bold text-neutral-300 font-body">{team?.name ?? 'TBD'}</span>
      </div>
    </div>
  );
}

export default function PublicPredictionProfileModal({
  prediction,
  rank,
  onClose,
  liveMatches,
  teamFlagsByCode,
}: Props) {
  const name = displayName(prediction);
  const savedPrediction = useMemo(() => toSavedPrediction(prediction), [prediction]);
  const results = usePredictionResults(prediction, liveMatches);
  const champion = prediction.champion_code ? teamsByCode[prediction.champion_code] : null;
  const topThree = useMemo(
    () => getTopThree(
      prediction.group_matches ?? {},
      prediction.knockout_matches ?? {},
      prediction.third_place_tiebreaker ?? undefined,
    ),
    [prediction.group_matches, prediction.knockout_matches, prediction.third_place_tiebreaker],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm animate-fade-in sm:p-4">
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-background-dark text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-gradient-to-br from-primary/20 to-wc-blue/15">
              <span className="text-sm font-black text-primary">{initialsFor(name)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-black text-white">{name}</h2>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-neutral-400 font-body">
                <span className="truncate">{predictionTitle(prediction)}</span>
                {prediction.prediction_number != null && (
                  <>
                    <span className="text-neutral-600">·</span>
                    <span className="font-mono">#{prediction.prediction_number}</span>
                  </>
                )}
                {rank && (
                  <>
                    <span className="text-neutral-600">·</span>
                    <span className="font-bold text-primary">Rank #{rank}</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-neutral-400 transition-colors hover:bg-white/15 hover:text-white"
              aria-label="Close prediction profile"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-4 px-4">
            {champion && (
              <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-4 text-center">
                <div className="text-[11px] font-black uppercase tracking-widest text-primary/70">Predicted Champion</div>
                <div className="mt-2 text-5xl leading-none">{champion.flag}</div>
                <div className="mt-2 text-2xl font-black text-primary font-body">{champion.name}</div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-3 text-center">
                <div className="text-2xl font-black text-primary tabular-nums">{results.summary.totalPoints}</div>
                <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Points</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-3 text-center">
                <div className="text-2xl font-black text-wc-green tabular-nums">{results.summary.groupCorrect}/{results.summary.groupTotal}</div>
                <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Groups</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-3 text-center">
                <div className="text-2xl font-black text-blue-400 tabular-nums">{results.summary.knockoutPoints}</div>
                <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Knockout</div>
              </div>
            </div>

            {(topThree.first || topThree.second || topThree.third) && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <TeamPodium label="1st" code={topThree.first} tone="text-medal-gold" />
                <TeamPodium label="2nd" code={topThree.second} tone="text-medal-silver" />
                <TeamPodium label="3rd" code={topThree.third} tone="text-medal-bronze" />
              </div>
            )}
          </div>

          <div className="mt-4">
            <PredictionDetailCard prediction={savedPrediction} darkMode={true} />
          </div>

          <PredictionExpandedTracker
            prediction={savedPrediction}
            liveMatches={liveMatches ?? {}}
            teamFlagsByCode={teamFlagsByCode ?? {}}
          />
        </div>
      </div>
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
