'use client';

import { KnockoutResult, LiveMatch } from '@/types';
import { teamsByCode } from '@/data/teams';

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
}: Props) {
  const home = homeCode ? teamsByCode[homeCode] : null;
  const away = awayCode ? teamsByCode[awayCode] : null;
  const canPredict = home && away;

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
    if (!team) {
      return (
        <div className="w-full flex items-center justify-between p-2 rounded-lg bg-neutral-100 animate-pulse">
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
        className={`w-full flex items-center justify-between p-2 rounded-full transition-colors ${isSelected
            ? 'bg-primary-light ring-1 ring-inset ring-primary/70'
            : canPredictAction
              ? 'hover:bg-neutral-50'
              : `opacity-80 ${readOnly ? 'cursor-default' : 'cursor-default'}`
          } ${compact ? 'py-1.5' : ''}`}
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
          <span className={`font-body font-semibold text-sm break-words whitespace-normal text-left ${isSelected ? 'text-neutral-800' : 'text-neutral-600'}`}>
            {team.name}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="relative group min-w-[180px]">
      <div className={`bg-white rounded-xl border border-neutral-200 overflow-hidden path-highlight ${!canPredict ? 'opacity-80' : ''}`}>
        <div className="bg-neutral-50 px-3 py-1.5 flex justify-between items-center border-b border-neutral-200">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase">{matchId}</span>
            {liveMatch && (
              <>
                <span className="text-[10px] text-neutral-300">·</span>
                <span className="text-[10px] text-neutral-400 truncate">
                  {formatMatchDate(liveMatch.utcDate)} {formatMatchTime(liveMatch.utcDate)}
                </span>
              </>
            )}
            {liveMatch?.venue && (
              <>
                <span className="text-[10px] text-neutral-300">·</span>
                <span className="text-[9px] text-neutral-400 truncate">{liveMatch.venue}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isFinished && liveMatch?.score && (
              <span className="text-[10px] font-bold tabular-nums text-neutral-600">
                {liveMatch.score.home}–{liveMatch.score.away}
              </span>
            )}
            {predictionCorrect !== null && (
              <span className={`material-symbols-outlined text-[14px] font-variation-fill ${predictionCorrect ? 'text-wc-green' : 'text-wc-red'}`}>
                {predictionCorrect ? 'check_circle' : 'cancel'}
              </span>
            )}
            {!canPredict && !liveMatch && (
              <span className="text-[10px] font-semibold text-neutral-400 italic">PENDING</span>
            )}
          </div>
        </div>
        <div className="px-3 py-2">
          <TeamSlot team={home} code={homeCode} side="home" isSelected={result === 'home'} />
          <TeamSlot team={away} code={awayCode} side="away" isSelected={result === 'away'} />
        </div>
      </div>
    </div>
  );
}
