'use client';

import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { KnockoutResult, LeaderboardPrediction, LiveMatch, MatchResult } from '@/types';
import { teamsByCode } from '@/data/teams';
import { allGroupMatches, KNOCKOUT_VENUES } from '@/data/matches';
import { generateBracket, isPlaceholder } from '@/lib/logic/bracket';
import { formatMatchDateTimeET } from '@/lib/utils/match-dates';
import { getStageLabel, TeamFlag } from './MatchesView';

interface Props {
  match: LiveMatch;
  predictions: LeaderboardPrediction[];
  teamFlagsByCode?: Record<string, string>;
  onClose: () => void;
}

interface PickEntry {
  key: string;
  name: string;
  /** Team code the participant picked to win/advance; null for draw or no pick. */
  teamCode: string | null;
  isDraw: boolean;
  hasPick: boolean;
  correct: boolean | null;
}

function predictionName(prediction: LeaderboardPrediction): string {
  const accountName = prediction.display_name && prediction.display_name !== 'Unknown' ? prediction.display_name : null;
  return prediction.name?.trim() || accountName || 'Anonymous';
}

function predictionKey(prediction: LeaderboardPrediction, index: number): string {
  return prediction.prediction_number != null
    ? String(prediction.prediction_number)
    : `${prediction.user_id}-${index}`;
}

function teamName(code: string | null, fallback?: string | null): string {
  if (code && teamsByCode[code]) return teamsByCode[code].name;
  return fallback ?? 'TBD';
}

