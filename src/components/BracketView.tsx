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
  QF: 'Quarterfinals',
  SF: 'Semifinals',
  '3RD': 'Third Place',
  F: 'Final',
};

export default function BracketView({ groupPredictions, knockoutPredictions, onPredict }: Props) {
  const allGroupsDone = areAllGroupsComplete(groupPredictions);
  const bracket = generateBracket(groupPredictions, knockoutPredictions);

  if (!allGroupsDone) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="text-6xl mb-6 animate-pulse-gold">🏟️</div>
        <h2 className="text-2xl font-bold mb-3">Knockout Stage Locked</h2>
        <p className="text-white/40">
          Complete all 48 group stage predictions to unlock the knockout bracket
        </p>
      </div>
    );
  }

  const rounds: KnockoutRound[] = ['R32', 'R16', 'QF', 'SF', '3RD', 'F'];

  return (
    <div className="space-y-10">
      {rounds.map(round => {
        const roundMatches = bracket.filter(m => m.round === round);
        if (roundMatches.length === 0) return null;

        return (
          <div key={round}>
            <h3 className="text-xl font-bold mb-4 text-center">
              <span className="text-gold">{roundLabels[round]}</span>
              {round !== '3RD' && round !== 'F' && (
                <span className="text-white/30 text-sm ml-2">
                  ({roundMatches.length} matches)
                </span>
              )}
            </h3>

            <div
              className={`grid gap-3 ${
                round === 'R32'
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                  : round === 'R16'
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                    : round === 'QF'
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                      : round === 'SF'
                        ? 'grid-cols-1 sm:grid-cols-2 max-w-xl mx-auto'
                        : 'grid-cols-1 max-w-sm mx-auto'
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
                  compact={round === 'R32'}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
