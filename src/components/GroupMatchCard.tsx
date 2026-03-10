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

function FlagEmoji({ flagUrl, flagEmoji }: { flagUrl?: string | null; flagEmoji: string }) {
  return (
    <span className="flex-shrink-0 overflow-hidden">
      {flagUrl
        ? <img src={flagUrl} alt="" className="w-8 h-6 object-cover rounded-sm" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextSibling as HTMLElement | null)?.removeAttribute('hidden'); }} />
        : null}
      <span className="text-2xl leading-none" hidden={!!flagUrl}>{flagEmoji}</span>
    </span>
  );
}

export default function GroupMatchCard({ matchId, homeCode, awayCode, result, onPredict, liveMatch, teamFlagsByCode }: Props) {
  const home = teamsByCode[homeCode];
  const away = teamsByCode[awayCode];

  if (!home || !away) return null;

  const selected = (side: MatchResult) => result === side;
  const isFinished = liveMatch?.status === 'FINISHED';

  const homeFlagUrl = liveMatch?.homeFlag ?? teamFlagsByCode?.[homeCode];
  const awayFlagUrl = liveMatch?.awayFlag ?? teamFlagsByCode?.[awayCode];

  return (
    <div className="overflow-hidden">
      <div className="flex items-stretch">
        {/* Home */}
        <button
          className={`flex-1 flex items-center gap-2.5 px-4 py-5 md:py-4 transition-all ${
            selected('home')
              ? 'ring-1 ring-inset ring-primary/70 bg-[#FEFAE9]'
              : 'bg-white hover:bg-slate-50 active:bg-slate-100'
          }`}
          onClick={() => onPredict(matchId, 'home')}
        >
          <FlagEmoji flagUrl={homeFlagUrl} flagEmoji={home.flag} />
          <span className={`text-sm font-bold leading-tight ${
            selected('home') ? 'text-slate-800' : 'text-slate-500'
          }`}>
            {home.name}
          </span>
        </button>

        {/* Draw / VS */}
        <button
          className={`w-16 flex-shrink-0 flex items-center justify-center transition-all ${selected('draw') ? 'ring-1 ring-inset ring-primary/70 bg-[#FEFAE9]' : 'bg-white hover:bg-black/5'}`}
          onClick={() => onPredict(matchId, 'draw')}
        >
          <span className="text-sm font-bold text-slate-500">TIE</span>
        </button>

        {/* Away */}
        <button
          className={`flex-1 flex items-center justify-end gap-2.5 px-4 py-5 md:py-4 transition-all ${
            selected('away')
              ? 'ring-1 ring-inset ring-primary/70 bg-[#FEFAE9]'
              : 'bg-white hover:bg-slate-50 active:bg-slate-100'
          }`}
          onClick={() => onPredict(matchId, 'away')}
        >
          <span className={`text-sm font-bold leading-tight ${
            selected('away') ? 'text-slate-800' : 'text-slate-500'
          }`}>
            {away.name}
          </span>
          <FlagEmoji flagUrl={awayFlagUrl} flagEmoji={away.flag} />
        </button>
      </div>

      {/* Live data footer */}
      {liveMatch && isFinished && (
        <div className="border-t border-slate-100 px-4 py-1.5 flex items-center justify-end gap-1.5">
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