export default function MatchPredictionsModal({ match, predictions, teamFlagsByCode, onClose }: Props) {
  const localId = match.localMatchId!;
  const isGroupMatch = /^[A-L]-\d+$/.test(localId);

  const staticMatch = isGroupMatch ? allGroupMatches.find(m => m.id === localId) : undefined;
  const homeCode = match.homeCode ?? staticMatch?.home ?? null;
  const awayCode = match.awayCode ?? staticMatch?.away ?? null;

  const isFinished = match.status === 'FINISHED' && match.actualResult != null;
  const actualWinnerCode = isFinished
    ? match.actualResult === 'home' ? homeCode : match.actualResult === 'away' ? awayCode : null
    : null;

  const detailsAvailable = predictions.some(prediction => prediction.details_available);
  const visiblePredictions = useMemo(
    () => predictions.filter(prediction => prediction.details_available),
    [predictions],
  );

  const entries = useMemo<PickEntry[]>(() => {
    const built = visiblePredictions.map((prediction, index) => {
      const base = {
        key: predictionKey(prediction, index),
        name: predictionName(prediction),
      };

      if (isGroupMatch) {
        const pick = prediction.group_matches?.[localId] as MatchResult | undefined;
        const teamCode = pick === 'home' ? homeCode : pick === 'away' ? awayCode : null;
        return {
          ...base,
          teamCode,
          isDraw: pick === 'draw',
          hasPick: pick != null,
          correct: isFinished && pick != null ? pick === match.actualResult : null,
        };
      }

      const pick = prediction.knockout_matches?.[localId] as KnockoutResult | undefined;
      let teamCode: string | null = null;
      if (pick) {
        try {
          const bracket = generateBracket(
            prediction.group_matches ?? {},
            prediction.knockout_matches ?? {},
            prediction.third_place_tiebreaker ?? undefined,
          );
          const slot = bracket.find(m => m.id === localId);
          const picked = pick === 'home' ? slot?.home : slot?.away;
          if (picked && !isPlaceholder(picked)) teamCode = picked;
        } catch {
          teamCode = null;
        }
      }
      return {
        ...base,
        teamCode,
        isDraw: false,
        hasPick: teamCode != null,
        correct: isFinished && actualWinnerCode && teamCode != null ? teamCode === actualWinnerCode : null,
      };
    });

    return built.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
  }, [visiblePredictions, isGroupMatch, localId, homeCode, awayCode, isFinished, match.actualResult, actualWinnerCode]);

  const pickedEntries = entries.filter(entry => entry.hasPick);

  // Aggregate: for knockout matches participants may back teams beyond the two
  // actually playing, since each bracket evolves from their own group picks.
  const aggregate = useMemo(() => {
    if (isGroupMatch) {
      const home = entries.filter(e => e.teamCode != null && e.teamCode === homeCode).length;
      const away = entries.filter(e => e.teamCode != null && e.teamCode === awayCode).length;
      const draw = entries.filter(e => e.isDraw).length;
      return { kind: 'group' as const, home, draw, away };
    }
    const counts = new Map<string, number>();
    for (const entry of pickedEntries) {
      if (!entry.teamCode) continue;
      counts.set(entry.teamCode, (counts.get(entry.teamCode) ?? 0) + 1);
    }
    const teams = Array.from(counts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count || teamName(a.code).localeCompare(teamName(b.code)));
    return { kind: 'knockout' as const, teams };
  }, [isGroupMatch, entries, pickedEntries, homeCode, awayCode]);

  const venue = match.venue ?? KNOCKOUT_VENUES[localId] ?? null;
  const showScore = match.score != null && (isFinished || match.status === 'IN_PLAY' || match.status === 'PAUSED');

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-0 py-3 backdrop-blur-sm animate-fade-in sm:px-4 sm:py-4">
      <div
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-none border border-white/10 bg-background-dark text-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-400 font-body">
                <span className="text-primary">{getStageLabel(match)}</span>
                {match.utcDate && (
                  <>
                    <span className="text-neutral-600">·</span>
                    <span>{formatMatchDateTimeET(match.utcDate)}</span>
                  </>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 text-lg font-black">
                <TeamFlag code={homeCode} liveFlag={match.homeFlag} teamFlagsByCode={teamFlagsByCode} size="large" />
                <span className="truncate">{teamName(homeCode, match.homeShortName ?? match.homeName)}</span>
                <span className="shrink-0 px-1 tabular-nums text-neutral-300">
                  {showScore ? `${match.score!.home} – ${match.score!.away}` : 'vs'}
                </span>
                <span className="truncate">{teamName(awayCode, match.awayShortName ?? match.awayName)}</span>
                <TeamFlag code={awayCode} liveFlag={match.awayFlag} teamFlagsByCode={teamFlagsByCode} size="large" />
              </div>
              {venue && (
                <p className="mt-1 truncate text-xs text-neutral-500 font-body">{venue}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-neutral-400 transition-colors hover:bg-white/15 hover:text-white md:h-9 md:w-9"
              aria-label="Close match predictions"
            >
              <span className="material-symbols-outlined text-xl md:text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!detailsAvailable ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="material-symbols-outlined text-3xl text-neutral-500">lock</span>
              <p className="text-sm font-semibold text-neutral-300">Predictions are locked</p>
              <p className="max-w-xs text-xs text-neutral-500 font-body">
                Everyone&rsquo;s picks become public once the tournament kicks off.
              </p>
            </div>
          ) : visiblePredictions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="material-symbols-outlined text-3xl text-neutral-500">group_off</span>
              <p className="text-sm font-semibold text-neutral-300">No predictions yet</p>
            </div>
          ) : (
            <>
              {/* Aggregate */}
              {aggregate.kind === 'group' ? (
                <div className="grid grid-cols-3 gap-2">
                  <OptionTile
                    flag={<TeamFlag code={homeCode} liveFlag={match.homeFlag} teamFlagsByCode={teamFlagsByCode} />}
                    label={teamName(homeCode, match.homeShortName ?? match.homeName)}
                    count={aggregate.home}
                    total={pickedEntries.length}
                    highlight={isFinished && match.actualResult === 'home'}
                  />
                  <OptionTile
                    flag={null}
                    label="Draw"
                    count={aggregate.draw}
                    total={pickedEntries.length}
                    highlight={isFinished && match.actualResult === 'draw'}
                  />
                  <OptionTile
                    flag={<TeamFlag code={awayCode} liveFlag={match.awayFlag} teamFlagsByCode={teamFlagsByCode} />}
                    label={teamName(awayCode, match.awayShortName ?? match.awayName)}
                    count={aggregate.away}
                    total={pickedEntries.length}
                    highlight={isFinished && match.actualResult === 'away'}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    Picked to advance
                  </p>
                  {aggregate.teams.length === 0 ? (
                    <p className="py-2 text-xs text-neutral-500 font-body">
                      No one has a pick for this match yet.
                    </p>
                  ) : (
                    aggregate.teams.map(team => {
                      const pct = pickedEntries.length > 0 ? Math.round((team.count / pickedEntries.length) * 100) : 0;
                      const highlight = isFinished && actualWinnerCode === team.code;
                      return (
                        <div key={team.code} className="flex items-center gap-2">
                          <span className="flex w-6 shrink-0 justify-center">
                            <TeamFlag code={team.code} teamFlagsByCode={teamFlagsByCode} size="small" />
                          </span>
                          <span className={`w-28 shrink-0 truncate text-xs font-bold ${highlight ? 'text-wc-green' : 'text-neutral-200'}`}>
                            {teamName(team.code)}
                          </span>
                          <div className="h-1.5 flex-grow overflow-hidden rounded-full bg-white/5">
                            <div
                              className={`h-full rounded-full ${highlight ? 'bg-wc-green' : 'bg-primary'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-12 shrink-0 text-right text-xs font-bold tabular-nums text-neutral-400">
                            {team.count} · {pct}%
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Participant list */}
              <div className="mt-5">
                <div className="flex items-center gap-3 border-b border-white/10 pb-2">
                  <span className="flex-grow text-xs font-bold uppercase text-neutral-500">Name</span>
                  <span className="text-xs font-bold uppercase text-neutral-500">Pick</span>
                </div>
                <div className="divide-y divide-white/10">
                  {entries.map(entry => (
                    <div key={entry.key} className="flex items-center gap-3 py-2.5">
                      {isFinished && (
                        <span
                          className={`material-symbols-outlined shrink-0 text-[18px] ${
                            entry.correct === true ? 'text-wc-green' : entry.correct === false ? 'text-wc-red' : 'text-neutral-600'
                          }`}
                        >
                          {entry.correct === true ? 'check_circle' : entry.correct === false ? 'cancel' : 'remove'}
                        </span>
                      )}
                      <span className="min-w-0 flex-grow truncate text-sm font-medium text-neutral-200">
                        {entry.name}
                      </span>
                      <PickChip entry={entry} teamFlagsByCode={teamFlagsByCode} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>,
    document.body,
  );
}

function OptionTile({
  flag,
  label,
  count,
  total,
  highlight,
}: {
  flag: React.ReactNode | null;
  label: string;
  count: number;
  total: number;
  highlight: boolean;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="py-1 text-center">
      <div className="flex h-5 items-center justify-center">
        {flag ?? <span className="text-sm font-black leading-none text-neutral-400">=</span>}
      </div>
      <div className={`mt-1.5 truncate text-[11px] font-bold ${highlight ? 'text-wc-green' : 'text-neutral-300'}`}>{label}</div>
      <div className={`mt-1 text-lg font-black tabular-nums ${highlight ? 'text-wc-green' : 'text-white'}`}>{count}</div>
      <div className={`text-sm font-bold tabular-nums ${highlight ? 'text-wc-green/80' : 'text-neutral-400'}`}>{pct}%</div>
    </div>
  );
}

function PickChip({ entry, teamFlagsByCode }: { entry: PickEntry; teamFlagsByCode?: Record<string, string> }) {
  if (!entry.hasPick) {
    return (
      <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-bold text-neutral-500">
        No pick
      </span>
    );
  }
  if (entry.isDraw) {
    return (
      <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-neutral-300">
        Draw
      </span>
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
        entry.correct === true
          ? 'border-wc-green/40 bg-wc-green/10 text-wc-green'
          : entry.correct === false
            ? 'border-wc-red/30 bg-wc-red/10 text-wc-red'
            : 'border-white/10 bg-white/5 text-neutral-200'
      }`}
    >
      <TeamFlag code={entry.teamCode} teamFlagsByCode={teamFlagsByCode} size="small" />
      {teamName(entry.teamCode)}
    </span>
  );
}
