'use client';

import { KnockoutResult, LiveMatch } from '@/types';
import { teamsByCode } from '@/data/teams';
import { KNOCKOUT_POINTS } from '@/lib/logic/scoring';
import { isPlaceholder, placeholderLabel } from '@/lib/logic/bracket';

interface Props {
  matchId: string;
  homeCode?: string;
  awayCode?: string;
  result?: KnockoutResult;
  onPredict: (matchId: string, result: KnockoutResult) => void;
  compact?: boolean;
  liveMatch?: LiveMatch;
  teamFlagsByCode?: Record<string, string>;
  readOnly?: boolean;
  venue?: string;
}

function formatMatchDate(utcDate: string): string {
  const d = new Date(utcDate);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatMatchTime(utcDate: string): string {
  const d = new Date(utcDate);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function TeamFlag({ code, flagUrl, flagEmoji }: { code?: string; flagUrl?: string; flagEmoji: string }) {
  if (code?.startsWith('TBD') || flagEmoji === '🏳️') {
    return null;
  }

  if (flagUrl) {
    return (
      <img
        src={flagUrl}
        alt=""
        className="w-7 h-5 object-cover rounded-sm"
        onError={e => {
          const img = e.currentTarget;
          img.style.display = 'none';
          const fallback = img.nextSibling as HTMLElement | null;
          if (fallback) fallback.removeAttribute('hidden');
        }}
      />
    );
  }
  return <span className="text-xl leading-none">{flagEmoji}</span>;
}

export default function KnockoutMatchCard({
  matchId,
  homeCode,
  awayCode,
  result,
  onPredict,
  compact = false,
  liveMatch,
  teamFlagsByCode,
  readOnly = false,
  venue,
}: Props) {
  const homePH = isPlaceholder(homeCode);
  const awayPH = isPlaceholder(awayCode);
  const home = homeCode && !homePH ? teamsByCode[homeCode] : null;
  const away = awayCode && !awayPH ? teamsByCode[awayCode] : null;
  const canPredict = home && away && !homePH && !awayPH;

  const isFinished = liveMatch?.status === 'FINISHED';
  const predictionCorrect = isFinished && result && liveMatch?.actualResult
    ? result === liveMatch.actualResult
    : null;

  const TeamSlot = ({
    team,
    code,
    side,
    isSelected,
  }: {
    team: typeof home;
    code?: string;
    side: KnockoutResult;
    isSelected: boolean;
  }) => {
    // Placeholder team from incomplete group
    if (code && isPlaceholder(code)) {
      return (
        <div className="w-full flex items-center px-3 py-3 rounded-full">
          <span className="font-body font-semibold text-sm text-neutral-500 italic">
            {placeholderLabel(code)}
          </span>
        </div>
      );
    }

    if (!team) {
      return (
        <div className="w-full flex items-center justify-between p-2 rounded-lg bg-white/10 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 flex items-center justify-center bg-primary rounded-full">
              <span className="material-symbols-outlined text-[16px] font-bold">lock</span>
            </div>
            <span className="font-bold text-sm text-neutral-400 italic">TBD</span>
          </div>
        </div>
      );
    }

    const flagUrl = code && teamFlagsByCode ? teamFlagsByCode[code] : undefined;

    const canPredictAction = canPredict && !readOnly;

    return (
      <button
        className={`w-full flex items-center justify-between px-3 py-3 rounded-full transition-colors ${isSelected
            ? 'bg-primary/15 ring-1 ring-inset ring-primary/70'
            : canPredictAction
              ? 'hover:bg-white/5'
              : `opacity-80 ${readOnly ? 'cursor-default' : 'cursor-default'}`
          }`}
        onClick={() => canPredictAction && onPredict(matchId, side)}
        disabled={!canPredictAction}
      >
        <div className="flex items-center gap-3">
          {(!code?.startsWith('TBD') && team.flag !== '🏳️') && (
            <span className="flex items-center justify-center min-w-[24px]">
              <TeamFlag code={code} flagUrl={flagUrl} flagEmoji={team.flag} />
              {flagUrl && <span className="text-xl leading-none" hidden>{team.flag}</span>}
            </span>
          )}
          <span className={`font-body font-semibold text-sm break-words whitespace-normal text-left ${isSelected ? 'text-white' : 'text-neutral-400'}`}>
            {team.name}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="relative group min-w-[240px]">
      <div className={`bg-neutral-900 rounded-xl border border-white/10 overflow-hidden path-highlight ${!canPredict ? 'opacity-80' : ''}`}>
        <div className="bg-white/5 px-3 py-1.5 flex justify-between items-center border-b border-white/5">
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase">{matchId}</span>
              {liveMatch && (
                <>
                  <span className="text-[10px] text-neutral-300">·</span>
                  <span className="text-[10px] text-neutral-400 truncate">
                    {formatMatchDate(liveMatch.utcDate)} {formatMatchTime(liveMatch.utcDate)}
                  </span>
                </>
              )}
            </div>
            {(liveMatch?.venue || venue) && (
              <span className="text-[9px] text-neutral-500 truncate">
                {liveMatch?.venue ?? venue}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isFinished && liveMatch?.score && (
              <span className="text-[10px] font-bold tabular-nums text-neutral-300">
                {liveMatch.score.home}–{liveMatch.score.away}
              </span>
            )}
            {predictionCorrect !== null && (
              <span className="inline-flex items-center gap-0.5">
                <span className={`material-symbols-outlined text-[14px] font-variation-fill ${predictionCorrect ? 'text-wc-green' : 'text-wc-red'}`}>
                  {predictionCorrect ? 'check_circle' : 'cancel'}
                </span>
                {predictionCorrect && (
                  <span className="text-[11px] font-bold text-wc-green font-body">
                    +{KNOCKOUT_POINTS[matchId.split('-')[0]] ?? 0}
                  </span>
                )}
              </span>
            )}
            {!canPredict && !liveMatch && (
              <span className="text-[10px] font-semibold text-neutral-400 italic">Make earlier picks</span>
            )}
          </div>
        </div>
        <div className="px-1 py-1.5">
          <TeamSlot team={home} code={homeCode} side="home" isSelected={result === 'home'} />
          <TeamSlot team={away} code={awayCode} side="away" isSelected={result === 'away'} />
        </div>
      </div>
    </div>
  );
}
