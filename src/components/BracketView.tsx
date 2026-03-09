'use client';

import { MatchResult, KnockoutResult, KnockoutRound } from '@/types';
import { generateBracket } from '@/lib/bracket';
import { areAllGroupsComplete } from '@/lib/standings';
import KnockoutMatchCard from './KnockoutMatchCard';

interface Props {
  groupPredictions: Record<string, MatchResult>;
  knockoutPredictions: Record<string, KnockoutResult>;
  onPredict: (matchId: string, result: KnockoutResult) => void;
}

const roundLabels: Record<KnockoutRound, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  '3RD': 'Third Place',
  F: 'Finals',
};

export default function BracketView({ groupPredictions, knockoutPredictions, onPredict }: Props) {
  const allGroupsDone = areAllGroupsComplete(groupPredictions);
  const bracket = generateBracket(groupPredictions, knockoutPredictions);

  if (!allGroupsDone) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="text-6xl mb-6 animate-pulse-gold">🏟️</div>
        <h2 className="text-2xl font-bold mb-3">Knockout Stage Locked</h2>
        <p className="text-slate-500">
          Complete all 48 group stage predictions to unlock the knockout bracket
        </p>
      </div>
    );
  }

  // Define rounds in order for brackets Left-to-Right
  const rounds: KnockoutRound[] = ['R32', 'R16', 'QF', 'SF', 'F', '3RD'];

  return (
    <div className="relative w-full mt-2">
      {/* Bracket Container */}
      <div className="bracket-scroll overflow-x-auto overflow-y-hidden flex px-6 py-4 gap-12 min-h-[700px] items-start">
        {rounds.map(round => {
          const roundMatches = bracket.filter(m => m.round === round);
          if (roundMatches.length === 0) return null;

          return (
            <div key={round} className="flex flex-col min-w-[280px]">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-6 sticky left-0 z-10">
                {roundLabels[round]}
              </h3>

              <div
                className={`flex flex-col w-full ${round === 'R32'
                  ? 'gap-6'
                  : round === 'R16'
                    ? 'gap-12 mt-12'
                    : round === 'QF'
                      ? 'gap-24 mt-32'
                      : round === 'SF'
                        ? 'gap-[300px] mt-[150px]'
                        : typeof round === 'string' && round === 'F'
                          ? 'gap-0 mt-[300px]'
                          : 'gap-0 mt-32' // 3RD Place
                  }`}
              >
                {roundMatches.map(match => (
                  <KnockoutMatchCard
                    key={match.id}
                    matchId={match.id}
                    homeCode={match.home}
                    awayCode={match.away}
                    result={match.result}
                    onPredict={onPredict}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
