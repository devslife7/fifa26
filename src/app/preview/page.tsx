'use client';

import { teamsByCode } from '@/data/teams';

const getChampionLabel = (code: string) => {
  const team = teamsByCode[code];
  return team ? `${team.flag} ${team.name}` : code;
};

// --- Mock data ---

const LEADERBOARD = [
  { rank: 1, name: 'Mateo Hernandez', points: 87, champion: 'BR', change: 0 },
  { rank: 2, name: 'Sarah Jenkins', points: 82, champion: 'FR', change: 2 },
  { rank: 3, name: 'Luca Rossi', points: 76, champion: 'AR', change: -1 },
  { rank: 4, name: 'Ana Garcia', points: 71, champion: 'DE', change: 3 },
  { rank: 5, name: 'James Wilson', points: 68, champion: 'ES', change: -2 },
  { rank: 6, name: 'Sofia Martinez', points: 64, champion: 'BR', change: 0 },
  { rank: 7, name: 'Oliver Brown', points: 59, champion: 'FR', change: 1 },
];

const FINISHED_MATCHES = [
  { id: '1', group: 'A', home: 'US', away: 'MA', score: { home: 2, away: 1 }, prediction: 'home' as const, actual: 'home' as const, time: '14:00' },
  { id: '2', group: 'A', home: 'CL', away: 'PE', score: { home: 0, away: 0 }, prediction: 'home' as const, actual: 'draw' as const, time: '17:00' },
  { id: '3', group: 'B', home: 'FR', away: 'CO', score: { home: 3, away: 1 }, prediction: 'home' as const, actual: 'home' as const, time: '20:00' },
];

const LIVE_MATCH = {
  id: '4', group: 'B', home: 'AU', away: 'JP', score: { home: 1, away: 2 }, minute: 67, prediction: 'away' as 'home' | 'away', time: '21:00',
};

const UPCOMING_MATCHES = [
  { id: '5', group: 'C', home: 'AR', away: 'NG', time: 'Tomorrow, 14:00' },
  { id: '6', group: 'C', home: 'MX', away: 'EG', time: 'Tomorrow, 17:00' },
];

const KO_MATCHES = [
  { id: 'R32-1', round: 'Round of 32', home: 'BR', away: 'KR', score: { home: 2, away: 0 }, prediction: 'home' as const, actual: 'home' as const },
  { id: 'R16-1', round: 'Round of 16', home: 'FR', away: 'US', score: { home: 1, away: 0 }, prediction: 'away' as const, actual: 'home' as const },
];

// --- Components ---

function MedalIcon({ rank }: { rank: number }) {
  if (rank === 1) return <span className="material-symbols-outlined text-medal-gold text-3xl font-variation-fill">emoji_events</span>;
  if (rank === 2) return <span className="material-symbols-outlined text-medal-silver text-2xl font-variation-fill">emoji_events</span>;
  if (rank === 3) return <span className="material-symbols-outlined text-medal-bronze text-2xl font-variation-fill">emoji_events</span>;
  return null;
}

function PositionChange({ change }: { change: number }) {
  if (change === 0) return (
    <div className="flex items-center justify-center text-neutral-300 ml-2">
      <span className="material-symbols-outlined text-[14px]">remove</span>
    </div>
  );
  if (change > 0) return (
    <div className="flex items-center gap-0.5 text-[11px] font-bold text-wc-green ml-2">
      <span className="material-symbols-outlined text-[16px] leading-none">trending_up</span>
      {change}
    </div>
  );
  return (
    <div className="flex items-center gap-0.5 text-[11px] font-bold text-wc-red ml-2">
      <span className="material-symbols-outlined text-[16px] leading-none">trending_down</span>
      {Math.abs(change)}
    </div>
  );
}

function PredictionResult({ correct, points }: { correct: boolean; points: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className={`material-symbols-outlined text-[14px] font-variation-fill ${correct ? 'text-wc-green' : 'text-wc-red'}`}>
        {correct ? 'check_circle' : 'cancel'}
      </span>
      {correct && <span className="text-[11px] font-bold text-wc-green font-body">+{points}</span>}
    </span>
  );
}

function TeamFlag({ code }: { code: string }) {
  const team = teamsByCode[code];
  if (!team) return null;
  return <span className="text-2xl leading-none">{team.flag}</span>;
}

