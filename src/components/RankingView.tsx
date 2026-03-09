'use client';

import { useState, useEffect } from 'react';
import { LeaderboardEntry } from '@/types';
import { teamsByCode } from '@/data/teams';
import { useAuth } from '@/components/providers/AuthProvider';

const PLACEHOLDER_USERS: LeaderboardEntry[] = [
  { user_id: 'p1', display_name: 'Mateo Hernandez', total_points: 87, champion_code: 'BR', calculated_at: '' },
  { user_id: 'p2', display_name: 'Sarah Jenkins', total_points: 82, champion_code: 'FR', calculated_at: '' },
  { user_id: 'p3', display_name: 'Luca Rossi', total_points: 76, champion_code: 'IT', calculated_at: '' },
  { user_id: 'p4', display_name: 'Emily Chen', total_points: 71, champion_code: 'AR', calculated_at: '' },
  { user_id: 'p5', display_name: 'James O\'Brien', total_points: 68, champion_code: 'DE', calculated_at: '' },
  { user_id: 'p6', display_name: 'Yuki Tanaka', total_points: 65, champion_code: 'JP', calculated_at: '' },
  { user_id: 'p7', display_name: 'Carlos Medina', total_points: 62, champion_code: 'ES', calculated_at: '' },
  { user_id: 'p8', display_name: 'Priya Patel', total_points: 59, champion_code: 'BR', calculated_at: '' },
  { user_id: 'p9', display_name: 'David Kim', total_points: 56, champion_code: 'KR', calculated_at: '' },
  { user_id: 'p10', display_name: 'Fatima Al-Rashid', total_points: 54, champion_code: 'AR', calculated_at: '' },
  { user_id: 'p11', display_name: 'Marco Bianchi', total_points: 51, champion_code: 'IT', calculated_at: '' },
  { user_id: 'p12', display_name: 'Sophie Dubois', total_points: 48, champion_code: 'FR', calculated_at: '' },
  { user_id: 'p13', display_name: 'Raj Kapoor', total_points: 46, champion_code: 'BR', calculated_at: '' },
  { user_id: 'p14', display_name: 'Olivia Martinez', total_points: 43, champion_code: 'US', calculated_at: '' },
  { user_id: 'p15', display_name: 'Noah Williams', total_points: 41, champion_code: 'GB-ENG', calculated_at: '' },
  { user_id: 'p16', display_name: 'Chloe Andersson', total_points: 39, champion_code: 'SE', calculated_at: '' },
  { user_id: 'p17', display_name: 'Hassan Youssef', total_points: 37, champion_code: 'MA', calculated_at: '' },
  { user_id: 'p18', display_name: 'Mia Johnson', total_points: 35, champion_code: 'AR', calculated_at: '' },
  { user_id: 'p19', display_name: 'Tomas Silva', total_points: 33, champion_code: 'PT', calculated_at: '' },
  { user_id: 'p20', display_name: 'Aisha Okafor', total_points: 31, champion_code: 'NG', calculated_at: '' },
  { user_id: 'p21', display_name: 'Ethan Brown', total_points: 29, champion_code: 'US', calculated_at: '' },
  { user_id: 'p22', display_name: 'Ingrid Larsen', total_points: 27, champion_code: 'DE', calculated_at: '' },
  { user_id: 'p23', display_name: 'Kenji Nakamura', total_points: 25, champion_code: 'JP', calculated_at: '' },
  { user_id: 'p24', display_name: 'Ana Petrovic', total_points: 23, champion_code: 'HR', calculated_at: '' },
  { user_id: 'p25', display_name: 'Lucas Bergmann', total_points: 21, champion_code: 'DE', calculated_at: '' },
  { user_id: 'p26', display_name: 'Zara Khan', total_points: 19, champion_code: 'BR', calculated_at: '' },
  { user_id: 'p27', display_name: 'Diego Fernandez', total_points: 17, champion_code: 'AR', calculated_at: '' },
  { user_id: 'p28', display_name: 'Emma Wilson', total_points: 15, champion_code: 'GB-ENG', calculated_at: '' },
  { user_id: 'p29', display_name: 'Ryu Watanabe', total_points: 13, champion_code: 'JP', calculated_at: '' },
  { user_id: 'p30', display_name: 'Clara Fontaine', total_points: 11, champion_code: 'FR', calculated_at: '' },
];

