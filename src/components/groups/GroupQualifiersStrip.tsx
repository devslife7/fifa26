'use client';

import { GroupLetter, GroupStanding } from '@/types';
import { teamsByCode } from '@/data/teams';

interface Props {
  group: GroupLetter;
  standings: GroupStanding[];
  expanded: boolean;
  onToggle: () => void;
  teamFlagsByCode?: Record<string, string>;
  thirdPlaceRelevant?: boolean;
}

function TeamRow({
  rank,
  standing,
  flagUrl,
  qualified,
  thirdPlaceRelevant,
}: {
  rank: number;
  standing: GroupStanding;
  flagUrl?: string;
  qualified: boolean;
  thirdPlaceRelevant?: boolean;
}) {
  const team = teamsByCode[standing.team];
  if (!team) return null;
  const dim = !qualified;
  return (
    <div className={`flex items-center gap-3 px-3 py-2 ${dim ? 'opacity-60' : ''}`}>
      <span className={`text-[11px] font-black tabular-nums w-4 text-center ${qualified ? 'text-primary' : 'text-neutral-500'}`}>
        {rank}
      </span>
      {flagUrl ? (
        <img src={flagUrl} alt="" className="w-6 h-4 object-cover rounded-sm flex-shrink-0" />
      ) : (
        <span className="text-lg leading-none flex-shrink-0">{team.flag}</span>
      )}
      <span className={`flex-1 min-w-0 truncate text-sm font-body ${qualified ? 'font-bold text-white' : 'font-semibold text-neutral-300'}`}>
        {team.name}
      </span>
      {qualified ? (
        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-primary/15 text-primary">
          Qualified
        </span>
      ) : thirdPlaceRelevant ? (
        <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">
          3rd place
        </span>
      ) : null}
      <span className={`text-xs font-black tabular-nums w-8 text-right ${qualified ? 'text-white' : 'text-neutral-500'}`}>
        {standing.points} pt{standing.points === 1 ? '' : 's'}
      </span>
    </div>
  );
}

export default function GroupQualifiersStrip({ group, standings, expanded, onToggle, teamFlagsByCode, thirdPlaceRelevant }: Props) {
  const top = standings.slice(0, 2);
  const third = standings[2];

  return (
    <div className="bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] transition-colors border-b border-white/5"
      >
        <span className="text-[10px] font-black uppercase tracking-wider text-primary">
          Group {group} · Qualified
        </span>
        <span className="material-symbols-outlined text-[18px] text-neutral-400">
          {expanded ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      <div className="divide-y divide-white/5">
        {top.map((s, i) => (
          <TeamRow
            key={s.team}
            rank={i + 1}
            standing={s}
            flagUrl={teamFlagsByCode?.[s.team]}
            qualified
          />
        ))}
        {third && (
          <TeamRow
            rank={3}
            standing={third}
            flagUrl={teamFlagsByCode?.[third.team]}
            qualified={false}
            thirdPlaceRelevant={thirdPlaceRelevant}
          />
        )}
      </div>
    </div>
  );
}
