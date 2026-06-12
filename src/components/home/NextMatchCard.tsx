'use client';

import { LiveMatch, TabId } from '@/types';
import { teamsByCode } from '@/data/teams';
import { formatMatchTime } from '@/lib/utils/match-dates';

interface Props {
  todayMatches: LiveMatch[];
  teamFlagsByCode: Record<string, string>;
  onNavigate: (tab: TabId) => void;
}

function teamLabel(match: LiveMatch, side: 'home' | 'away'): string {
  if (side === 'home') {
    return match.homeShortName
      || (match.homeCode ? teamsByCode[match.homeCode]?.name ?? match.homeCode : match.homeName ?? '—');
  }
  return match.awayShortName
    || (match.awayCode ? teamsByCode[match.awayCode]?.name ?? match.awayCode : match.awayName ?? '—');
}

function isLiveStatus(status: string): boolean {
  return status === 'IN_PLAY' || status === 'PAUSED';
}

function isFinishedStatus(status: string): boolean {
  return status === 'FINISHED';
}

function ScheduleRow({
  match,
  teamFlagsByCode,
  isLast,
}: {
  match: LiveMatch;
  teamFlagsByCode: Record<string, string>;
  isLast: boolean;
}) {
  const live = isLiveStatus(match.status);
  const finished = isFinishedStatus(match.status);
  const showScore = live || finished;
  const homeFlag = (match.homeCode ? teamFlagsByCode[match.homeCode] : null) ?? match.homeFlag ?? null;
  const awayFlag = (match.awayCode ? teamFlagsByCode[match.awayCode] : null) ?? match.awayFlag ?? null;
  const homeLabel = teamLabel(match, 'home');
  const awayLabel = teamLabel(match, 'away');

  return (
    <div className={`py-3 ${isLast ? '' : 'border-b border-white/[0.06]'}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-body text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400 tabular-nums">
          {formatMatchTime(match.utcDate)}
        </span>
        {live ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-wc-green animate-pulse" />
            <span className="font-body text-[10px] font-black uppercase tracking-[0.16em] text-wc-green">
              Live
            </span>
          </span>
        ) : finished ? (
          <span className="font-body text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500">
            Final
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/20">
            {homeFlag ? (
              <img src={homeFlag} alt={homeLabel} className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg">{match.homeCode ? teamsByCode[match.homeCode]?.flag ?? '' : '—'}</span>
            )}
          </div>
          <span className="truncate text-[13px] font-black text-neutral-100">{homeLabel}</span>
        </div>

        <div className="shrink-0 px-1 text-center font-display tabular-nums">
          {showScore ? (
            <span className={`text-sm font-black ${live ? 'text-primary' : 'text-neutral-300'}`}>
              {(match.score?.home ?? 0)}–{(match.score?.away ?? 0)}
            </span>
          ) : (
            <span className="font-body text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">
              vs
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-right text-[13px] font-black text-neutral-100">{awayLabel}</span>
          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/20">
            {awayFlag ? (
              <img src={awayFlag} alt={awayLabel} className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg">{match.awayCode ? teamsByCode[match.awayCode]?.flag ?? '' : '—'}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NextMatchCard({
  todayMatches,
  teamFlagsByCode,
  onNavigate,
}: Props) {
  if (todayMatches.length === 0) {
    return (
      <div className="w-full rounded-[26px] bg-white/[0.025] px-5 py-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="font-body text-[11px] font-black uppercase tracking-[0.16em] text-neutral-500">
            Today&apos;s schedule
          </span>
        </div>
        <p className="font-body text-sm font-semibold text-neutral-500">
          No matches scheduled for today.
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={() => onNavigate('groups')}
      className="w-full rounded-[26px] bg-white/[0.025] px-5 py-5 text-left transition-transform active:scale-[0.99]"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="font-body text-[11px] font-black uppercase tracking-[0.16em] text-neutral-500">
          Today&apos;s schedule
        </span>
        <span className="font-body text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
          {todayMatches.length} {todayMatches.length === 1 ? 'match' : 'matches'}
        </span>
      </div>

      <div>
        {todayMatches.map((match, index) => (
          <ScheduleRow
            key={match.localMatchId ?? String(match.apiMatchId)}
            match={match}
            teamFlagsByCode={teamFlagsByCode}
            isLast={index === todayMatches.length - 1}
          />
        ))}
      </div>
    </button>
  );
}
