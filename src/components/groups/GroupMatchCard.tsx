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

export default function GroupMatchCard({ matchId, homeCode, awayCode, result, onPredict, liveMatch, teamFlagsByCode, readOnly = false, groupLabel }: Props) {
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
      <div className="flex items-stretch gap-1.5 px-2 py-2">

        {/* Home */}
        <button
          className={`flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5 rounded-xl ring-1 ring-inset transition-all duration-200 ${
            selected('home')
              ? 'bg-primary/20 ring-primary/50 text-white'
              : `bg-white/5 ring-white/[0.08] text-neutral-400 ${readOnly ? '' : 'hover:bg-white/[0.08] hover:text-white'}`
          } ${readOnly ? 'cursor-default' : ''}`}
          onClick={() => handlePredict('home')}
          disabled={readOnly}
        >
          <div className="sm:hidden flex items-center">
            <FlagEmoji code={homeCode} flagUrl={homeFlagUrl} flagEmoji={home.flag} size="normal" />
          </div>
          <div className="hidden sm:flex items-center">
            <FlagEmoji code={homeCode} flagUrl={homeFlagUrl} flagEmoji={home.flag} size="small" />
          </div>
          <span className="text-sm font-semibold leading-tight truncate text-left font-body">
            {home.name}
          </span>
        </button>

        {/* Draw / VS */}
        <button
          className={`w-12 sm:w-14 flex-shrink-0 flex items-center justify-center rounded-xl ring-1 ring-inset transition-all duration-200 ${
            selected('draw')
              ? 'bg-primary/20 ring-primary/50 text-white'
              : `bg-white/5 ring-white/[0.08] text-neutral-500 ${readOnly ? '' : 'hover:bg-white/[0.08] hover:text-white'}`
          } ${readOnly ? 'cursor-default' : ''}`}
          onClick={() => handlePredict('draw')}
          disabled={readOnly}
        >
          <span className="font-bold text-xs font-body">TIE</span>
        </button>

        {/* Away */}
        <button
          className={`flex-1 min-w-0 flex items-center justify-end gap-3 px-3 py-2.5 rounded-xl ring-1 ring-inset transition-all duration-200 ${
            selected('away')
              ? 'bg-primary/20 ring-primary/50 text-white'
              : `bg-white/5 ring-white/[0.08] text-neutral-400 ${readOnly ? '' : 'hover:bg-white/[0.08] hover:text-white'}`
          } ${readOnly ? 'cursor-default' : ''}`}
          onClick={() => handlePredict('away')}
          disabled={readOnly}
        >
          <span className="text-sm font-semibold leading-tight truncate text-right font-body">
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

    </div>
  );
}
