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
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-1">
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
        <button
          className={`flex flex-col items-center gap-1 px-2 transition-colors py-1 ${result === 'home'
              ? 'bg-primary'
              : 'bg-white hover:bg-slate-50'
            }`}
          onClick={() => onPredict(matchId, 'home')}
        >
          <span className={`text-2xl rounded-full shadow-sm flex items-center justify-center size-7 ${result === 'home' ? 'border-2 border-white/20' : ''}`}>
            {home.flag}
          </span>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold mt-1 uppercase">{home.name}</span>
          </div>
        </button>

        <button
          className={`flex items-center justify-center px-4 transition-colors py-1 ${result === 'draw'
              ? 'bg-primary border-x border-primary/20'
              : 'bg-slate-50 border-x border-slate-100 hover:bg-primary/10'
            }`}
          onClick={() => onPredict(matchId, 'draw')}
        >
          <span className={`font-black italic text-sm ${result === 'draw' ? '' : 'text-slate-300'}`}>
            VS
          </span>
        </button>

        <button
          className={`flex flex-col items-center gap-1 px-2 transition-colors py-1 ${result === 'away'
              ? 'bg-primary'
              : 'bg-white hover:bg-slate-50'
            }`}
          onClick={() => onPredict(matchId, 'away')}
        >
          <span className={`text-2xl rounded-full shadow-sm flex items-center justify-center size-7 ${result === 'away' ? 'border-2 border-white/20' : ''}`}>
            {away.flag}
          </span>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold mt-1 uppercase">{away.name}</span>
          </div>
        </button>
      </div>
    </div>
  );
}
