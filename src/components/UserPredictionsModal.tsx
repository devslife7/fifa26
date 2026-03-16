'use client';

import { useMemo } from 'react';
import { LeaderboardPrediction, LiveMatch, GroupLetter } from '@/types';
import { teamsByCode, groups } from '@/data/teams';
import { allGroupMatches } from '@/data/matches';
import { generateBracket } from '@/lib/bracket';
import { KNOCKOUT_POINTS, GROUP_POINTS, CHAMPION_POINTS } from '@/lib/scoring';
import type { KnockoutRound } from '@/types';

interface Props {
  prediction: LeaderboardPrediction;
  rank?: number;
  onClose: () => void;
  liveMatches?: Record<string, LiveMatch>;
  teamFlagsByCode?: Record<string, string>;
}

const ROUND_LABELS: Record<KnockoutRound, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  '3RD': 'Third Place',
  FIN: 'Final',
};

function TeamName({ code, flagsByCode }: { code: string; flagsByCode?: Record<string, string> }) {
  const team = teamsByCode[code];
  if (!team) return <span className="text-neutral-500">TBD</span>;
  const flagUrl = flagsByCode?.[code];
  const isTBD = code.startsWith('TBD');
  return (
    <span className="inline-flex items-center gap-1.5">
      {!isTBD && (
        flagUrl ? (
          <img src={flagUrl} alt="" className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0" />
        ) : (
          <span className="text-sm leading-none flex-shrink-0">{team.flag}</span>
        )
      )}
      <span className="truncate">{team.name}</span>
    </span>
  );
}

