'use client';

import { useMemo } from 'react';
import { LeaderboardPrediction, LiveMatch, GroupLetter, KnockoutRound } from '@/types';
import { teamsByCode, groups } from '@/data/teams';
import { allGroupMatches } from '@/data/matches';
import { GROUP_POINTS, QUALIFIER_POINTS, WINNER_POINTS } from '@/lib/logic/scoring';
import { usePredictionResults } from '@/hooks/usePredictionResults';

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

function TeamPill({
  code,
  state,
  flagsByCode,
}: {
  code: string;
  state: 'hit' | 'miss' | 'pending';
  flagsByCode?: Record<string, string>;
}) {
  const team = teamsByCode[code];
  const flagUrl = flagsByCode?.[code];
  const tone =
    state === 'hit'
      ? 'border-wc-green/40 bg-wc-green/10 text-wc-green'
      : state === 'miss'
        ? 'border-wc-red/30 bg-wc-red/10 text-wc-red'
        : 'border-white/10 bg-neutral-900 text-neutral-300';
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      {flagUrl ? (
        <img src={flagUrl} alt="" className="w-4 h-3 object-cover rounded-[2px]" />
      ) : team ? (
        <span className="text-xs leading-none">{team.flag}</span>
      ) : null}
      <span className="font-body">{team?.name ?? code}</span>
      {state === 'hit' && (
        <span className="material-symbols-outlined text-[12px] font-variation-fill">check</span>
      )}
      {state === 'miss' && (
        <span className="material-symbols-outlined text-[12px] font-variation-fill">close</span>
      )}
    </div>
  );
}

function pillState(code: string, actualSet: Set<string>, hasActualSignal: boolean): 'hit' | 'miss' | 'pending' {
  if (!hasActualSignal) return 'pending';
  return actualSet.has(code) ? 'hit' : 'miss';
}

