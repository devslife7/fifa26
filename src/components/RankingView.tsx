'use client';

export default function RankingView() {
    return (
        <div className="flex-grow pb-24">
            {/* Header */}
            <header className="p-6 sticky top-0 bg-background-light/80 backdrop-blur-md z-30">
                <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
            </header>

            {/* Leaderboard List */}
            <div className="px-6 flex-grow">
                <div className="space-y-3">
                    {/* Rank 1 */}
                    <div className="flex items-center bg-white p-4 rounded-xl shadow-sm border border-primary/20">
                        <div className="w-10 flex justify-center">
                            <span className="material-symbols-outlined text-[#FFD700] text-3xl font-variation-fill">emoji_events</span>
                        </div>
                        <div className="ml-4 flex-grow">
                            <div className="font-bold text-lg flex items-center gap-2">
                                Mateo Hernandez
                            </div>
                            <div className="text-xs text-slate-400">Predicted Brazil as Champion</div>
                        </div>
                        <div className="text-right">
                            <div className="font-black text-xl text-primary">+100</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Points</div>
                        </div>
                    </div>

                    {/* Rank 2 */}
                    <div className="flex items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/5">
                        <div className="w-10 flex justify-center">
                            <span className="material-symbols-outlined text-[#C0C0C0] text-2xl font-variation-fill">emoji_events</span>
                        </div>
                        <div className="ml-4 flex-grow">
                            <div className="font-bold flex items-center gap-2">
                                Sarah Jenkins
                            </div>
                            <div className="text-xs text-slate-400">Predicted France as Champion</div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-lg text-slate-700 dark:text-slate-300">+85</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Points</div>
                        </div>
                    </div>

                    {/* Rank 3 */}
                    <div className="flex items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/5">
                        <div className="w-10 flex justify-center">
                            <span className="material-symbols-outlined text-[#CD7F32] text-2xl font-variation-fill">emoji_events</span>
                        </div>
                        <div className="ml-4 flex-grow">
                            <div className="font-bold flex items-center gap-2">
                                Luca Rossi
                            </div>
                            <div className="text-xs text-slate-400">Predicted Italy as Champion</div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-lg text-slate-700 dark:text-slate-300">+70</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Points</div>
                        </div>
                    </div>

                    {/* User Row: Alex Thompson (Highlighted) */}
                    <div className="flex items-center bg-background-dark text-white p-4 rounded-xl border-2 border-primary shadow-lg ring-4 ring-primary/10">
                        <div className="w-10 text-center font-black text-primary">12</div>
                        <div className="ml-4 flex-grow">
                            <div className="font-bold flex items-center gap-2">
                                Alex Thompson <span className="bg-primary text-black text-[9px] px-1.5 py-0.5 rounded font-black">YOU</span>
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1">
                                Champion Pick: Argentina
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-black text-lg text-primary">24</div>
                            <div className="text-[10px] font-bold text-white/50 uppercase">Points</div>
                        </div>
                    </div>

                    {/* Remaining Ranks */}
                    {[
                        { rank: 4, name: 'Emily Chen', points: 38 },
                        { rank: 5, name: 'James O\'Brien', points: 36 },
                        { rank: 6, name: 'Yuki Tanaka', points: 34 },
                        { rank: 7, name: 'Carlos Medina', points: 31 },
                        { rank: 8, name: 'Priya Patel', points: 29 },
                        { rank: 9, name: 'David Kim', points: 27 },
                        { rank: 10, name: 'Fatima Al-Rashid', points: 26 },
                        { rank: 11, name: 'Marco Bianchi', points: 25 },
                        { rank: 13, name: 'Sophie Dubois', points: 23 },
                        { rank: 14, name: 'Raj Kapoor', points: 22 },
                        { rank: 15, name: 'Olivia Martinez', points: 20 },
                        { rank: 16, name: 'Noah Williams', points: 19 },
                        { rank: 17, name: 'Chloe Andersson', points: 17 },
                        { rank: 18, name: 'Hassan Youssef', points: 16 },
                        { rank: 19, name: 'Mia Johnson', points: 15 },
                        { rank: 20, name: 'Tomás Silva', points: 14 },
                        { rank: 21, name: 'Aisha Okafor', points: 12 },
                        { rank: 22, name: 'Ethan Brown', points: 11 },
                        { rank: 23, name: 'Ingrid Larsen', points: 9 },
                        { rank: 24, name: 'Kenji Nakamura', points: 7 },
                    ].map(user => (
                        <div key={user.rank} className="flex items-center px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                            <div className="w-10 text-center text-sm font-bold text-slate-400">{user.rank}</div>
                            <div className="ml-4 flex-grow flex items-center gap-2">
                                <span className="font-medium">{user.name}</span>
                            </div>
                            <div className="text-right font-bold">{user.points}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Scoring System */}
            <section className="px-6 mt-8 mb-4">
                <div className="overflow-hidden rounded-2xl shadow-xl border border-slate-100 dark:border-white/10">
                    {/* Using exported base64 image */}
                    <img alt="How to Score Points" className="w-full h-auto block" src="/images/scoring.png" />
                </div>
            </section>
        </div>
    );
}
