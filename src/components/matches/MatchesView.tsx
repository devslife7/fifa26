'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LeaderboardPrediction, LiveMatch } from '@/types';
import { teamsByCode } from '@/data/teams';
import { buildR32DisplayRows, buildKnockoutDisplayRows } from '@/lib/logic/actual-bracket';
import { getSlotLabels } from '@/lib/logic/bracket';
import { formatMatchTime, formatRelativeDate, getDateBucket } from '@/lib/utils/match-dates';
import MatchPredictionsModal from './MatchPredictionsModal';

type StageKey = 'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | 'FIN';

type TimeFilter = 'today' | 'past' | 'upcoming';

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'past', label: 'Past' },
  { key: 'upcoming', label: 'Upcoming' },
];

export function getStageKey(match: LiveMatch): StageKey {
  const id = match.localMatchId;
  if (id) {
    if (/^[A-L]-/.test(id)) return 'GROUP';
    if (id.startsWith('R32')) return 'R32';
    if (id.startsWith('R16')) return 'R16';
    if (id.startsWith('QF')) return 'QF';
    if (id.startsWith('SF')) return 'SF';
    return 'FIN';
  }
  switch (match.stage) {
    case 'GROUP_STAGE': return 'GROUP';
    case 'LAST_32': return 'R32';
    case 'LAST_16': return 'R16';
    case 'QUARTER_FINALS': return 'QF';
    case 'SEMI_FINALS': return 'SF';
    default: return 'FIN';
  }
}

export function getStageLabel(match: LiveMatch): string {
  const id = match.localMatchId;
  if (id && /^[A-L]-/.test(id)) return `Group ${id.split('-')[0]}`;
  if (match.group) return match.group.replace(/^GROUP_/, 'Group ');
  switch (getStageKey(match)) {
    case 'GROUP': return 'Group Stage';
    case 'R32': return 'Round of 32';
    case 'R16': return 'Round of 16';
    case 'QF': return 'Quarter-final';
    case 'SF': return 'Semi-final';
    default:
      return match.localMatchId === '3RD-1' || match.stage === 'THIRD_PLACE'
        ? 'Third Place'
        : 'Final';
  }
}

function getTeamName(code: string | null, fallback: string | null): string {
  if (code && teamsByCode[code]) return teamsByCode[code].name;
  return fallback ?? 'TBD';
}

export function TeamFlag({
  code,
  liveFlag,
  teamFlagsByCode,
  size = 'normal',
}: {
  code: string | null;
  liveFlag?: string | null;
  teamFlagsByCode?: Record<string, string>;
  size?: 'small' | 'normal' | 'large';
}) {
  const flagUrl = liveFlag ?? (code ? teamFlagsByCode?.[code] : undefined);
  const emoji = (code ? teamsByCode[code]?.flag : undefined) ?? '🏳️';

  const imgClass = size === 'small'
    ? 'w-5 h-3.5 object-cover rounded-[2px]'
    : size === 'large'
      ? 'w-8 h-[22px] object-cover rounded-sm'
      : 'w-6 h-4 object-cover rounded-sm';
  const emojiClass = size === 'small'
    ? 'text-sm leading-none'
    : size === 'large'
      ? 'text-xl leading-none'
      : 'text-base leading-none';

  if (flagUrl) {
    return (
      <span className="inline-flex shrink-0">
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
        <span className={emojiClass} hidden>{emoji}</span>
      </span>
    );
  }
  return <span className={`inline-flex shrink-0 ${emojiClass}`}>{emoji}</span>;
}

