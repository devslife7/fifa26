'use client';

import { LiveMatch, TabId } from '@/types';
import { teamsByCode } from '@/data/teams';

interface Props {
  liveMatch: LiveMatch | null;
  nextMatch: LiveMatch | null;
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
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/20">
        {flagUrl ? (
          <img src={flagUrl} alt={label} className="h-full w-full object-cover" />
        ) : (
          <span className="text-2xl">{emojiFallback || '—'}</span>
        )}
      </div>
      <span className="truncate text-[15px] font-black text-neutral-100">{label}</span>
    </div>
  );
}

export default function NextMatchCard({
  liveMatch,
  nextMatch,
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
      className="min-h-[104px] w-full rounded-[26px] bg-white/[0.025] px-5 py-5 text-left transition-transform active:scale-[0.99]"
    >
      <div className="mb-5 flex items-center justify-between gap-2">
        <span className="font-body text-[11px] font-black uppercase tracking-[0.16em] text-neutral-500">
          {isLive ? 'Live now' : 'Up next'}
        </span>
        {isLive ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-wc-green animate-pulse" />
            <span className="font-body text-[10px] font-black uppercase tracking-[0.18em] text-wc-green">
              Live
            </span>
          </span>
        ) : (
          <span className="font-body text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
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
            <span className="text-xl font-black text-primary">
              {(score?.home ?? 0)}–{(score?.away ?? 0)}
            </span>
          ) : (
            <span className="font-body text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
              vs
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-[1.15] items-center justify-end gap-2.5">
          <span className="truncate text-right text-[15px] font-black text-neutral-100">
            {match.awayShortName || (match.awayCode ? teamsByCode[match.awayCode]?.name ?? match.awayCode : match.awayName ?? '—')}
          </span>
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/20">
            {awayFlag ? (
              <img src={awayFlag} alt={match.awayShortName ?? match.awayName ?? ''} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl">
                {match.awayCode ? teamsByCode[match.awayCode]?.flag ?? '' : '—'}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
