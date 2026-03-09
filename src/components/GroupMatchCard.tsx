'use client';

import { MatchResult, LiveMatch } from '@/types';
import { teamsByCode } from '@/data/teams';

interface Props {
  matchId: string;
  homeCode: string;
  awayCode: string;
  result?: MatchResult;
  onPredict: (matchId: string, result: MatchResult) => void;
  liveMatch?: LiveMatch;
}

function formatMatchDate(utcDate: string): string {
  const d = new Date(utcDate);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatMatchTime(utcDate: string): string {
  const d = new Date(utcDate);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function PredictionCheck({ prediction, actualResult }: { prediction?: MatchResult; actualResult: LiveMatch['actualResult'] }) {
  if (!prediction || !actualResult) return null;
  const correct = prediction === actualResult;
  return (
    <span className={`material-symbols-outlined text-[14px] font-variation-fill ${correct ? 'text-green-500' : 'text-red-400'}`}>
      {correct ? 'check_circle' : 'cancel'}
    </span>
  );
}

export default function GroupMatchCard({ matchId, homeCode, awayCode, result, onPredict, liveMatch }: Props) {
  const home = teamsByCode[homeCode];
  const away = teamsByCode[awayCode];

  if (!home || !away) return null;

  const selected = (side: MatchResult) => result === side;
  const isLive = liveMatch?.status === 'IN_PLAY' || liveMatch?.status === 'PAUSED';
  const isFinished = liveMatch?.status === 'FINISHED';

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

      {/* Live data footer */}
      {liveMatch && (
        <div className="border-t border-slate-100 px-4 py-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[10px] text-slate-400 min-w-0">
            <span>{formatMatchDate(liveMatch.utcDate)} {formatMatchTime(liveMatch.utcDate)}</span>
            {liveMatch.venue && (
              <>
                <span>·</span>
                <span className="truncate">{liveMatch.venue}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isLive && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-bold text-red-500 uppercase">Live</span>
              </>
            )}
            {(isLive || isFinished) && liveMatch.score && (
              <span className={`text-[11px] font-bold tabular-nums ${isFinished ? 'text-slate-600' : 'text-red-500'}`}>
                {liveMatch.score.home}–{liveMatch.score.away}
              </span>
            )}
            {isFinished && (
              <PredictionCheck prediction={result} actualResult={liveMatch.actualResult} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
