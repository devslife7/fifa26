'use client';

import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { KnockoutMatch, KnockoutRound, LeaderboardPrediction, LiveMatch, MatchResult } from '@/types';
import { teamsByCode } from '@/data/teams';
import { allGroupMatches, KNOCKOUT_VENUES } from '@/data/matches';
import { generateBracket, getMatchWinner, getSlotGroupDeps, getSlotLabels, isPlaceholder } from '@/lib/logic/bracket';
import { getMatchStakes } from '@/lib/logic/scoring';
import { formatMatchDateTimeET } from '@/lib/utils/match-dates';
import { getStageLabel, TeamFlag } from './MatchesView';

interface Props {
  match: LiveMatch;
  predictions: LeaderboardPrediction[];
  teamFlagsByCode?: Record<string, string>;
  onClose: () => void;
}

// Where the winner of a knockout slot goes next (for the slot-path subtitle).
const NEXT_ROUND_LABEL: Record<KnockoutRound, string | null> = {
  R32: 'Round of 16',
  R16: 'Quarter-finals',
  QF: 'Semi-finals',
  SF: 'Final',
  '3RD': null,
  FIN: null,
};

interface PickEntry {
  key: string;
  name: string;
  /**
   * Real teams from this match that the participant's bracket sends through.
   * Group mode: 0 or 1 entry. Resolved knockout: 0, 1, or both — a bracket can
   * route South Africa and Canada through different slots and advance both.
   */
  teamCodes: string[];
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

function formatGroups(groups: string[]): string {
  const noun = groups.length === 1 ? 'Group' : 'Groups';
  if (groups.length === 1) return `${noun} ${groups[0]}`;
  const head = groups.slice(0, -1).join(', ');
  return `${noun} ${head} & ${groups[groups.length - 1]}`;
}

// Teams that a participant's bracket has advancing *past* the given round (i.e.
// the winners of that round). Used to map a resolved knockout match back onto the
// two real teams playing it, the same way scoring counts qualifier sets.
function teamsAdvancingPast(bracket: KnockoutMatch[], round: KnockoutRound): Set<string> {
  const matches =
    round === '3RD' ? bracket.filter(m => m.id === '3RD-1')
    : round === 'FIN' ? bracket.filter(m => m.id === 'FIN-1')
    : bracket.filter(m => m.round === round);
  const out = new Set<string>();
  for (const m of matches) {
    const winner = getMatchWinner(m);
    if (winner && !isPlaceholder(winner)) out.add(winner);
  }
  return out;
}

function advanceHeading(round: KnockoutRound, nextRoundLabel: string | null): string {
  if (nextRoundLabel) return `Predicted to reach the ${nextRoundLabel}`;
  if (round === 'FIN') return 'Predicted to win the tournament';
  return 'Predicted to win 3rd place';
}

function compareNames(a: PickEntry, b: PickEntry): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

export default function MatchPredictionsModal({ match, predictions, teamFlagsByCode, onClose }: Props) {
  const localId = match.localMatchId!;
  const isGroupMatch = /^[A-L]-\d+$/.test(localId);

  const staticMatch = isGroupMatch ? allGroupMatches.find(m => m.id === localId) : undefined;
  const homeCode = match.homeCode ?? staticMatch?.home ?? null;
  const awayCode = match.awayCode ?? staticMatch?.away ?? null;

  const knockoutRound = !isGroupMatch ? (localId.split('-')[0] as KnockoutRound) : null;
  // Both sides unknown → show only the bracket path + stakes (no player picks yet).
  // One real team known → treat it exactly like a resolved match for that team.
  const bothTBD = !isGroupMatch && !homeCode && !awayCode;
  // group → two-team vote · knockoutTBD → path + stakes only · knockoutResolved → vote on the real team(s)
  const mode: 'group' | 'knockoutTBD' | 'knockoutResolved' =
    isGroupMatch ? 'group' : bothTBD ? 'knockoutTBD' : 'knockoutResolved';
  const slotLabels = bothTBD ? getSlotLabels(localId) : null;
  const stakes = knockoutRound ? getMatchStakes(knockoutRound) : null;
  const groupDeps = bothTBD ? getSlotGroupDeps(localId) : [];
  const nextRoundLabel = NEXT_ROUND_LABEL[knockoutRound ?? 'FIN'];

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
    // Both teams unknown — no meaningful per-player picks to show yet.
    if (mode === 'knockoutTBD') return [];

    const built = visiblePredictions.map((prediction, index) => {
      const base = {
        key: predictionKey(prediction, index),
        name: predictionName(prediction),
      };

      if (mode === 'group') {
        const pick = prediction.group_matches?.[localId] as MatchResult | undefined;
        const teamCode = pick === 'home' ? homeCode : pick === 'away' ? awayCode : null;
        return {
          ...base,
          teamCodes: teamCode ? [teamCode] : [],
          isDraw: pick === 'draw',
          hasPick: pick != null,
          correct: isFinished && pick != null ? pick === match.actualResult : null,
        };
      }

      // knockoutResolved — at least one real team known. Ask each bracket whether
      // it has a real team advancing past this round, so the vote is about the
      // actual matchup (works the same with one team still TBD). A bracket can
      // route both real teams through different slots, so credit each separately.
      const codes: string[] = [];
      try {
        const bracket = generateBracket(
          prediction.group_matches ?? {},
          prediction.knockout_matches ?? {},
          prediction.third_place_tiebreaker ?? undefined,
        );
        const advancing = teamsAdvancingPast(bracket, knockoutRound!);
        // Include either real team this bracket sends through, regardless of path.
        if (!!homeCode && advancing.has(homeCode)) codes.push(homeCode);
        if (!!awayCode && advancing.has(awayCode)) codes.push(awayCode);
      } catch {
        codes.length = 0;
      }
      return {
        ...base,
        teamCodes: codes,
        isDraw: false,
        hasPick: codes.length > 0,
        correct: isFinished && actualWinnerCode && codes.length > 0 ? codes.includes(actualWinnerCode) : null,
      };
    });

    // group & knockoutResolved: both teams first, then home-only, away-only,
    // draw, then no/other pick.
    const rank = (entry: PickEntry) => {
      const hasHome = !!homeCode && entry.teamCodes.includes(homeCode);
      const hasAway = !!awayCode && entry.teamCodes.includes(awayCode);
      if (hasHome && hasAway) return 0;
      if (hasHome) return 1;
      if (hasAway) return 2;
      if (entry.isDraw) return 3;
      return 4;
    };

    return built.sort((a, b) => rank(a) - rank(b) || compareNames(a, b));
  }, [visiblePredictions, mode, knockoutRound, localId, homeCode, awayCode, isFinished, match.actualResult, actualWinnerCode]);

  // Show every participant, including those whose bracket sends a different team
  // through (rendered as "Different pick"). These entries already sort to the bottom.
  const listEntries = entries;

  // Aggregate (group & resolved-knockout): vote tally on the real team(s).
  const aggregate = useMemo(() => {
    const home = entries.filter(e => !!homeCode && e.teamCodes.includes(homeCode)).length;
    const away = entries.filter(e => !!awayCode && e.teamCodes.includes(awayCode)).length;
    const draw = entries.filter(e => e.isDraw).length;
    return { home, draw, away, showDraw: mode === 'group' };
  }, [mode, entries, homeCode, awayCode]);

  // Denominator for the share bars: total advancements (not players), so the
  // bars sum to ~100% even when a user backs both real teams.
  const totalShare = aggregate.home + aggregate.away + aggregate.draw;

  const venue = match.venue ?? KNOCKOUT_VENUES[localId] ?? null;

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
          {/* Slot path + point stakes for knockout slots whose teams aren't set yet */}
          {slotLabels && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
              <div className="flex items-center justify-center gap-2 text-sm font-bold text-neutral-100">
                <span>{slotLabels.home}</span>
                <span className="text-xs font-medium text-neutral-500">vs</span>
                <span>{slotLabels.away}</span>
              </div>
              {nextRoundLabel && (
                <p className="mt-1 text-center text-[11px] text-neutral-500 font-body">
                  Winner advances to the {nextRoundLabel}
                </p>
              )}
            </div>
          )}
          {bothTBD && stakes && (
            <div className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Points at stake
              </p>
              <ul className="mt-1.5 space-y-1">
                {[stakes.winner].map(line => (
                  <li key={line} className="flex items-center gap-2 text-xs text-neutral-300 font-body">
                    <span className="material-symbols-outlined text-[16px] text-primary">add_circle</span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {bothTBD ? (
            <p className="text-xs text-neutral-500 font-body">
              Player picks appear once the teams are decided
              {groupDeps.length > 0 ? ` — once ${formatGroups(groupDeps)} finish.` : '.'}
            </p>
          ) : !detailsAvailable ? (
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
              <div className="space-y-2 py-1">
                  {mode === 'knockoutResolved' && knockoutRound && (
                    <p className="pb-0.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                      {advanceHeading(knockoutRound, nextRoundLabel)}
                    </p>
                  )}
                  {(mode === 'group' || homeCode) && (
                    <PredictionShareRow
                      flag={<TeamFlag code={homeCode} liveFlag={match.homeFlag} teamFlagsByCode={teamFlagsByCode} />}
                      label={teamName(homeCode, match.homeShortName ?? match.homeName)}
                      count={aggregate.home}
                      total={totalShare}
                      highlight={isFinished && match.actualResult === 'home'}
                    />
                  )}
                  {(mode === 'group' || awayCode) && (
                    <PredictionShareRow
                      flag={<TeamFlag code={awayCode} liveFlag={match.awayFlag} teamFlagsByCode={teamFlagsByCode} />}
                      label={teamName(awayCode, match.awayShortName ?? match.awayName)}
                      count={aggregate.away}
                      total={totalShare}
                      highlight={isFinished && match.actualResult === 'away'}
                    />
                  )}
                  {aggregate.showDraw && (
                    <PredictionShareRow
                      flag={null}
                      label="Draw"
                      count={aggregate.draw}
                      total={totalShare}
                      highlight={isFinished && match.actualResult === 'draw'}
                    />
                  )}
                  {mode === 'knockoutResolved' && (
                    <p className="pt-1 text-[11px] text-neutral-500 font-body">
                      Showing players whose bracket has {[
                        homeCode && teamName(homeCode, match.homeShortName ?? match.homeName),
                        awayCode && teamName(awayCode, match.awayShortName ?? match.awayName),
                      ].filter(Boolean).join(' or ')} reaching the {nextRoundLabel ?? 'next round'} — based on their own group and knockout picks.
                    </p>
                  )}
                </div>

              {/* Participant list */}
              <div className="mt-5">
                <div className="flex items-center gap-3 border-b border-white/10 pb-2">
                  <span className="flex-grow text-xs font-bold uppercase text-neutral-500">Name</span>
                  <span className="text-xs font-bold uppercase text-neutral-500">Pick</span>
                </div>
                <div className="divide-y divide-white/10">
                  {listEntries.length === 0 ? (
                    <p className="py-3 text-xs text-neutral-500 font-body">
                      No players have either team advancing in their bracket.
                    </p>
                  ) : (
                    listEntries.map(entry => (
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
                        <PickChip
                          entry={entry}
                          teamFlagsByCode={teamFlagsByCode}
                          isFinished={isFinished}
                          actualWinnerCode={actualWinnerCode}
                        />
                      </div>
                    ))
                  )}
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

function PredictionShareRow({
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
    <div className="flex min-w-0 items-center gap-2 py-1.5">
      <div className="flex w-6 shrink-0 justify-center">
        {flag ?? <span className="text-sm font-black leading-none text-neutral-400">=</span>}
      </div>
      <div className="min-w-0 w-28 shrink-0">
        <span className={`min-w-0 truncate text-xs font-bold ${highlight ? 'text-wc-green' : 'text-neutral-200'}`}>
          {label}
        </span>
      </div>
      <span className="w-5 shrink-0 text-right text-[11px] font-bold tabular-nums text-neutral-500">
        {count}
      </span>
      <div className="min-w-0 flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${highlight ? 'bg-wc-green' : 'bg-primary'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className={`w-11 shrink-0 text-right text-sm font-semibold tabular-nums ${highlight ? 'text-wc-green' : 'text-neutral-300'}`}>
        {pct}%
      </div>
    </div>
  );
}

function PickChip({
  entry,
  teamFlagsByCode,
  isFinished,
  actualWinnerCode,
}: {
  entry: PickEntry;
  teamFlagsByCode?: Record<string, string>;
  isFinished: boolean;
  actualWinnerCode: string | null;
}) {
  if (!entry.hasPick) {
    return (
      <span className="shrink-0 text-[11px] font-bold text-neutral-500">
        Different pick
      </span>
    );
  }
  if (entry.isDraw) {
    return (
      <span className="shrink-0 text-[11px] font-bold text-neutral-300">
        Draw
      </span>
    );
  }
  // On a finished match color each team individually: the team that actually
  // advanced is green, the other red; otherwise neutral.
  const colorFor = (code: string) => {
    if (!isFinished || !actualWinnerCode) return 'text-neutral-200';
    return code === actualWinnerCode ? 'text-wc-green' : 'text-wc-red';
  };
  return (
    <span className="flex shrink-0 flex-col items-end gap-1">
      {entry.teamCodes.map(code => (
        <span
          key={code}
          className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${colorFor(code)}`}
        >
          <TeamFlag code={code} teamFlagsByCode={teamFlagsByCode} size="small" />
          {teamName(code)}
        </span>
      ))}
    </span>
  );
}
