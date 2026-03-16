'use client';

import { useState, useEffect } from 'react';
import { LeaderboardEntry, LeaderboardPrediction, SavedPrediction, MatchResult, LiveMatch } from '@/types';
import { teamsByCode } from '@/data/teams';
import { allGroupMatches } from '@/data/matches';
import { detectThirdPlaceTie } from '@/lib/standings';
import { useAuth } from '@/components/providers/AuthProvider';
import UserPredictionsModal from './UserPredictionsModal';

const PLACEHOLDER_USERS: LeaderboardEntry[] = [
  { user_id: 'p1', display_name: 'Mateo Hernandez', total_points: 87, champion_code: 'BR', calculated_at: '', position_change: 0 },
  { user_id: 'p2', display_name: 'Sarah Jenkins', total_points: 82, champion_code: 'FR', calculated_at: '', position_change: 1 },
  { user_id: 'p3', display_name: 'Luca Rossi', total_points: 76, champion_code: 'IT', calculated_at: '', position_change: -1 },
];

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
      user_id: u.user_id,
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

      // Build the user's active prediction as a LeaderboardPrediction
      const myActive = myPreds.find((p: SavedPrediction) => p.is_active && p.is_complete);
      const myLeaderboardPred: LeaderboardPrediction | null = myActive && user ? {
        prediction_number: myActive.prediction_number,
        user_id: user.id,
        display_name: user.display_name ?? 'You',
        champion_code: myActive.champion_code,
        group_matches: myActive.group_matches ?? {},
        knockout_matches: myActive.knockout_matches ?? {},
        third_place_tiebreaker: myActive.third_place_tiebreaker,
        is_approved: myActive.is_approved ?? false,
      } : null;

      if (preds.length === 0) {
        // Only show the user's own prediction if available, no placeholders
        setPredictions(myLeaderboardPred ? [myLeaderboardPred] : []);
        setTotalUsers(myLeaderboardPred ? 1 : 0);
      } else {
        // Ensure the user's prediction is included in real data
        const alreadyIncluded = myLeaderboardPred && preds.some((p: LeaderboardPrediction) => p.user_id === user?.id);
        setPredictions(myLeaderboardPred && !alreadyIncluded ? [myLeaderboardPred, ...preds] : preds);
        setTotalUsers(total || preds.length);
      }
      setLoading(false);
    });
  }, [user]);

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

  return (
    <div className="flex-grow pb-24">
      {/* Header */}
      <header className="py-6 sticky top-0 bg-background-dark/80 backdrop-blur-md z-30">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        </div>
      </header>

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
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-xl font-variation-fill">assignment</span>
                    <h2 className="font-bold text-lg">Predictions</h2>
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

                    const renderCard = (pred: LeaderboardPrediction, idx: number) => (
                      <button
                        key={`${pred.user_id}-${pred.prediction_number ?? idx}`}
                        onClick={() => setSelectedPrediction(pred)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-neutral-900 hover:bg-white/5 hover:border-primary/30 transition-colors text-left cursor-pointer group"
                      >
                        <div className="flex-grow min-w-0">
                          <div className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                            {pred.name || pred.display_name}
                            <span className="text-neutral-500 font-mono ml-1.5">#{pred.prediction_number ?? idx + 1}</span>
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
                        </div>
                        <span className="material-symbols-outlined text-neutral-500 text-[14px] group-hover:text-primary transition-colors shrink-0">expand_content</span>
                      </button>
                    );

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
                const userPrediction = predictions.find(p => p.user_id === entry.user_id);
                
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
                    <button 
                      key={entry.user_id} 
                      onClick={() => userPrediction && setSelectedPrediction(userPrediction)}
                      className={`w-full flex items-center bg-background-dark text-white p-4 rounded-xl border-2 border-primary shadow-lg ring-4 ring-primary/10 mb-2 text-left ${userPrediction ? 'cursor-pointer hover:bg-neutral-800 transition-colors' : ''}`}
                    >
                      <div className="w-10 text-center font-black text-primary text-lg">
                        {medal ?? rank}
                      </div>
                      <div className="ml-4 flex-grow">
                        <div className="font-bold flex items-center gap-2">
                          {entry.display_name}
                          {renderPositionChange(entry.position_change)}
                          <span className="bg-primary text-black text-[9px] px-1.5 py-0.5 rounded font-black">YOU</span>
                        </div>
                        {entry.champion_code && (
                          <div className="text-xs text-neutral-400 flex items-center gap-1 font-body">
                            Champion Pick: {getChampionLabel(entry.champion_code)}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-black text-lg text-primary">{entry.total_points}</div>
                        <div className="text-[10px] font-bold text-white/50 uppercase">Points</div>
                      </div>
                    </button>
                  );
                }

                if (rank <= 3) {
                  return (
                    <button 
                      key={entry.user_id} 
                      onClick={() => userPrediction && setSelectedPrediction(userPrediction)}
                      className={`w-full flex items-center bg-neutral-900 p-4 rounded-xl shadow-sm border mb-2 text-left ${rank === 1 ? 'border-primary/20' : 'border-white/10'} ${userPrediction ? 'cursor-pointer hover:bg-white/5 hover:border-primary/30 transition-colors group' : ''}`}
                    >
                      <div className="w-10 flex justify-center">
                        {medal}
                      </div>
                      <div className="ml-4 flex-grow">
                        <div className={`font-bold ${rank === 1 ? 'text-lg' : ''} flex items-center gap-2 ${userPrediction ? 'group-hover:text-primary transition-colors' : ''}`}>
                          {entry.display_name}
                          {renderPositionChange(entry.position_change)}
                        </div>
                        {entry.champion_code && (
                          <div className="text-xs text-neutral-400 font-body">
                            Predicted {getChampionLabel(entry.champion_code)} as Champion
                          </div>
                        )}
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <div className={`font-bold ${rank === 1 ? 'font-black text-xl text-primary' : 'text-lg text-neutral-300'}`}>
                            {rank === 1 ? '+' : ''}{entry.total_points}
                          </div>
                          <div className="text-[10px] font-bold text-neutral-400 uppercase">Points</div>
                        </div>
                        {userPrediction && <span className="material-symbols-outlined text-neutral-300 text-[20px] group-hover:text-primary transition-colors">chevron_right</span>}
                      </div>
                    </button>
                  );
                }

                return (
                  <button 
                    key={entry.user_id} 
                    onClick={() => userPrediction && setSelectedPrediction(userPrediction)}
                    className={`w-full flex items-center px-4 py-3 rounded-xl transition-colors mb-1 text-left ${userPrediction ? 'cursor-pointer hover:bg-white/5 hover:shadow-sm border border-transparent hover:border-white/10 group' : 'hover:bg-white/5'}`}
                  >
                    <div className="w-10 text-center text-sm font-bold text-neutral-400">
                      {rank}
                    </div>
                    <div className="ml-4 flex-grow flex items-center gap-2">
                      <span className={`font-medium ${userPrediction ? 'group-hover:text-primary transition-colors' : ''}`}>{entry.display_name}</span>
                      {renderPositionChange(entry.position_change)}
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div className="font-bold">{entry.total_points}</div>
                      {userPrediction && <span className="material-symbols-outlined text-neutral-300 text-[20px] group-hover:text-primary transition-colors">chevron_right</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* How to Score Points */}
        <section className="mt-10 md:mt-0 mb-4 md:sticky md:top-20 md:self-start">
          <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-gradient-to-b from-neutral-900/80 to-background-dark">
            {/* Subtle gold accent line at top */}
            <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            <div className="px-4 pt-4 pb-1">
              <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-neutral-500 font-body">Scoring</h2>
            </div>

            <div className="px-4 pb-4 pt-2">
              {[
                { round: 'Group Stage', pts: 1 },
                { round: 'Round of 32', pts: 2 },
                { round: 'Round of 16', pts: 3 },
                { round: 'Quarterfinals', pts: 4 },
                { round: 'Semifinals', pts: 5 },
                { round: 'Third Place', pts: 3 },
                { round: 'Final', pts: 6 },
                { round: 'Champion', pts: 10 },
              ].map((row, i) => (
                <div key={row.round} className="flex items-center justify-between py-[7px] border-b border-white/[0.04] last:border-0">
                  <span className="text-[13px] font-medium text-neutral-400 font-body">{row.round}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-px">
                      {Array.from({ length: row.pts }).map((_, j) => (
                        <div key={j} className="w-[3px] h-[10px] rounded-full bg-primary/30" />
                      ))}
                    </div>
                    <span className="text-[13px] font-black tabular-nums text-neutral-200 w-5 text-right">+{row.pts}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {selectedPrediction && (
        <UserPredictionsModal
          prediction={selectedPrediction}
          onClose={() => setSelectedPrediction(null)}
          liveMatches={liveMatches}
          teamFlagsByCode={teamFlagsByCode}
        />
      )}
    </div>
  );
}
