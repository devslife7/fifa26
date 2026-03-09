'use client';

import { MatchResult } from '@/types';
import { teamsByCode } from '@/data/teams';

interface Props {
  matchId: string;
  homeCode: string;
  awayCode: string;
  result?: MatchResult;
  onPredict: (matchId: string, result: MatchResult) => void;
}

export default function GroupMatchCard({ matchId, homeCode, awayCode, result, onPredict }: Props) {
  const home = teamsByCode[homeCode];
  const away = teamsByCode[awayCode];

  if (!home || !away) return null;

  const btnBase = 'px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer border';

  const getButtonClass = (option: MatchResult) => {
    if (result === option) {
      return `${btnBase} bg-gold/20 border-gold text-gold shadow-[0_0_12px_rgba(201,168,76,0.3)]`;
    }
    return `${btnBase} bg-surface-lighter border-border text-white/60 hover:border-white/30 hover:text-white/80`;
  };

  return (
    <div className="bg-surface rounded-xl p-4 border border-border hover:border-border/80 transition-colors">
      <div className="flex items-center justify-between gap-3">
        {/* Home team */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xl shrink-0">{home.flag}</span>
          <span className="text-sm font-medium truncate">{home.name}</span>
        </div>

        {/* Prediction buttons */}
        <div className="flex gap-1.5 shrink-0">
          <button
            className={getButtonClass('home')}
            onClick={() => onPredict(matchId, 'home')}
            title={`${home.name} wins`}
          >
            1
          </button>
          <button
            className={getButtonClass('draw')}
            onClick={() => onPredict(matchId, 'draw')}
            title="Draw"
          >
            X
          </button>
          <button
            className={getButtonClass('away')}
            onClick={() => onPredict(matchId, 'away')}
            title={`${away.name} wins`}
          >
            2
          </button>
        </div>

        {/* Away team */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-sm font-medium truncate text-right">{away.name}</span>
          <span className="text-xl shrink-0">{away.flag}</span>
        </div>
      </div>
    </div>
  );
}