export default function RankingView() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [usePlaceholder, setUsePlaceholder] = useState(false);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => {
        const entries = data.leaderboard ?? [];
        if (entries.length === 0) {
          setLeaderboard(PLACEHOLDER_USERS);
          setUsePlaceholder(true);
        } else {
          setLeaderboard(entries);
        }
        setLoading(false);
      })
      .catch(() => {
        setLeaderboard(PLACEHOLDER_USERS);
        setUsePlaceholder(true);
        setLoading(false);
      });
  }, []);

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return <span className="material-symbols-outlined text-[#FFD700] text-3xl font-variation-fill">emoji_events</span>;
    if (rank === 2) return <span className="material-symbols-outlined text-[#C0C0C0] text-2xl font-variation-fill">emoji_events</span>;
    if (rank === 3) return <span className="material-symbols-outlined text-[#CD7F32] text-2xl font-variation-fill">emoji_events</span>;
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
      <header className="p-6 sticky top-0 bg-background-light/80 backdrop-blur-md z-30">
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
      </header>

      {/* Leaderboard List */}
      <div className="px-6 flex-grow">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-4xl animate-trophy-glow">🏆</div>
          </div>
        ) : (
          <div className="space-y-3">
            {usePlaceholder && (
              <div className="mb-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <p className="text-xs text-slate-400">Preview data — real scores appear once the tournament begins</p>
              </div>
            )}

            {leaderboard.map((entry, idx) => {
              const rank = idx + 1;
              const isCurrentUser = !usePlaceholder && user?.id === entry.user_id;
              const medal = getMedalIcon(rank);

              if (isCurrentUser) {
                return (
                  <div key={entry.user_id} className="flex items-center bg-background-dark text-white p-4 rounded-xl border-2 border-primary shadow-lg ring-4 ring-primary/10">
                    <div className="w-10 text-center font-black text-primary">
                      {medal ?? rank}
                    </div>
                    <div className="ml-4 flex-grow">
                      <div className="font-bold flex items-center gap-2">
                        {entry.display_name} <span className="bg-primary text-black text-[9px] px-1.5 py-0.5 rounded font-black">YOU</span>
                      </div>
                      {entry.champion_code && (
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          Champion Pick: {getChampionLabel(entry.champion_code)}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-black text-lg text-primary">{entry.total_points}</div>
                      <div className="text-[10px] font-bold text-white/50 uppercase">Points</div>
                    </div>
                  </div>
                );
              }

              if (rank <= 3) {
                return (
                  <div key={entry.user_id} className={`flex items-center bg-white p-4 rounded-xl shadow-sm border ${rank === 1 ? 'border-primary/20' : 'border-slate-100'}`}>
                    <div className="w-10 flex justify-center">{medal}</div>
                    <div className="ml-4 flex-grow">
                      <div className={`font-bold ${rank === 1 ? 'text-lg' : ''} flex items-center gap-2`}>
                        {entry.display_name}
                      </div>
                      {entry.champion_code && (
                        <div className="text-xs text-slate-400">
                          Predicted {getChampionLabel(entry.champion_code)} as Champion
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${rank === 1 ? 'font-black text-xl text-primary' : 'text-lg text-slate-700'}`}>
                        {rank === 1 ? '+' : ''}{entry.total_points}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Points</div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={entry.user_id} className="flex items-center px-4 py-3 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="w-10 text-center text-sm font-bold text-slate-400">{rank}</div>
                  <div className="ml-4 flex-grow flex items-center gap-2">
                    <span className="font-medium">{entry.display_name}</span>
                  </div>
                  <div className="text-right font-bold">{entry.total_points}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* How to Score Points */}
      <section className="px-6 mt-10 mb-4">
        <div className="bg-background-dark rounded-2xl overflow-hidden shadow-lg">
          <div className="px-5 pt-5 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-xl font-variation-fill">scoreboard</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">How to Score Points</h2>
              <p className="text-slate-500 text-xs">Predict correctly, climb the ranks</p>
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
                    <div className="text-[11px] text-slate-500">{row.desc}</div>
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
  );
}
