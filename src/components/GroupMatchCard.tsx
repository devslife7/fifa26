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

function FlagEmoji({ code, flagUrl, flagEmoji }: { code: string; flagUrl?: string | null; flagEmoji: string }) {
  if (code.startsWith('TBD')) {
    return null;
  }
  if (flagUrl) {
    return (
      <span className="flex-shrink-0 inline-flex">
        <img
          src={flagUrl}
          alt=""
          className="w-9 h-6 object-cover"
          onError={e => {
            const img = e.currentTarget;
            img.style.display = 'none';
            (img.nextSibling as HTMLElement | null)?.removeAttribute('hidden');
          }}
        />
        <span className="text-3xl leading-none" hidden>{flagEmoji}</span>
      </span>
    );
  }
  return <span className="flex-shrink-0 text-3xl leading-none">{flagEmoji}</span>;
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
          className={`flex-1 flex items-center gap-2.5 px-4 py-5 md:py-4 rounded-xl transition-all ${
            selected('home')
              ? 'ring-1 ring-inset ring-primary/70 bg-[#FEFAE9]'
              : 'bg-white hover:bg-slate-50 active:bg-slate-100'
          }`}
          onClick={() => onPredict(matchId, 'home')}
        >
          <FlagEmoji code={homeCode} flagUrl={homeFlagUrl} flagEmoji={home.flag} />
          <span className={`text-sm font-bold leading-tight ${
            selected('home') ? 'text-slate-800' : 'text-slate-500'
          }`}>
            {home.name}
          </span>
        </button>

        {/* Draw / VS */}
        <button
          className={`w-16 flex-shrink-0 flex items-center justify-center rounded-xl transition-all ${selected('draw') ? 'ring-1 ring-inset ring-primary/70 bg-[#FEFAE9]' : 'bg-white hover:bg-black/5'}`}
          onClick={() => onPredict(matchId, 'draw')}
        >
          <span className="text-sm font-bold text-slate-500">TIE</span>
        </button>

        {/* Away */}
        <button
          className={`flex-1 flex items-center justify-end gap-2.5 px-4 py-5 md:py-4 rounded-xl transition-all ${
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
          <FlagEmoji code={awayCode} flagUrl={awayFlagUrl} flagEmoji={away.flag} />
        </button>
      </div>

      {/* Footer: score for finished, date for upcoming */}
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
      {liveMatch && liveMatch.status === 'SCHEDULED' && liveMatch.utcDate && (
        <div className="border-t border-slate-100 px-4 py-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="material-symbols-outlined text-[13px]">calendar_month</span>
          <span>{formatMatchDate(liveMatch.utcDate)}</span>
          {liveMatch.venue && <><span>·</span><span className="truncate">{liveMatch.venue}</span></>}
        </div>
      )}
    </div>
  );
}
