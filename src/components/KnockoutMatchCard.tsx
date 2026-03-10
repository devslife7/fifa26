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
}

function formatMatchDate(utcDate: string): string {
  const d = new Date(utcDate);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatMatchTime(utcDate: string): string {
  const d = new Date(utcDate);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function TeamFlag({ flagUrl, flagEmoji }: { flagUrl?: string; flagEmoji: string }) {
  if (flagUrl) {
    return (
      <img
        src={flagUrl}
        alt=""
        className="w-6 h-6 object-contain"
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
        <div className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-100 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 flex items-center justify-center bg-primary rounded-full">
              <span className="material-symbols-outlined text-[16px] font-bold">lock</span>
            </div>
            <span className="font-bold text-sm text-slate-400 italic">TBD</span>
          </div>
        </div>
      );
    }

    const flagUrl = code && teamFlagsByCode ? teamFlagsByCode[code] : undefined;

    return (
      <button
        className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${isSelected
            ? 'bg-primary/10 border border-primary/20'
            : canPredict
              ? 'hover:bg-slate-50'
              : 'opacity-80 cursor-default'
          } ${compact ? 'py-1.5' : ''}`}
        onClick={() => canPredict && onPredict(matchId, side)}
        disabled={!canPredict}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center min-w-[24px]">
            <TeamFlag flagUrl={flagUrl} flagEmoji={team.flag} />
            {flagUrl && <span className="text-xl leading-none" hidden>{team.flag}</span>}
          </span>
          <span className={`font-semibold text-sm truncate ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
            {team.name}
          </span>
        </div>
        {isSelected && (
          <span className="material-symbols-outlined text-primary text-sm font-variation-fill">check_circle</span>
        )}
      </button>
    );
  };

  return (
    <div className="relative group min-w-[260px]">
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden path-highlight ${!canPredict ? 'opacity-80' : ''}`}>
        <div className="bg-slate-50 px-3 py-1.5 flex justify-between items-center border-b border-slate-200">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">{matchId}</span>
            {liveMatch && (
              <>
                <span className="text-[10px] text-slate-300">·</span>
                <span className="text-[10px] text-slate-400 truncate">
                  {formatMatchDate(liveMatch.utcDate)} {formatMatchTime(liveMatch.utcDate)}
                </span>
              </>
            )}
            {liveMatch?.venue && (
              <>
                <span className="text-[10px] text-slate-300">·</span>
                <span className="text-[9px] text-slate-400 truncate">{liveMatch.venue}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isFinished && liveMatch?.score && (
              <span className="text-[10px] font-bold tabular-nums text-slate-600">
                {liveMatch.score.home}–{liveMatch.score.away}
              </span>
            )}
            {predictionCorrect !== null && (
              <span className={`material-symbols-outlined text-[14px] font-variation-fill ${predictionCorrect ? 'text-green-500' : 'text-red-400'}`}>
                {predictionCorrect ? 'check_circle' : 'cancel'}
              </span>
            )}
            {!canPredict && !liveMatch && (
              <span className="text-[10px] font-semibold text-slate-400 italic">PENDING</span>
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
