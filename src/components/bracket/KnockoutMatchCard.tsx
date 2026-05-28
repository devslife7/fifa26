'use client';

import { KnockoutResult, LiveMatch } from '@/types';
import { teamsByCode } from '@/data/teams';
import { QUALIFIER_POINTS, WINNER_POINTS } from '@/lib/logic/scoring';

const POINTS_FOR_MATCH_WIN: Record<string, number> = {
  R32: QUALIFIER_POINTS.R16,
  R16: QUALIFIER_POINTS.QF,
  QF: QUALIFIER_POINTS.SF,
  SF: QUALIFIER_POINTS.FIN,
  '3RD': WINNER_POINTS['3RD'],
  FIN: WINNER_POINTS.FIN,
};
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
  focused?: boolean;
  showPathHighlight?: boolean;
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
        className="w-10 h-7 object-cover rounded-sm"
        onError={e => {
          const img = e.currentTarget;
          img.style.display = 'none';
          const fallback = img.nextSibling as HTMLElement | null;
          if (fallback) fallback.removeAttribute('hidden');
        }}
      />
    );
  }
  return <span className="text-3xl leading-none">{flagEmoji}</span>;
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
  focused = false,
  showPathHighlight = true,
}: Props) {
  const homePH = isPlaceholder(homeCode);
  const awayPH = isPlaceholder(awayCode);
  const home = homeCode && !homePH ? teamsByCode[homeCode] : null;
  const away = awayCode && !awayPH ? teamsByCode[awayCode] : null;
  const canPredict = home && away && !homePH && !awayPH;

  const isFinished = liveMatch?.status === 'FINISHED';
  // Compare by team code, not by side. The user's pick was a team; the bracket slot
  // they picked it in may not correspond to the teams that actually played, but their
  // pick is "correct" if that team really advanced from this match.
  const pickedTeamCode = result === 'home' ? homeCode : result === 'away' ? awayCode : undefined;
  const actualWinnerCode = isFinished && liveMatch?.actualResult && liveMatch.homeCode && liveMatch.awayCode
    ? (liveMatch.actualResult === 'home' ? liveMatch.homeCode : liveMatch.actualResult === 'away' ? liveMatch.awayCode : null)
    : null;
  const predictionCorrect = isFinished && pickedTeamCode && actualWinnerCode
    ? pickedTeamCode === actualWinnerCode
    : null;
  const hasHeaderStatusContent =
    (isFinished && !!liveMatch?.score) ||
    predictionCorrect !== null ||
    (!canPredict && !liveMatch);

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
      const label = placeholderLabel(code);
      const isBest3 = code.startsWith('PH:BEST3-');
      return (
        <div className="w-full flex items-center px-3 py-3 rounded-full" title={label}>
          <span className={`font-body font-semibold text-neutral-500 italic ${isBest3 ? 'text-xs' : 'text-sm'}`}>
            {label}
          </span>
        </div>
      );
    }

    if (!team) {
      return (
        <div className="w-full flex items-center justify-between rounded-xl bg-white/[0.035] px-3 py-3 ring-1 ring-inset ring-white/10">
          <div className="flex items-center gap-3">
            <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <span className="material-symbols-outlined block translate-y-[1px] text-[17px] leading-none">lock</span>
            </div>
            <span className="font-body text-sm font-black italic tracking-wide text-neutral-500">TBD</span>
          </div>
        </div>
      );
    }

    const flagUrl = code && teamFlagsByCode ? teamFlagsByCode[code] : undefined;

    const canPredictAction = canPredict && !readOnly;

    return (
      <button
        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl ring-1 ring-inset transition-all duration-200 ${isSelected
            ? 'bg-primary/40 ring-primary text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
            : canPredictAction
              ? 'bg-white/[0.09] ring-white/20 text-neutral-100 hover:bg-white/[0.14] hover:ring-white/30 hover:text-white'
              : `bg-white/[0.04] ring-white/10 opacity-80 ${readOnly ? 'cursor-default' : 'cursor-default'}`
          }`}
        onClick={() => canPredictAction && onPredict(matchId, side)}
        disabled={!canPredictAction}
      >
        <div className="flex items-center gap-3">
          {(!code?.startsWith('TBD') && team.flag !== '🏳️') && (
            <span className="flex items-center justify-center min-w-[36px]">
              <TeamFlag code={code} flagUrl={flagUrl} flagEmoji={team.flag} />
              {flagUrl && <span className="text-3xl leading-none" hidden>{team.flag}</span>}
            </span>
          )}
          <span className={`font-body font-semibold text-[15px] break-words whitespace-normal text-left ${isSelected ? 'text-white' : 'text-neutral-100'}`}>
            {team.name}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className={`relative group min-w-[240px] ${showPathHighlight ? 'path-highlight' : ''} rounded-2xl transition-all duration-300 ${
      ''
    } ${!canPredict ? 'opacity-80' : ''}`}>
      <div className="px-3 pt-1.5 flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{matchId}</span>
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
        {(liveMatch?.venue || venue) && (
          <>
            <span className="text-[10px] text-neutral-600">·</span>
            <span className="text-[10px] font-semibold text-neutral-500 truncate">
              {liveMatch?.venue ?? venue}
            </span>
          </>
        )}
        {hasHeaderStatusContent && (
          <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
            {isFinished && liveMatch?.score && (
              <span className="text-[11px] font-bold tabular-nums text-neutral-300">
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
                    +{POINTS_FOR_MATCH_WIN[matchId.split('-')[0]] ?? 0}
                  </span>
                )}
              </span>
            )}
            {!canPredict && !liveMatch && (
              <span className="text-[10px] font-semibold text-neutral-400 italic">Make earlier picks</span>
            )}
          </div>
        )}
      </div>
      <div data-prediction-choice-area className="flex flex-col gap-2 px-2 py-2.5">
        <TeamSlot team={home} code={homeCode} side="home" isSelected={result === 'home'} />
        <TeamSlot team={away} code={awayCode} side="away" isSelected={result === 'away'} />
      </div>
    </div>
  );
}
