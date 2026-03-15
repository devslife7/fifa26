'use client';

import { useState, useEffect } from 'react';
import { LeaderboardEntry, LeaderboardPrediction, MatchResult, LiveMatch } from '@/types';
import { teamsByCode } from '@/data/teams';
import { allGroupMatches } from '@/data/matches';
import { detectThirdPlaceTie } from '@/lib/standings';
import { useAuth } from '@/components/providers/AuthProvider';
import UserPredictionsModal from './UserPredictionsModal';

const PLACEHOLDER_USERS: LeaderboardEntry[] = [
  { user_id: 'p1', display_name: 'Mateo Hernandez', total_points: 87, champion_code: 'BR', calculated_at: '', position_change: 0 },
  { user_id: 'p2', display_name: 'Sarah Jenkins', total_points: 82, champion_code: 'FR', calculated_at: '', position_change: 1 },
  { user_id: 'p3', display_name: 'Luca Rossi', total_points: 76, champion_code: 'IT', calculated_at: '', position_change: -1 },
  { user_id: 'p4', display_name: 'Emily Chen', total_points: 71, champion_code: 'AR', calculated_at: '', position_change: 2 },
  { user_id: 'p5', display_name: 'James O\'Brien', total_points: 68, champion_code: 'DE', calculated_at: '', position_change: -2 },
  { user_id: 'p6', display_name: 'Yuki Tanaka', total_points: 65, champion_code: 'JP', calculated_at: '', position_change: 3 },
  { user_id: 'p7', display_name: 'Carlos Medina', total_points: 62, champion_code: 'ES', calculated_at: '', position_change: 0 },
  { user_id: 'p8', display_name: 'Priya Patel', total_points: 59, champion_code: 'BR', calculated_at: '', position_change: -1 },
  { user_id: 'p9', display_name: 'David Kim', total_points: 56, champion_code: 'KR', calculated_at: '', position_change: 1 },
  { user_id: 'p10', display_name: 'Fatima Al-Rashid', total_points: 54, champion_code: 'AR', calculated_at: '', position_change: 4 },
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
    km['F-1'] = (ui + 1) % 2 === 0 ? 'home' : 'away';
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

    Promise.all([fetchLeaderboard, fetchPredictions]).then(([entries, { predictions: preds, totalUsers: total }]) => {
      if (entries.length === 0) {
        setLeaderboard(PLACEHOLDER_USERS);
        setUsePlaceholder(true);
      } else {
        setLeaderboard(entries);
      }
      if (preds.length === 0) {
        setPredictions(generatePlaceholderPredictions());
        setTotalUsers(PLACEHOLDER_USERS.length);
      } else {
        setPredictions(preds);
        setTotalUsers(total || preds.length);
      }
      setLoading(false);
    });
  }, []);

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
      <header className="p-6 sticky top-0 bg-background-dark/80 backdrop-blur-md z-30">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        </div>
      </header>

      <div className="px-0 md:grid md:grid-cols-[1fr,300px] md:gap-8">
        <div className="flex-grow">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-4xl animate-trophy-glow">🏆</div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Predictions Section */}
              {predictions.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-xl font-variation-fill">assignment</span>
                    <h2 className="font-bold text-lg">Predictions</h2>
                    <span className="text-xs text-neutral-400 ml-auto">{predictions.length}/{totalUsers} completed</span>
                  </div>

                  {usePlaceholder && (
                    <div className="mb-3 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-center">
                      <p className="text-xs text-neutral-400">Preview data — real predictions appear once users submit</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {predictions.map(pred => {
                      const groupCount = Object.keys(pred.group_matches).length;
                      const knockoutCount = Object.keys(pred.knockout_matches).length;

                      return (
                        <button
                          key={pred.user_id}
                          onClick={() => setSelectedPrediction(pred)}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-neutral-900 hover:bg-white/5 hover:border-primary/30 transition-colors text-left cursor-pointer group"
                        >
                          <div className="flex-grow min-w-0">
                            <div className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{pred.display_name}</div>
                            <div className="text-xs text-neutral-400 truncate font-body">
                              {getChampionLabel(pred.champion_code) ?? 'No champion pick'}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="text-[11px] font-bold text-neutral-500 tabular-nums">{groupCount}/72</div>
                              <div className="text-[9px] text-neutral-400 uppercase">Groups</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[11px] font-bold text-neutral-500 tabular-nums">{knockoutCount}</div>
                              <div className="text-[9px] text-neutral-400 uppercase">KO</div>
                            </div>
                            <span className="material-symbols-outlined text-neutral-300 text-[20px] group-hover:text-primary transition-colors ml-1">chevron_right</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Leaderboard List */}
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-xl font-variation-fill">emoji_events</span>
                <h2 className="font-bold text-lg">Rankings</h2>
              </div>

              {usePlaceholder && (
                <div className="mb-4 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-center">
                  <p className="text-xs text-neutral-400">Preview data — real scores appear once the tournament begins</p>
                </div>
              )}

              {leaderboard.map((entry, idx) => {
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
          <div className="bg-background-dark rounded-2xl overflow-hidden shadow-lg">
            <div className="px-5 pt-5 pb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-xl font-variation-fill">scoreboard</span>
              </div>
              <div>
                <h2 className="text-white font-bold text-lg leading-tight">How to Score Points</h2>
                <p className="text-neutral-500 text-xs">Predict correctly, climb the ranks</p>
              </div>
            </div>

            <div className="px-4 pb-4 space-y-2">
              {[
                { round: 'Group Stage', desc: 'Correct result (W/D/L)', pts: 1 },
                { round: 'Round of 32', desc: 'Correct winner', pts: 2 },
                { round: 'Round of 16', desc: 'Correct winner', pts: 3 },
                { round: 'Quarterfinals', desc: 'Correct winner', pts: 4 },
                { round: 'Semifinals', desc: 'Correct winner', pts: 5 },
                { round: 'Final', desc: 'Correct finalist', pts: 6 },
                { round: 'Champion', desc: 'Correct champion', pts: 10 },
              ].map((row, i) => {
                const isChampion = i === 6;
                return (
                  <div
                    key={row.round}
                    className={`flex items-center rounded-xl px-4 py-3 ${
                      isChampion
                        ? 'bg-primary/10 border border-primary/20'
                        : 'bg-white/5'
                    }`}
                  >
                    <div className="flex-grow">
                      <div className={`font-semibold text-sm ${isChampion ? 'text-primary' : 'text-white'}`}>
                        {row.round}
                      </div>
                      <div className="text-[11px] text-neutral-500">{row.desc}</div>
                    </div>
                    <div className={`font-black text-lg tabular-nums ${isChampion ? 'text-primary' : 'text-white'}`}>
                      +{row.pts}
                    </div>
                  </div>
                );
              })}
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