export default function UserPredictionsModal({ prediction, rank, onClose, liveMatches, teamFlagsByCode }: Props) {
  const championTeam = prediction.champion_code ? teamsByCode[prediction.champion_code] : null;
  const championFlagUrl = prediction.champion_code && teamFlagsByCode ? teamFlagsByCode[prediction.champion_code] : undefined;

  const { predicted, actual, hasSignal, summary: pointsSummary } = usePredictionResults(prediction, liveMatches);

  const matchesByGroup = useMemo(() => {
    const map: Record<GroupLetter, typeof allGroupMatches> = {} as Record<GroupLetter, typeof allGroupMatches>;
    for (const g of groups) map[g] = [];
    for (const m of allGroupMatches) map[m.group].push(m);
    return map;
  }, []);

  const hasAnyResults = liveMatches && Object.values(liveMatches).some(m => m.status === 'FINISHED');

  const sortedTeams = (set: Set<string>): string[] =>
    Array.from(set).sort((a, b) => {
      const an = teamsByCode[a]?.name ?? a;
      const bn = teamsByCode[b]?.name ?? b;
      return an.localeCompare(bn);
    });

  type QualifierRoundProps = {
    title: string;
    perPick: number;
    predictedSet: Set<string>;
    actualSet: Set<string>;
    hasSignal: boolean;
    earned: number;
  };
  const QualifierRound = ({ title, perPick, predictedSet, actualSet, hasSignal: signal, earned }: QualifierRoundProps) => {
    const teams = sortedTeams(predictedSet);
    const max = teams.length * perPick;
    return (
      <div>
        <div className="px-4 sm:px-5 pt-3 pb-1 flex items-center justify-between sticky top-0 z-10 bg-background-dark">
          <span className="text-[11px] font-black text-white/60 uppercase tracking-widest">{title}</span>
          <span className="text-[11px] font-bold text-primary/70 uppercase tracking-wide tabular-nums">
            +{perPick} / team · {signal ? `${earned} / ${max}` : `max ${max}`}
          </span>
        </div>
        <div className="px-4 sm:px-5 pb-2">
          <div className="bg-neutral-900/50 rounded-xl border border-white/5 px-3 py-2.5 flex flex-wrap gap-1.5">
            {teams.length === 0 ? (
              <span className="text-[11px] text-neutral-500 italic">No picks yet</span>
            ) : (
              teams.map((code) => (
                <TeamPill
                  key={code}
                  code={code}
                  state={pillState(code, actualSet, signal)}
                  flagsByCode={teamFlagsByCode}
                />
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-background-dark w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-white truncate">{(prediction.display_name && prediction.display_name !== 'Unknown' ? prediction.display_name : prediction.name) || 'Anonymous'}&apos;s Predictions</h2>
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
              <div className="grid grid-cols-2 border-t border-white/10">
                <div className="flex flex-col items-center py-3 border-r border-white/10">
                  <div className="text-xl font-black text-wc-green tabular-nums">{pointsSummary.groupPoints}</div>
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">Group</div>
                  <div className="text-[10px] text-neutral-500 font-body">{pointsSummary.groupCorrect}/{pointsSummary.groupTotal} correct</div>
                </div>
                <div className="flex flex-col items-center py-3">
                  <div className="text-xl font-black text-blue-400 tabular-nums">{pointsSummary.knockoutPoints}</div>
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">Knockout</div>
                  <div className="text-[10px] text-neutral-500 font-body">qualifier + winner bonuses</div>
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
                    const predictedPick = prediction.group_matches[match.id];
                    const live = liveMatches?.[match.id];
                    const isFinished = live?.status === 'FINISHED';
                    const isLive = live?.status === 'IN_PLAY' || live?.status === 'PAUSED';
                    const correct = isFinished && predictedPick && live?.actualResult ? predictedPick === live.actualResult : null;

                    const pickedLabel = predictedPick === 'home'
                      ? teamsByCode[match.home]?.name ?? match.home
                      : predictedPick === 'away'
                        ? teamsByCode[match.away]?.name ?? match.away
                        : predictedPick === 'draw'
                          ? 'Draw'
                          : null;

                    return (
                      <div key={match.id} className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 last:border-0">
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

          {/* ── KNOCKOUT QUALIFIERS ── */}
          <QualifierRound
            title={ROUND_LABELS.R32}
            perPick={QUALIFIER_POINTS.R32}
            predictedSet={predicted.R32}
            actualSet={actual.R32}
            hasSignal={hasSignal.R32}
            earned={pointsSummary.r32Pts}
          />
          <QualifierRound
            title={ROUND_LABELS.R16}
            perPick={QUALIFIER_POINTS.R16}
            predictedSet={predicted.R16}
            actualSet={actual.R16}
            hasSignal={hasSignal.R16}
            earned={pointsSummary.r16Pts}
          />
          <QualifierRound
            title={ROUND_LABELS.QF}
            perPick={QUALIFIER_POINTS.QF}
            predictedSet={predicted.QF}
            actualSet={actual.QF}
            hasSignal={hasSignal.QF}
            earned={pointsSummary.qfPts}
          />
          <QualifierRound
            title={ROUND_LABELS.SF}
            perPick={QUALIFIER_POINTS.SF}
            predictedSet={predicted.SF}
            actualSet={actual.SF}
            hasSignal={hasSignal.SF}
            earned={pointsSummary.sfPts}
          />

          {/* ── 3RD PLACE ── */}
          <div>
            <div className="px-4 sm:px-5 pt-3 pb-1 flex items-center justify-between sticky top-0 z-10 bg-background-dark">
              <span className="text-[11px] font-black text-white/60 uppercase tracking-widest">{ROUND_LABELS['3RD']}</span>
              <span className="text-[11px] font-bold text-primary/70 uppercase tracking-wide">
                +{QUALIFIER_POINTS['3RD']} finalist · +{WINNER_POINTS['3RD']} winner
              </span>
            </div>
            <div className="px-4 sm:px-5 pb-2 space-y-1.5">
              <div className="bg-neutral-900/50 rounded-xl border border-white/5 px-3 py-2.5 flex flex-wrap gap-1.5">
                {sortedTeams(predicted.thirdParticipants).map(code => (
                  <TeamPill
                    key={code}
                    code={code}
                    state={pillState(code, actual.thirdParticipants, hasSignal['3RD'])}
                    flagsByCode={teamFlagsByCode}
                  />
                ))}
                {predicted.thirdParticipants.size === 0 && (
                  <span className="text-[11px] text-neutral-500 italic">No picks yet</span>
                )}
              </div>
              {predicted.thirdWinner && (
                <div className="bg-neutral-900/50 rounded-xl border border-white/5 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                    <span className="font-bold uppercase tracking-wider">Winner pick</span>
                    <TeamPill
                      code={predicted.thirdWinner}
                      state={
                        hasSignal.thirdWinner
                          ? actual.thirdWinner === predicted.thirdWinner ? 'hit' : 'miss'
                          : 'pending'
                      }
                      flagsByCode={teamFlagsByCode}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-primary/70 tabular-nums">
                    {hasSignal.thirdWinner && actual.thirdWinner === predicted.thirdWinner
                      ? `+${WINNER_POINTS['3RD']}`
                      : `max +${WINNER_POINTS['3RD']}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── FINAL ── */}
          <div className="pb-4">
            <div className="px-4 sm:px-5 pt-3 pb-1 flex items-center justify-between sticky top-0 z-10 bg-background-dark">
              <span className="text-[11px] font-black text-white/60 uppercase tracking-widest">{ROUND_LABELS.FIN}</span>
              <span className="text-[11px] font-bold text-primary/70 uppercase tracking-wide">
                +{QUALIFIER_POINTS.FIN} finalist · +{WINNER_POINTS.FIN} champion
              </span>
            </div>
            <div className="px-4 sm:px-5 pb-2 space-y-1.5">
              <div className="bg-neutral-900/50 rounded-xl border border-white/5 px-3 py-2.5 flex flex-wrap gap-1.5">
                {sortedTeams(predicted.finalParticipants).map(code => (
                  <TeamPill
                    key={code}
                    code={code}
                    state={pillState(code, actual.finalParticipants, hasSignal.FIN)}
                    flagsByCode={teamFlagsByCode}
                  />
                ))}
                {predicted.finalParticipants.size === 0 && (
                  <span className="text-[11px] text-neutral-500 italic">No picks yet</span>
                )}
              </div>
              {predicted.finalWinner && (
                <div className="bg-neutral-900/50 rounded-xl border border-white/5 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                    <span className="font-bold uppercase tracking-wider">Champion pick</span>
                    <TeamPill
                      code={predicted.finalWinner}
                      state={
                        hasSignal.finalWinner
                          ? actual.finalWinner === predicted.finalWinner ? 'hit' : 'miss'
                          : 'pending'
                      }
                      flagsByCode={teamFlagsByCode}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-primary/70 tabular-nums">
                    {hasSignal.finalWinner && actual.finalWinner === predicted.finalWinner
                      ? `+${WINNER_POINTS.FIN}`
                      : `max +${WINNER_POINTS.FIN}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
