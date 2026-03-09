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

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
        {/* Home */}
        <button
          className={`flex items-center gap-3 px-4 py-3 transition-all ${
            result === 'home'
              ? 'bg-primary/5 ring-2 ring-primary ring-inset'
              : 'hover:bg-slate-50'
          }`}
          onClick={() => onPredict(matchId, 'home')}
        >
          <span className="text-2xl">{home.flag}</span>
          <span className="text-sm font-bold uppercase truncate">{home.name}</span>
        </button>

        {/* Draw / VS */}
        <button
          className={`flex items-center justify-center px-4 transition-all border-x border-slate-100 ${
            result === 'draw'
              ? 'bg-primary/10 ring-2 ring-primary ring-inset'
              : 'hover:bg-slate-50'
          }`}
          onClick={() => onPredict(matchId, 'draw')}
        >
          <span className={`font-bold text-sm ${result === 'draw' ? 'text-primary' : 'text-slate-300'}`}>
            VS
          </span>
        </button>

        {/* Away */}
        <button
          className={`flex items-center justify-end gap-3 px-4 py-3 transition-all ${
            result === 'away'
              ? 'bg-primary/5 ring-2 ring-primary ring-inset'
              : 'hover:bg-slate-50'
          }`}
          onClick={() => onPredict(matchId, 'away')}
        >
          <span className="text-sm font-bold uppercase truncate">{away.name}</span>
          <span className="text-2xl">{away.flag}</span>
        </button>
      </div>
    </div>
  );
}