export default function UserPredictionsModal({ prediction, rank, onClose, liveMatches, teamFlagsByCode }: Props) {
  const championTeam = prediction.champion_code ? teamsByCode[prediction.champion_code] : null;
  const championFlagUrl = prediction.champion_code && teamFlagsByCode ? teamFlagsByCode[prediction.champion_code] : undefined;

  // Compute bracket for knockout
  const bracket = useMemo(() => {
    try {
      return generateBracket(
        prediction.group_matches,
        prediction.knockout_matches,
        prediction.third_place_tiebreaker ?? undefined,
      );
    } catch {
      return [];
    }
  }, [prediction.group_matches, prediction.knockout_matches, prediction.third_place_tiebreaker]);

  // Calculate points summary
  const pointsSummary = useMemo(() => {
    let groupCorrect = 0;
    let groupTotal = 0;
    const knockoutByRound: Record<string, { correct: number; total: number; points: number }> = {};

    // Group matches
    for (const match of allGroupMatches) {
      const predicted = prediction.group_matches[match.id];
      const live = liveMatches?.[match.id];
      if (live?.status === 'FINISHED' && live.actualResult) {
        groupTotal++;
        if (predicted === live.actualResult) groupCorrect++;
      }
    }

    // Knockout matches
    for (const match of bracket) {
      const live = liveMatches?.[match.id];
      if (live?.status === 'FINISHED' && live.actualResult) {
        const round = match.round;
        if (!knockoutByRound[round]) knockoutByRound[round] = { correct: 0, total: 0, points: 0 };
        knockoutByRound[round].total++;
        if (match.result === live.actualResult) {
          knockoutByRound[round].correct++;
          knockoutByRound[round].points += KNOCKOUT_POINTS[round] ?? 0;
        }
      }
    }

    const groupPoints = groupCorrect * GROUP_POINTS;
    const knockoutPoints = Object.values(knockoutByRound).reduce((sum, r) => sum + r.points, 0);

    // Champion check
    let championCorrect = false;
    // If final is finished, check champion
    const finalMatch = liveMatches?.['FIN-1'];
    if (finalMatch?.status === 'FINISHED' && finalMatch.actualResult) {
      const winnerCode = finalMatch.actualResult === 'home' ? finalMatch.homeCode : finalMatch.awayCode;
      if (winnerCode && prediction.champion_code === winnerCode) championCorrect = true;
    }

    const totalPoints = groupPoints + knockoutPoints + (championCorrect ? CHAMPION_POINTS : 0);

    return { groupCorrect, groupTotal, groupPoints, knockoutByRound, knockoutPoints, championCorrect, totalPoints };
  }, [prediction, liveMatches, bracket]);

  // Group matches organized by group letter
  const matchesByGroup = useMemo(() => {
    const map: Record<GroupLetter, typeof allGroupMatches> = {} as Record<GroupLetter, typeof allGroupMatches>;
    for (const g of groups) map[g] = [];
    for (const m of allGroupMatches) map[m.group].push(m);
    return map;
  }, []);

  // Knockout matches by round
  const knockoutByRound = useMemo(() => {
    const rounds: KnockoutRound[] = ['R32', 'R16', 'QF', 'SF', '3RD', 'FIN'];
    const map: Partial<Record<KnockoutRound, typeof bracket>> = {};
    for (const r of rounds) {
      const matches = bracket.filter(m => m.round === r);
      if (matches.length > 0) map[r] = matches;
    }
    return map;
  }, [bracket]);

  const hasAnyResults = liveMatches && Object.values(liveMatches).some(m => m.status === 'FINISHED');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-background-dark w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-white truncate">{prediction.display_name}&apos;s Predictions</h2>
            <div className="flex items-center gap-3 mt-1">
              {championTeam && (
                <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                  <span>Champion:</span>
                  <span className="inline-flex items-center gap-1 text-primary font-bold">
                    {championFlagUrl ? (
                      <img src={championFlagUrl} alt="" className="w-4 h-3 object-cover rounded-[2px]" />
                    ) : (
                      <span className="text-sm">{championTeam.flag}</span>
                    )}
                    <span className="font-body">{championTeam.name}</span>
                  </span>
                </div>
              )}
              {hasAnyResults && (
                <div className="flex items-center gap-1 text-xs font-bold text-primary">
                  <span className="material-symbols-outlined text-[14px]">stars</span>
                  <span className="font-body">{pointsSummary.totalPoints} pts</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-neutral-400 hover:bg-white/15 hover:text-white transition-colors flex-shrink-0 ml-3"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto">

          {/* ── SCORE BREAKDOWN ── */}
          <div className="px-4 sm:px-5 pt-4 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary text-xl font-variation-fill">bar_chart</span>
              <h3 className="font-black text-base">Score Breakdown</h3>
            </div>
            <div className="rounded-xl border border-white/10 bg-neutral-900/80 overflow-hidden">
              {/* Top row: Total Points + Rank */}
              <div className="flex items-end justify-between px-4 py-3">
                <div>
                  <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide">Total Points</div>
                  <div className="text-3xl font-black text-primary tabular-nums leading-tight">{pointsSummary.totalPoints}</div>
                </div>
                {rank && (
                  <div className="text-right">
                    <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide">Rank</div>
                    <div className="text-3xl font-black text-neutral-200 tabular-nums leading-tight">#{rank}</div>
                  </div>
                )}
              </div>
              {/* Bottom row: Group / Knockout / Champion */}
              <div className="grid grid-cols-3 border-t border-white/10">
                <div className="flex flex-col items-center py-3 border-r border-white/10">
                  <div className="text-xl font-black text-wc-green tabular-nums">{pointsSummary.groupPoints}</div>
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">Group</div>
                  <div className="text-[10px] text-neutral-500 font-body">{pointsSummary.groupCorrect}/{pointsSummary.groupTotal} correct</div>
                </div>
                <div className="flex flex-col items-center py-3 border-r border-white/10">
                  {(() => {
                    const koCorrect = Object.values(pointsSummary.knockoutByRound).reduce((s, r) => s + r.correct, 0);
                    const koTotal = Object.values(pointsSummary.knockoutByRound).reduce((s, r) => s + r.total, 0);
                    return (
                      <>
                        <div className="text-xl font-black text-blue-400 tabular-nums">{pointsSummary.knockoutPoints}</div>
                        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">Knockout</div>
                        <div className="text-[10px] text-neutral-500 font-body">{koCorrect}/{koTotal} correct</div>
                      </>
                    );
                  })()}
                </div>
                <div className="flex flex-col items-center py-3">
                  {pointsSummary.championCorrect ? (
                    <div className="text-xl font-black text-primary tabular-nums">+{CHAMPION_POINTS}</div>
                  ) : (
                    <span className="material-symbols-outlined text-xl text-neutral-600">block</span>
                  )}
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">Champion</div>
                  <div className="text-[10px] text-neutral-500 font-body">
                    {pointsSummary.championCorrect ? 'Correct!' : liveMatches?.['FIN-1']?.status === 'FINISHED' ? 'Wrong' : 'TBD'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── GROUP STAGE ── */}
          <div className="px-4 sm:px-5 pt-4 pb-1 flex items-center justify-between sticky top-0 z-10 bg-background-dark">
            <span className="text-[11px] font-black text-white/60 uppercase tracking-widest">Group Stage</span>
            <span className="text-[11px] font-bold text-primary/70 uppercase tracking-wide">+{GROUP_POINTS} pt per correct result</span>
          </div>

          <div className="px-4 sm:px-5 pb-2">
            {groups.map(group => (
              <div key={group} className="mb-2">
                <div className="py-1.5">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Group {group}</span>
                </div>
                <div className="bg-neutral-900/50 rounded-xl border border-white/5 overflow-hidden">
                  {matchesByGroup[group].map(match => {
                    const predicted = prediction.group_matches[match.id];
                    const live = liveMatches?.[match.id];
                    const isFinished = live?.status === 'FINISHED';
                    const isLive = live?.status === 'IN_PLAY' || live?.status === 'PAUSED';
                    const correct = isFinished && predicted && live?.actualResult ? predicted === live.actualResult : null;

                    const pickedLabel = predicted === 'home'
                      ? teamsByCode[match.home]?.name ?? match.home
                      : predicted === 'away'
                        ? teamsByCode[match.away]?.name ?? match.away
                        : predicted === 'draw'
                          ? 'Draw'
                          : null;

                    return (
                      <div key={match.id} className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 last:border-0">
                        {/* Teams stacked + score */}
                        <div className="flex-1 min-w-0 text-sm">
                          <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
                            <TeamName code={match.home} flagsByCode={teamFlagsByCode} />
                            {(isFinished || isLive) && live?.score && (
                              <span className={`ml-auto tabular-nums font-black ${isLive ? 'text-wc-green' : 'text-white'}`}>{live.score.home}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-neutral-300 font-medium">
                            <TeamName code={match.away} flagsByCode={teamFlagsByCode} />
                            {(isFinished || isLive) && live?.score && (
                              <span className={`ml-auto tabular-nums font-black ${isLive ? 'text-wc-green' : 'text-white'}`}>{live.score.away}</span>
                            )}
                          </div>
                        </div>

                        {/* Prediction + result */}
                        <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px] ml-2">
                          {pickedLabel ? (
                            <>
                              <span className={`font-semibold truncate max-w-[72px] ${correct === true ? 'text-wc-green' : correct === false ? 'text-wc-red' : 'text-neutral-400'}`}>
                                {pickedLabel}
                              </span>
                              {correct === true && (
                                <span className="inline-flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[14px] font-variation-fill text-wc-green">check_circle</span>
                                  <span className="text-[10px] font-bold text-wc-green">+{GROUP_POINTS}</span>
                                </span>
                              )}
                              {correct === false && (
                                <span className="material-symbols-outlined text-[14px] font-variation-fill text-wc-red">cancel</span>
                              )}
                            </>
                          ) : (
                            <span className="text-neutral-600 italic">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* ── KNOCKOUT BRACKET ── */}
          {Object.keys(knockoutByRound).length > 0 && (
            <>
              {(['R32', 'R16', 'QF', 'SF', '3RD', 'FIN'] as KnockoutRound[]).map(round => {
                const matches = knockoutByRound[round];
                if (!matches || matches.length === 0) return null;
                const pts = KNOCKOUT_POINTS[round] ?? 0;

                return (
                  <div key={round}>
                    <div className="px-4 sm:px-5 pt-3 pb-1 flex items-center justify-between sticky top-0 z-10 bg-background-dark">
                      <span className="text-[11px] font-black text-white/60 uppercase tracking-widest">{ROUND_LABELS[round]}</span>
                      <span className="text-[11px] font-bold text-primary/70 uppercase tracking-wide">+{pts} pts per correct winner</span>
                    </div>
                    <div className="px-4 sm:px-5 pb-2">
                      <div className="bg-neutral-900/50 rounded-xl border border-white/5 overflow-hidden">
                        {matches.map(match => {
                          const live = liveMatches?.[match.id];
                          const isFinished = live?.status === 'FINISHED';
                          const isLive = live?.status === 'IN_PLAY' || live?.status === 'PAUSED';
                          const correct = isFinished && match.result && live?.actualResult
                            ? match.result === live.actualResult
                            : null;

                          const pickedCode = match.result === 'home' ? match.home : match.result === 'away' ? match.away : null;
                          const pickedTeam = pickedCode ? teamsByCode[pickedCode] : null;

                          const homeCode = match.home;
                          const awayCode = match.away;

                          const isHomePicked = match.result === 'home';
                          const isAwayPicked = match.result === 'away';

                          return (
                            <div key={match.id} className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 last:border-0">
                              {/* Teams stacked + score */}
                              <div className="flex-1 min-w-0 text-sm">
                                <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
                                  {homeCode ? (
                                    <TeamName code={homeCode} flagsByCode={teamFlagsByCode} />
                                  ) : (
                                    <span className="text-neutral-500 italic">TBD</span>
                                  )}
                                  {(isFinished || isLive) && live?.score && (
                                    <span className={`ml-auto tabular-nums font-black ${isLive ? 'text-wc-green' : 'text-white'}`}>{live.score.home}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5 text-neutral-300 font-medium">
                                  {awayCode ? (
                                    <TeamName code={awayCode} flagsByCode={teamFlagsByCode} />
                                  ) : (
                                    <span className="text-neutral-500 italic">TBD</span>
                                  )}
                                  {(isFinished || isLive) && live?.score && (
                                    <span className={`ml-auto tabular-nums font-black ${isLive ? 'text-wc-green' : 'text-white'}`}>{live.score.away}</span>
                                  )}
                                </div>
                              </div>

                              {/* Prediction + result */}
                              <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px] ml-2">
                                {pickedTeam ? (
                                  <>
                                    <span className={`font-semibold truncate max-w-[72px] ${correct === true ? 'text-wc-green' : correct === false ? 'text-wc-red' : 'text-neutral-400'}`}>
                                      {pickedTeam.name}
                                    </span>
                                    {correct === true && (
                                      <span className="inline-flex items-center gap-0.5">
                                        <span className="material-symbols-outlined text-[14px] font-variation-fill text-wc-green">check_circle</span>
                                        <span className="text-[10px] font-bold text-wc-green">+{pts}</span>
                                      </span>
                                    )}
                                    {correct === false && (
                                      <span className="material-symbols-outlined text-[14px] font-variation-fill text-wc-red">cancel</span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-neutral-600 italic">—</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* ── CHAMPION BONUS ── */}
          {championTeam && (
            <div className="px-4 sm:px-5 pt-2 pb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black text-white/60 uppercase tracking-widest">Champion Pick</span>
                <span className="text-[11px] font-bold text-primary/70 uppercase tracking-wide">+{CHAMPION_POINTS} pts bonus</span>
              </div>
              <div className="bg-neutral-900/50 rounded-xl border border-white/5 px-3 py-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-300">
                  <TeamName code={prediction.champion_code!} flagsByCode={teamFlagsByCode} />
                </span>
                <div className="flex items-center gap-1.5 text-[11px]">
                  {pointsSummary.championCorrect ? (
                    <span className="inline-flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[14px] font-variation-fill text-wc-green">check_circle</span>
                      <span className="text-[10px] font-bold text-wc-green">+{CHAMPION_POINTS}</span>
                    </span>
                  ) : liveMatches?.['FIN-1']?.status === 'FINISHED' ? (
                    <span className="material-symbols-outlined text-[14px] font-variation-fill text-wc-red">cancel</span>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop click handler */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
