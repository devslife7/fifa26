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
  teamFlagsByCode?: Record<string, string>;
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

function formatMatchDate(utcDate: string): string {
  const d = new Date(utcDate);
  return (
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  );
}

function FlagEmoji({ code, flagUrl, flagEmoji, size = 'normal' }: { code: string; flagUrl?: string | null; flagEmoji: string; size?: 'small' | 'normal' }) {
  if (code.startsWith('TBD')) {
    return null;
  }

  const imgClass = size === 'small' ? "w-5 h-3.5 sm:w-6 sm:h-4 object-cover rounded-sm" : "w-7 h-5 sm:w-9 sm:h-6 object-cover rounded-sm";
  const emojiClass = size === 'small' ? "flex-shrink-0 text-lg sm:text-xl leading-none" : "flex-shrink-0 text-2xl sm:text-3xl leading-none";

  if (flagUrl) {
    return (
      <span className="flex-shrink-0 inline-flex">
        <img
          src={flagUrl}
          alt=""
          className={imgClass}
          onError={e => {
            const img = e.currentTarget;
            img.style.display = 'none';
            (img.nextSibling as HTMLElement | null)?.removeAttribute('hidden');
          }}
        />
        <span className={emojiClass} hidden>{flagEmoji}</span>
      </span>
    );
  }
  return <span className={emojiClass}>{flagEmoji}</span>;
}

export default function GroupMatchCard({ matchId, homeCode, awayCode, result, onPredict, liveMatch, teamFlagsByCode }: Props) {
  const home = teamsByCode[homeCode];
  const away = teamsByCode[awayCode];

  if (!home || !away) return null;

  const selected = (side: MatchResult) => result === side;
  const isFinished = liveMatch?.status === 'FINISHED';

  const homeFlagUrl = liveMatch?.homeFlag ?? teamFlagsByCode?.[homeCode];
  const awayFlagUrl = liveMatch?.awayFlag ?? teamFlagsByCode?.[awayCode];

  // Calculate the position of the sliding background pill
  const getPillStyle = () => {
    if (result === 'home') return { left: '4px', width: 'calc(50% - 32px)' };
    if (result === 'draw') return { left: 'calc(50% - 28px)', width: '56px' };
    if (result === 'away') return { left: 'calc(50% + 28px)', width: 'calc(50% - 32px)' };
    return { opacity: 0 }; // Hidden when nothing is selected
  };

  return (
    <div className="overflow-hidden relative">
      <div className="relative flex items-stretch bg-slate-100/60 rounded-full p-1">

        {/* Animated Background Pill */}
        <div
          className={`absolute top-1 bottom-1 bg-white shadow-sm rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${result ? 'opacity-100 ring-1 ring-primary/30' : 'opacity-0'}`}
          style={getPillStyle()}
        />

        {/* Home */}
        <button
          className={`relative z-10 flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-3 rounded-full transition-colors duration-300 ${
            selected('home') ? 'text-slate-900' : 'hover:text-slate-800 text-slate-500'
          }`}
          onClick={() => onPredict(matchId, 'home')}
        >
          <div className="sm:hidden flex items-center">
            <FlagEmoji code={homeCode} flagUrl={homeFlagUrl} flagEmoji={home.flag} size="normal" />
          </div>
          <div className="hidden sm:flex items-center">
            <FlagEmoji code={homeCode} flagUrl={homeFlagUrl} flagEmoji={home.flag} size="small" />
          </div>
          <span className="text-sm sm:text-xs md:text-sm font-bold leading-tight truncate text-left">
            {home.name}
          </span>
        </button>

        {/* Draw / VS */}
        <button
          className={`relative z-10 w-12 sm:w-14 flex-shrink-0 flex items-center justify-center rounded-full transition-colors duration-300 ${
            selected('draw') ? 'text-slate-900' : 'hover:text-slate-800 text-slate-400'
          }`}
          onClick={() => onPredict(matchId, 'draw')}
        >
          <span className="font-bold text-sm sm:text-xs md:text-sm">TIE</span>
        </button>

        {/* Away */}
        <button
          className={`relative z-10 flex-1 min-w-0 flex items-center justify-end gap-1.5 sm:gap-2 px-2 sm:px-3 py-3 rounded-full transition-colors duration-300 ${
            selected('away') ? 'text-slate-900' : 'hover:text-slate-800 text-slate-500'
          }`}
          onClick={() => onPredict(matchId, 'away')}
        >
          <span className="text-sm sm:text-xs md:text-sm font-bold leading-tight truncate text-right">
            {away.name}
          </span>
          <div className="sm:hidden flex items-center">
            <FlagEmoji code={awayCode} flagUrl={awayFlagUrl} flagEmoji={away.flag} size="normal" />
          </div>
          <div className="hidden sm:flex items-center">
            <FlagEmoji code={awayCode} flagUrl={awayFlagUrl} flagEmoji={away.flag} size="small" />
          </div>
        </button>
      </div>

      {/* Footer: score for finished */}
      {liveMatch && isFinished && (
        <div className="px-4 flex items-center justify-end gap-1.5 pt-2">
          {liveMatch.score && (
            <span className="text-[11px] font-bold tabular-nums text-slate-600">
              {liveMatch.score.home}–{liveMatch.score.away}
            </span>
          )}
          <PredictionCheck prediction={result} actualResult={liveMatch.actualResult} />
        </div>
      )}
    </div>
  );
}