function localDayKey(utcDate: string): string {
  const d = new Date(utcDate);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface DaySection {
  key: string;
  label: string;
  dateLabel: string | null;
  isToday: boolean;
  items: LiveMatch[];
}

interface MatchesViewProps {
  matches: LiveMatch[];
  loading?: boolean;
  teamFlagsByCode?: Record<string, string>;
}

export default function MatchesView({ matches, loading, teamFlagsByCode }: MatchesViewProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [predictions, setPredictions] = useState<LeaderboardPrediction[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<LiveMatch | null>(null);

  useEffect(() => {
    fetch('/api/leaderboard/predictions')
      .then(res => res.json())
      .then(data => setPredictions(data.predictions ?? []))
      .catch(() => setPredictions([]));
  }, []);

  const approvedPredictions = useMemo(
    () => predictions.filter(prediction => prediction.is_approved),
    [predictions],
  );

  // Replace all knockout fixtures with bracket-driven rows (correct matchups from
  // our model, live data overlaid by team identity, teams propagated round by round).
  const displayMatches = useMemo(() => {
    const groupOnly = matches.filter(m => m.stage === 'GROUP');
    return [...groupOnly, ...buildR32DisplayRows(matches), ...buildKnockoutDisplayRows(matches)];
  }, [matches]);

  const daySections = useMemo<DaySection[]>(() => {
    const dated: LiveMatch[] = [];
    const undated: LiveMatch[] = [];
    for (const match of displayMatches) {
      const bucket = getDateBucket(match.utcDate);
      if (bucket === 'unknown') {
        undated.push(match);
        continue;
      }
      // today tab → today only; past tab → yesterday + earlier; upcoming → tomorrow + later
      if (timeFilter === 'today' && bucket === 'today') dated.push(match);
      else if (timeFilter === 'past' && (bucket === 'yesterday' || bucket === 'past')) dated.push(match);
      else if (timeFilter === 'upcoming' && (bucket === 'tomorrow' || bucket === 'future')) dated.push(match);
    }

    const byKey = new Map<string, LiveMatch[]>();
    for (const match of dated) {
      const key = localDayKey(match.utcDate);
      const bucket = byKey.get(key);
      if (bucket) bucket.push(match);
      else byKey.set(key, [match]);
    }

    const sections: DaySection[] = Array.from(byKey.entries())
      .map(([key, items]) => {
        items.sort((a, b) => a.utcDate.localeCompare(b.utcDate));
        const first = items[0];
        const bucket = getDateBucket(first.utcDate);
        const relative = formatRelativeDate(first.utcDate);
        const fullDate = new Date(first.utcDate).toLocaleDateString(undefined, {
          weekday: 'long', month: 'long', day: 'numeric',
        });
        const isRelative = bucket === 'today' || bucket === 'yesterday' || bucket === 'tomorrow';
        return {
          key,
          label: relative,
          dateLabel: isRelative ? fullDate : null,
          isToday: bucket === 'today',
          items,
        };
      })
      // Past: most recent day first. Today/Upcoming: soonest day first.
      .sort((a, b) => (timeFilter === 'past' ? b.key.localeCompare(a.key) : a.key.localeCompare(b.key)));

    // Fixtures without a scheduled date are upcoming-but-TBD.
    if (timeFilter === 'upcoming' && undated.length > 0) {
      sections.push({ key: 'tbd', label: 'Date TBD', dateLabel: null, isToday: false, items: undated });
    }

    return sections;
  }, [displayMatches, timeFilter]);

  const totalShown = daySections.reduce((sum, section) => sum + section.items.length, 0);

  if (loading && matches.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <img src="/images/fifa_logo.svg" alt="FIFA World Cup 2026" className="w-12 h-12 animate-trophy-glow" />
      </div>
    );
  }

  return (
    <div className="flex-grow pt-4 pb-8">
      <div className="mb-3">
        <h2 className="font-bold text-3xl md:text-xl">Matches</h2>
        <p className="mt-1 text-base text-neutral-400 font-body md:text-sm">
          {totalShown} {totalShown === 1 ? 'match' : 'matches'} · tap one to see everyone&rsquo;s picks
        </p>
      </div>

      <div className="mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {TIME_FILTERS.map(filter => {
          const isActive = timeFilter === filter.key;
          return (
            <button
              key={filter.key}
              onClick={() => setTimeFilter(filter.key)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full border font-semibold text-xs transition-colors ${
                isActive
                  ? 'border-primary bg-primary text-black'
                  : 'border-white/10 text-neutral-300 hover:bg-white/5'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {matches.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-10 text-center">
          <span className="material-symbols-outlined text-3xl text-neutral-500">sports_soccer</span>
          <p className="mt-2 text-sm font-semibold text-neutral-300">Match schedule unavailable</p>
          <p className="mt-1 text-xs text-neutral-500 font-body">
            Live fixture data couldn&rsquo;t be loaded. Pull to refresh or try again shortly.
          </p>
        </div>
      ) : totalShown === 0 ? (
        <div className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-10 text-center">
          <p className="text-sm font-semibold text-neutral-300">
            {timeFilter === 'today'
              ? 'No matches today'
              : timeFilter === 'past'
                ? 'No matches played yet'
                : 'No upcoming matches'}
          </p>
          <p className="mt-1 text-xs text-neutral-500 font-body">
            {timeFilter === 'today'
              ? 'Check the Upcoming tab for the next fixtures.'
              : timeFilter === 'past'
                ? 'Results will show here once matches kick off.'
                : 'Fixtures appear once the bracket is set.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {daySections.map(section => (
            <section key={section.key} id={`matches-day-${section.key}`} className="scroll-mt-16">
              <div className="sticky top-0 z-10 -mx-1 mb-2 bg-background-dark/95 px-1 py-2 backdrop-blur">
                <div className="flex items-baseline gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${section.isToday ? 'text-primary' : 'text-neutral-400'}`}>
                    {section.label}
                  </span>
                  {section.dateLabel && (
                    <span className="text-[11px] font-semibold text-neutral-600 font-body">{section.dateLabel}</span>
                  )}
                  <span className="ml-auto text-[11px] font-semibold text-neutral-600 tabular-nums">
                    {section.items.length} {section.items.length === 1 ? 'match' : 'matches'}
                  </span>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 divide-y divide-white/5">
                {section.items.map(match => (
                  <MatchRow
                    key={match.apiMatchId}
                    match={match}
                    teamFlagsByCode={teamFlagsByCode}
                    onSelect={match.localMatchId ? () => setSelectedMatch(match) : undefined}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {selectedMatch && (
        <MatchPredictionsModal
          match={selectedMatch}
          predictions={approvedPredictions}
          teamFlagsByCode={teamFlagsByCode}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}

function MatchRow({
  match,
  teamFlagsByCode,
  onSelect,
}: {
  match: LiveMatch;
  teamFlagsByCode?: Record<string, string>;
  onSelect?: () => void;
}) {
  const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED';
  const isFinished = match.status === 'FINISHED';
  const showScore = match.score != null && (isLive || isFinished);

  const homeWon = isFinished && match.actualResult === 'home';
  const awayWon = isFinished && match.actualResult === 'away';

  // For knockout slots without resolved teams, label the card with the bracket
  // path (e.g. "Runner-up A") instead of a bare "TBD".
  const isKnockoutTBD =
    !!match.localMatchId && !/^[A-L]-/.test(match.localMatchId) && (!match.homeCode || !match.awayCode);
  const slotLabels = isKnockoutTBD ? getSlotLabels(match.localMatchId!) : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!onSelect}
      className={`w-full flex items-center gap-3 px-3.5 py-3 text-left group ${
        onSelect ? 'hover:bg-white/5 transition-colors cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="w-12 shrink-0 flex flex-col items-center justify-center">
        {isLive ? (
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-wc-red">
            <span className="size-1.5 rounded-full bg-wc-red animate-pulse" />
            Live
          </span>
        ) : isFinished ? (
          <span className="text-[10px] font-semibold uppercase text-neutral-500">FT</span>
        ) : (
          <span className="text-xs font-medium text-neutral-300 tabular-nums">
            {/* Synthetic bracket rows (negative id) have no confirmed kickoff time yet. */}
            {match.apiMatchId < 0 ? 'TBD' : formatMatchTime(match.utcDate) || 'TBD'}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-grow space-y-1.5">
        <TeamLine
          code={match.homeCode}
          name={getTeamName(match.homeCode, slotLabels?.home ?? match.homeShortName ?? match.homeName)}
          liveFlag={match.homeFlag}
          teamFlagsByCode={teamFlagsByCode}
          score={showScore ? match.score!.home : null}
          emphasized={!isFinished || homeWon}
          winner={homeWon}
        />
        <TeamLine
          code={match.awayCode}
          name={getTeamName(match.awayCode, slotLabels?.away ?? match.awayShortName ?? match.awayName)}
          liveFlag={match.awayFlag}
          teamFlagsByCode={teamFlagsByCode}
          score={showScore ? match.score!.away : null}
          emphasized={!isFinished || awayWon}
          winner={awayWon}
        />
      </div>

      <div className="shrink-0 flex items-center gap-2">
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
          {getStageLabel(match)}
        </span>
        {onSelect && (
          <span className="material-symbols-outlined text-[18px] text-neutral-600 transition-colors group-hover:text-primary">
            chevron_right
          </span>
        )}
      </div>
    </button>
  );
}

function TeamLine({
  code,
  name,
  liveFlag,
  teamFlagsByCode,
  score,
  emphasized,
  winner,
}: {
  code: string | null;
  name: string;
  liveFlag?: string | null;
  teamFlagsByCode?: Record<string, string>;
  score: number | null;
  emphasized: boolean;
  winner: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex w-6 shrink-0 justify-center">
        {code ? (
          <TeamFlag code={code} liveFlag={liveFlag} teamFlagsByCode={teamFlagsByCode} />
        ) : (
          <span className="material-symbols-outlined text-[16px] text-neutral-600">help</span>
        )}
      </span>
      <span className={`min-w-0 flex-grow truncate text-sm font-medium ${emphasized ? 'text-white' : 'text-neutral-500'}`}>
        {name}
      </span>
      {score != null && (
        <span className={`shrink-0 text-sm font-semibold tabular-nums ${winner ? 'text-primary' : emphasized ? 'text-white' : 'text-neutral-500'}`}>
          {score}
        </span>
      )}
    </div>
  );
}
