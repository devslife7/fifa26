'use client';

import { LiveMatch, MatchResult, TabId } from '@/types';
import { teamsByCode } from '@/data/teams';

interface Props {
  liveMatch: LiveMatch | null;
  nextMatch: LiveMatch | null;
  userPickForNextMatch: MatchResult | undefined;
  teamFlagsByCode: Record<string, string>;
  onNavigate: (tab: TabId) => void;
}

const KICKOFF_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

function formatKickoff(utcDate: string): string {
  const date = new Date(utcDate);
  if (Number.isNaN(date.getTime())) return '';
  return KICKOFF_FORMATTER.format(date);
}

function pickLabel(pick: MatchResult | undefined): string {
  if (pick === 'home') return 'Home win';
  if (pick === 'away') return 'Away win';
  if (pick === 'draw') return 'Draw';
  return 'No pick yet';
}

function TeamCell({
  code,
  name,
  shortName,
  flagUrl,
}: {
  code: string | null;
  name: string | null;
  shortName: string | null;
  flagUrl: string | null;
}) {
  const emojiFallback = code ? teamsByCode[code]?.flag ?? '' : '';
  const label = shortName || (code ? teamsByCode[code]?.name ?? code : name ?? '—');

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/20">
        {flagUrl ? (
          <img src={flagUrl} alt={label} className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg">{emojiFallback || '—'}</span>
        )}
      </div>
      <span className="truncate text-sm font-black text-neutral-100">{label}</span>
    </div>
  );
}

export default function NextMatchCard({
  liveMatch,
  nextMatch,
  userPickForNextMatch,
  teamFlagsByCode,
  onNavigate,
}: Props) {
  const match = liveMatch ?? nextMatch;
  if (!match) return null;

  const isLive = !!liveMatch;
  const score = match.score;
  const homeFlag = (match.homeCode ? teamFlagsByCode[match.homeCode] : null) ?? match.homeFlag ?? null;
  const awayFlag = (match.awayCode ? teamFlagsByCode[match.awayCode] : null) ?? match.awayFlag ?? null;

  return (
    <button
      onClick={() => onNavigate('groups')}
      className="w-full rounded-[22px] bg-white/[0.025] px-4 py-4 text-left transition-transform active:scale-[0.99]"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-body text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500">
          {isLive ? 'Live now' : 'Up next'}
        </span>
        {isLive ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-wc-green animate-pulse" />
            <span className="font-body text-[9px] font-black uppercase tracking-[0.18em] text-wc-green">
              Live
            </span>
          </span>
        ) : (
          <span className="font-body text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
            {formatKickoff(match.utcDate)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <TeamCell
          code={match.homeCode}
          name={match.homeName}
          shortName={match.homeShortName}
          flagUrl={homeFlag}
        />
        <div className="shrink-0 text-center font-display tabular-nums">
          {isLive ? (
            <span className="text-base font-black text-primary">
              {(score?.home ?? 0)}–{(score?.away ?? 0)}
            </span>
          ) : (
            <span className="font-body text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">
              vs
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-right text-sm font-black text-neutral-100">
            {match.awayShortName || (match.awayCode ? teamsByCode[match.awayCode]?.name ?? match.awayCode : match.awayName ?? '—')}
          </span>
          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/20">
            {awayFlag ? (
              <img src={awayFlag} alt={match.awayShortName ?? match.awayName ?? ''} className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg">
                {match.awayCode ? teamsByCode[match.awayCode]?.flag ?? '' : '—'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-black/15 px-3 py-2">
        <span className="font-body text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500">
          Your pick
        </span>
        <span
          className={`text-xs font-black ${
            userPickForNextMatch ? 'text-primary' : 'text-neutral-400'
          }`}
        >
          {pickLabel(userPickForNextMatch)}
        </span>
      </div>
    </button>
  );
}
