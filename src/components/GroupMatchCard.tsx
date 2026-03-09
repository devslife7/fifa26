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

  const selected = (side: MatchResult) => result === side;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center">
        {/* Home */}
        <button
          className={`flex-1 flex items-center gap-2.5 pl-4 pr-2 py-4 transition-all ${
            selected('home')
              ? 'bg-background-dark'
              : 'hover:bg-slate-50 active:bg-slate-100'
          }`}
          onClick={() => onPredict(matchId, 'home')}
        >
          <span className="text-xl leading-none">{home.flag}</span>
          <span className={`text-xs font-bold uppercase tracking-wide truncate ${
            selected('home') ? 'text-primary' : 'text-slate-700'
          }`}>
            {home.name}
          </span>
        </button>

        {/* Draw / VS */}
        <button
          className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full mx-1 transition-all ${
            selected('draw')
              ? 'bg-background-dark'
              : 'hover:bg-slate-100 active:bg-slate-200'
          }`}
          onClick={() => onPredict(matchId, 'draw')}
        >
          <span className={`font-black text-[11px] tracking-wider ${
            selected('draw') ? 'text-primary' : 'text-slate-300'
          }`}>
            VS
          </span>
        </button>

        {/* Away */}
        <button
          className={`flex-1 flex items-center justify-end gap-2.5 pr-4 pl-2 py-4 transition-all ${
            selected('away')
              ? 'bg-background-dark'
              : 'hover:bg-slate-50 active:bg-slate-100'
          }`}
          onClick={() => onPredict(matchId, 'away')}
        >
          <span className={`text-xs font-bold uppercase tracking-wide truncate ${
            selected('away') ? 'text-primary' : 'text-slate-700'
          }`}>
            {away.name}
          </span>
          <span className="text-xl leading-none">{away.flag}</span>
        </button>
      </div>
    </div>
  );
}