function TeamName({ code }: { code: string }) {
  const team = teamsByCode[code];
  return <span className="text-sm font-semibold font-body truncate">{team?.name ?? code}</span>;
}

// --- Page ---

export default function PreviewPage() {
  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="p-6 sticky top-0 bg-background-dark/80 backdrop-blur-md z-30 border-b border-white/5">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Tournament Preview</h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold font-body bg-primary/15 text-primary">
            <span className="material-symbols-outlined text-[14px] font-variation-fill">science</span>
            Preview Mode
          </span>
        </div>
        <p className="text-sm text-neutral-500 font-body mt-1">How things will look once the tournament is underway</p>
      </header>

      <div className="px-6 space-y-10 mt-6">

        {/* ===== SECTION 1: Live Match Day ===== */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary text-xl font-variation-fill">sports_soccer</span>
            <h2 className="font-bold text-lg">Match Day 2</h2>
            <span className="text-xs text-neutral-500 font-body ml-auto">June 15, 2026</span>
          </div>

          <div className="bg-neutral-900 rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
            {/* Finished matches */}
            {FINISHED_MATCHES.map(m => {
              const correct = m.prediction === m.actual;
              return (
                <div key={m.id} className="px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Group {m.group}</span>
                    <span className="text-[10px] text-neutral-600">·</span>
                    <span className="text-[10px] font-semibold text-neutral-500">{m.time}</span>
                    <span className="text-[10px] font-bold text-neutral-400 ml-auto">FT</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <TeamFlag code={m.home} />
                      <TeamName code={m.home} />
                    </div>
                    <div className="flex items-center gap-2 px-3 shrink-0">
                      <span className="text-lg font-black tabular-nums text-white">{m.score.home}</span>
                      <span className="text-neutral-600 text-xs">-</span>
                      <span className="text-lg font-black tabular-nums text-white">{m.score.away}</span>
                    </div>
                    <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
                      <TeamName code={m.away} />
                      <TeamFlag code={m.away} />
                    </div>
                    <div className="ml-3 shrink-0">
                      <PredictionResult correct={correct} points={1} />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Live match */}
            <div className="px-4 py-3 bg-primary/5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Group {LIVE_MATCH.group}</span>
                <span className="text-[10px] text-neutral-600">·</span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-wc-red animate-pulse" />
                  <span className="text-[10px] font-bold text-wc-red">{LIVE_MATCH.minute}&apos;</span>
                </span>
              </div>
              <div className="flex items-center">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <TeamFlag code={LIVE_MATCH.home} />
                  <TeamName code={LIVE_MATCH.home} />
                </div>
                <div className="flex items-center gap-2 px-3 shrink-0">
                  <span className="text-lg font-black tabular-nums text-white">{LIVE_MATCH.score.home}</span>
                  <span className="text-neutral-600 text-xs">-</span>
                  <span className="text-lg font-black tabular-nums text-white">{LIVE_MATCH.score.away}</span>
                </div>
                <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
                  <TeamName code={LIVE_MATCH.away} />
                  <TeamFlag code={LIVE_MATCH.away} />
                </div>
                <div className="ml-3 shrink-0">
                  <span className="text-[10px] font-bold text-neutral-400 font-body">You picked {teamsByCode[LIVE_MATCH.prediction === 'home' ? LIVE_MATCH.home : LIVE_MATCH.away]?.name}</span>
                </div>
              </div>
            </div>

            {/* Upcoming matches */}
            {UPCOMING_MATCHES.map(m => (
              <div key={m.id} className="px-4 py-3 opacity-60">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Group {m.group}</span>
                  <span className="text-[10px] text-neutral-600">·</span>
                  <span className="text-[10px] font-semibold text-neutral-500">{m.time}</span>
                </div>
                <div className="flex items-center">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <TeamFlag code={m.home} />
                    <TeamName code={m.home} />
                  </div>
                  <div className="px-3 shrink-0">
                    <span className="text-xs font-bold text-neutral-500">vs</span>
                  </div>
                  <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
                    <TeamName code={m.away} />
                    <TeamFlag code={m.away} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== SECTION 2: How Points Work (with examples) ===== */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary text-xl font-variation-fill">scoreboard</span>
            <h2 className="font-bold text-lg">How Points Work</h2>
          </div>

          {/* Scoring breakdown with live examples */}
          <div className="space-y-3">
            {/* Group stage example */}
            <div className="bg-neutral-900 rounded-2xl border border-white/10 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Group Stage</span>
                  <span className="text-xs font-bold text-primary font-body">+1 pt per correct result</span>
                </div>
              </div>
              <div className="px-4 py-3 space-y-3">
                {/* Correct prediction */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg leading-none">{teamsByCode['US']?.flag}</span>
                    <span className="text-sm font-semibold font-body">USA</span>
                    <span className="text-sm font-black tabular-nums mx-1">2 - 1</span>
                    <span className="text-sm font-semibold font-body">Morocco</span>
                    <span className="text-lg leading-none">{teamsByCode['MA']?.flag}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-neutral-500 font-body">You picked USA</span>
                    <PredictionResult correct={true} points={1} />
                  </div>
                </div>
                {/* Wrong prediction */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg leading-none">{teamsByCode['CL']?.flag}</span>
                    <span className="text-sm font-semibold font-body">Chile</span>
                    <span className="text-sm font-black tabular-nums mx-1">0 - 0</span>
                    <span className="text-sm font-semibold font-body">Peru</span>
                    <span className="text-lg leading-none">{teamsByCode['PE']?.flag}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-neutral-500 font-body">You picked Chile</span>
                    <PredictionResult correct={false} points={1} />
                  </div>
                </div>
              </div>
            </div>

            {/* Knockout qualifier examples */}
            <div className="bg-neutral-900 rounded-2xl border border-white/10 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Knockout Qualifiers</span>
                  <span className="text-xs font-bold text-primary font-body">+2 to +6 pts per qualifying team</span>
                </div>
              </div>
              <div className="px-4 py-3 space-y-3">
                <p className="text-[11px] text-neutral-400 font-body leading-relaxed">
                  You earn the round&apos;s points for every team in your bracket that actually reaches that round — the matchup doesn&apos;t have to be exact.
                </p>
                {KO_MATCHES.map(m => {
                  const round = m.id.split('-')[0];
                  const pts = round === 'R32' ? 2 : round === 'R16' ? 3 : round === 'QF' ? 4 : round === 'SF' ? 5 : 6;
                  const pickedCode = m.prediction === 'home' ? m.home : m.away;
                  const pickedAdvances = m.actual === m.prediction;
                  return (
                    <div key={m.id} className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase w-8 shrink-0">{round}</span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-[10px] text-neutral-500 font-body">Your pick:</span>
                        <span className="text-lg leading-none">{teamsByCode[pickedCode]?.flag}</span>
                        <span className="text-sm font-semibold font-body">{teamsByCode[pickedCode]?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-neutral-500 font-body">
                          {pickedAdvances ? 'Reached next round' : 'Did not advance'}
                        </span>
                        <PredictionResult correct={pickedAdvances} points={pts} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Winner bonuses */}
            <div className="bg-primary/10 rounded-2xl border border-primary/20 overflow-hidden">
              <div className="px-4 py-3 border-b border-primary/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Winner Bonuses</span>
                  <span className="text-xs font-bold text-primary font-body">+4 third place · +10 champion</span>
                </div>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none">{teamsByCode['BR']?.flag}</span>
                  <div>
                    <div className="text-sm font-bold">Champion pick wins the Final</div>
                    <div className="text-[11px] text-neutral-400 font-body">+10 on top of the +6 you already get for picking a finalist.</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none">{teamsByCode['DE']?.flag}</span>
                  <div>
                    <div className="text-sm font-bold">3rd-place pick wins the match</div>
                    <div className="text-[11px] text-neutral-400 font-body">+4 on top of the +3 you already get for picking a 3rd-place finalist.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Points summary table */}
            <div className="bg-neutral-900 rounded-2xl border border-white/10 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Points per Stage</span>
              </div>
              <div className="divide-y divide-white/5">
                {[
                  { round: 'Group Stage', desc: 'Correct result (W/D/L)', pts: '+1', max: 72 },
                  { round: 'Round of 32', desc: 'Per team that reaches R32', pts: '+2', max: 64 },
                  { round: 'Round of 16', desc: 'Per team that advances to R16', pts: '+3', max: 48 },
                  { round: 'Quarterfinals', desc: 'Per team that advances to QF', pts: '+4', max: 32 },
                  { round: 'Semifinals', desc: 'Per team that advances to SF', pts: '+5', max: 20 },
                  { round: '3rd-place finalists', desc: 'Per team that makes the 3rd-place match', pts: '+3', max: 6 },
                  { round: '3rd-place winner', desc: 'Bonus for picking the actual winner', pts: '+4', max: 4 },
                  { round: 'Finalists', desc: 'Per team that reaches the Final', pts: '+6', max: 12 },
                  { round: 'Champion', desc: 'Bonus for picking the actual champion', pts: '+10', max: 10 },
                ].map((row) => {
                  const isHighlight = row.round === 'Champion';
                  return (
                    <div key={row.round} className={`flex items-center px-4 py-2.5 ${isHighlight ? 'bg-primary/5' : ''}`}>
                      <div className="flex-grow">
                        <div className={`text-sm font-semibold ${isHighlight ? 'text-primary' : 'text-white'}`}>{row.round}</div>
                        <div className="text-[11px] text-neutral-500 font-body">{row.desc}</div>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] text-neutral-500 font-body tabular-nums">max {row.max}</span>
                        <span className={`font-black text-lg tabular-nums ${isHighlight ? 'text-primary' : 'text-white'}`}>{row.pts}</span>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center px-4 py-2.5 bg-neutral-800">
                  <div className="flex-grow text-sm font-black uppercase tracking-wider">Grand Total</div>
                  <span className="font-black text-lg tabular-nums text-primary">268</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SECTION 3: Leaderboard ===== */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary text-xl font-variation-fill">emoji_events</span>
            <h2 className="font-bold text-lg">Rankings</h2>
            <span className="text-xs text-neutral-500 font-body ml-auto">Updated after each match</span>
          </div>

          <div className="space-y-2">
            {LEADERBOARD.map(entry => {
              const medal = <MedalIcon rank={entry.rank} />;

              if (entry.rank <= 3) {
                return (
                  <div
                    key={entry.rank}
                    className={`flex items-center bg-neutral-900 p-4 rounded-xl shadow-sm border ${entry.rank === 1 ? 'border-primary/20' : 'border-white/10'}`}
                  >
                    <div className="w-10 flex justify-center">{medal}</div>
                    <div className="ml-4 flex-grow">
                      <div className={`font-bold ${entry.rank === 1 ? 'text-lg' : ''} flex items-center gap-2`}>
                        {entry.name}
                        <PositionChange change={entry.change} />
                      </div>
                      <div className="text-xs text-neutral-400 font-body">
                        Predicted {getChampionLabel(entry.champion)} as Champion
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${entry.rank === 1 ? 'font-black text-xl text-primary' : 'text-lg text-neutral-300'}`}>
                        {entry.rank === 1 ? '+' : ''}{entry.points}
                      </div>
                      <div className="text-[10px] font-bold text-neutral-400 uppercase">Points</div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={entry.rank}
                  className="flex items-center px-4 py-3 rounded-xl hover:bg-white/5"
                >
                  <div className="w-10 text-center text-sm font-bold text-neutral-400">{entry.rank}</div>
                  <div className="ml-4 flex-grow flex items-center gap-2">
                    <span className="font-medium">{entry.name}</span>
                    <PositionChange change={entry.change} />
                  </div>
                  <div className="font-bold">{entry.points}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== SECTION 4: Your Score Breakdown ===== */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary text-xl font-variation-fill">analytics</span>
            <h2 className="font-bold text-lg">Your Score Breakdown</h2>
          </div>

          <div className="bg-neutral-900 rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div>
                <div className="text-sm text-neutral-400 font-body">Total Points</div>
                <div className="text-4xl font-black text-primary">42</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-neutral-400 font-body">Rank</div>
                <div className="text-2xl font-black">#4</div>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/5">
              <div className="p-4 text-center">
                <div className="text-2xl font-black text-wc-green">31</div>
                <div className="text-[10px] text-neutral-500 font-body uppercase font-bold mt-0.5">Group</div>
                <div className="text-[10px] text-neutral-600 font-body">31/48 correct</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-2xl font-black text-wc-blue">11</div>
                <div className="text-[10px] text-neutral-500 font-body uppercase font-bold mt-0.5">Knockout</div>
                <div className="text-[10px] text-neutral-600 font-body">4/6 correct</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-2xl font-black text-neutral-500">0</div>
                <div className="text-[10px] text-neutral-500 font-body uppercase font-bold mt-0.5">Champion</div>
                <div className="text-[10px] text-neutral-600 font-body">TBD</div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
