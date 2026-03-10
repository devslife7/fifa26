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

  const anySelected = result !== undefined;
  const homeFlagUrl = liveMatch?.homeFlag ?? teamFlagsByCode?.[homeCode];
  const awayFlagUrl = liveMatch?.awayFlag ?? teamFlagsByCode?.[awayCode];

  return (
    <div className={`rounded-2xl shadow-sm border overflow-hidden transition-all ${anySelected ? 'border-primary' : 'border-slate-100'}`}>
      <div className="flex items-stretch">
        {/* Home */}
        <button
          className={`flex-1 flex items-center gap-2.5 px-4 py-2 transition-all ${
            selected('home') ? 'bg-primary/20' : 'bg-white hover:bg-slate-50 active:bg-slate-100'
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
          className={`w-10 flex-shrink-0 flex items-center justify-center transition-all ${
            selected('draw') ? 'bg-primary/20' : 'bg-white'
          }`}
          onClick={() => onPredict(matchId, 'draw')}
        >
          <span className="text-xs font-medium text-slate-400">vs</span>
        </button>

        {/* Away */}
        <button
          className={`flex-1 flex items-center justify-end gap-2.5 px-4 py-2 transition-all ${
            selected('away') ? 'bg-primary/20' : 'bg-white hover:bg-slate-50 active:bg-slate-100'
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
            {isFinished && liveMatch.score && (
              <span className="text-[11px] font-bold tabular-nums text-slate-600">
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
