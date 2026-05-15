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
  readOnly?: boolean;
  groupLabel?: string;
  focused?: boolean;
}


function PredictionCheck({ prediction, actualResult }: { prediction?: MatchResult; actualResult: LiveMatch['actualResult'] }) {
  if (!prediction || !actualResult) return null;
  const correct = prediction === actualResult;
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className={`material-symbols-outlined text-[14px] font-variation-fill ${correct ? 'text-wc-green' : 'text-wc-red'}`}>
        {correct ? 'check_circle' : 'cancel'}
      </span>
      {correct && <span className="text-[11px] font-bold text-wc-green font-body">+1</span>}
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

  const imgClass = size === 'small' ? "w-6 h-4 sm:w-7 sm:h-5 object-cover rounded-sm" : "w-9 h-6 sm:w-11 sm:h-7 object-cover rounded-sm";
  const emojiClass = size === 'small' ? "flex-shrink-0 text-xl sm:text-2xl leading-none" : "flex-shrink-0 text-3xl sm:text-4xl leading-none";

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

export default function GroupMatchCard({ matchId, homeCode, awayCode, result, onPredict, liveMatch, teamFlagsByCode, readOnly = false, groupLabel, focused = false }: Props) {
  const home = teamsByCode[homeCode];
  const away = teamsByCode[awayCode];

  if (!home || !away) return null;

  const selected = (side: MatchResult) => result === side;
  const isFinished = liveMatch?.status === 'FINISHED';

  const homeFlagUrl = liveMatch?.homeFlag ?? teamFlagsByCode?.[homeCode];
  const awayFlagUrl = liveMatch?.awayFlag ?? teamFlagsByCode?.[awayCode];

  const handlePredict = (side: MatchResult) => {
    if (!readOnly) onPredict(matchId, side);
  };

  return (
    <div className="overflow-hidden relative border-b border-white/5 last:border-0">
      {groupLabel && (
        <div className="px-3 pt-1.5 flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Group {groupLabel}</span>
          {liveMatch?.utcDate && (
            <>
              <span className="text-[10px] text-neutral-600">·</span>
              <span className="text-[10px] font-semibold text-neutral-500">
                {new Date(liveMatch.utcDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <span className="text-[10px] text-neutral-600">·</span>
              <span className="text-[10px] font-semibold text-neutral-500">
                {new Date(liveMatch.utcDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </>
          )}
          {isFinished && (
            <div className="ml-auto flex items-center gap-1.5">
              {liveMatch?.score && (
                <span className="text-[11px] font-bold tabular-nums text-neutral-300">
                  {liveMatch.score.home}–{liveMatch.score.away}
                </span>
              )}
              <PredictionCheck prediction={result} actualResult={liveMatch?.actualResult} />
            </div>
          )}
        </div>
      )}
      <div className="flex items-stretch gap-2 px-2 py-2.5">

        {/* Home */}
        <button
          className={`flex-1 min-w-0 flex items-center gap-3 px-4 py-3.5 rounded-xl ring-1 ring-inset transition-all duration-200 ${
            selected('home')
              ? 'bg-primary/40 ring-primary text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
              : `bg-white/[0.09] ring-white/20 text-neutral-100 ${readOnly ? '' : 'hover:bg-white/[0.14] hover:ring-white/30 hover:text-white'}`
          } ${readOnly ? 'cursor-default' : ''}`}
          onClick={() => handlePredict('home')}
          disabled={readOnly}
        >
          <div className="sm:hidden flex items-center">
            <FlagEmoji code={homeCode} flagUrl={homeFlagUrl} flagEmoji={home.flag} size="normal" />
          </div>
          <div className="hidden sm:flex items-center">
            <FlagEmoji code={homeCode} flagUrl={homeFlagUrl} flagEmoji={home.flag} size="normal" />
          </div>
          <span className="text-[15px] font-semibold leading-tight truncate text-left font-body">
            {home.name}
          </span>
        </button>

        {/* Draw / VS */}
        <button
          className={`w-14 sm:w-16 flex-shrink-0 flex items-center justify-center rounded-xl ring-1 ring-inset transition-all duration-200 ${
            selected('draw')
              ? 'bg-primary/40 ring-primary text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
              : `bg-white/[0.09] ring-white/20 text-neutral-200 ${readOnly ? '' : 'hover:bg-white/[0.14] hover:ring-white/30 hover:text-white'}`
          } ${readOnly ? 'cursor-default' : ''}`}
          onClick={() => handlePredict('draw')}
          disabled={readOnly}
        >
          <span className="font-bold text-[13px] font-body">TIE</span>
        </button>

        {/* Away */}
        <button
          className={`flex-1 min-w-0 flex items-center justify-end gap-3 px-4 py-3.5 rounded-xl ring-1 ring-inset transition-all duration-200 ${
            selected('away')
              ? 'bg-primary/40 ring-primary text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
              : `bg-white/[0.09] ring-white/20 text-neutral-100 ${readOnly ? '' : 'hover:bg-white/[0.14] hover:ring-white/30 hover:text-white'}`
          } ${readOnly ? 'cursor-default' : ''}`}
          onClick={() => handlePredict('away')}
          disabled={readOnly}
        >
          <span className="text-[15px] font-semibold leading-tight truncate text-right font-body">
            {away.name}
          </span>
          <div className="sm:hidden flex items-center">
            <FlagEmoji code={awayCode} flagUrl={awayFlagUrl} flagEmoji={away.flag} size="normal" />
          </div>
          <div className="hidden sm:flex items-center">
            <FlagEmoji code={awayCode} flagUrl={awayFlagUrl} flagEmoji={away.flag} size="normal" />
          </div>
        </button>
      </div>

    </div>
  );
}
