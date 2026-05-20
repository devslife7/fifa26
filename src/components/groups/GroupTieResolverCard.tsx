'use client';

import { GroupLetter, GroupStanding, GroupTiebreakers } from '@/types';
import { GroupTieBand } from '@/lib/logic/standings';
import { teamsByCode } from '@/data/teams';

interface Props {
  group: GroupLetter;
  standings: GroupStanding[];
  tieBands: GroupTieBand[];
  groupTiebreakers: GroupTiebreakers;
  onTieOrderChange: (group: GroupLetter, key: string, order: string[]) => void;
  teamFlagsByCode?: Record<string, string>;
}

export default function GroupTieResolverCard({
  group,
  standings,
  tieBands,
  groupTiebreakers,
  onTieOrderChange,
  teamFlagsByCode,
}: Props) {
  const bandByTeam = new Map<string, GroupTieBand>();
  tieBands.forEach(band => {
    band.teams.forEach(team => bandByTeam.set(team, band));
  });

  const handleTeamTap = (band: GroupTieBand, teamCode: string) => {
    const current = groupTiebreakers[band.key] ?? [];
    const selectedIndex = current.indexOf(teamCode);
    const next = selectedIndex >= 0
      ? current.filter(team => team !== teamCode)
      : current.length < band.teams.length
        ? [...current, teamCode]
        : current;
    onTieOrderChange(group, band.key, next);
  };

  return (
    <div className="bg-neutral-900 border border-primary/30 rounded-3xl overflow-hidden shadow-[0_0_0_1px_rgba(212,160,23,0.06)]">
      <div className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-primary/[0.08] border-b border-primary/20">
        <span className="text-[10px] font-black uppercase tracking-wider text-primary">
          Group {group} · Resolve Tie
        </span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-primary/80">
          Tap in order
        </span>
      </div>

      <div className="divide-y divide-white/5">
        {standings.map((standing, index) => {
          const team = teamsByCode[standing.team];
          if (!team) return null;

          const band = bandByTeam.get(standing.team);
          const order = band ? groupTiebreakers[band.key] ?? [] : [];
          const selectedIndex = order.indexOf(standing.team);
          const selected = selectedIndex >= 0;
          const tied = !!band;
          const qualified = index < 2;

          return (
            <button
              key={standing.team}
              type="button"
              disabled={!band}
              onClick={() => band && handleTeamTap(band, standing.team)}
              className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors ${
                tied
                  ? selected
                    ? 'bg-primary/15'
                    : 'bg-white/[0.03] hover:bg-white/[0.06]'
                  : qualified
                    ? 'bg-primary/[0.04]'
                    : 'opacity-60'
              }`}
            >
              <span className={`text-[11px] font-black tabular-nums w-4 text-center ${qualified || tied ? 'text-primary' : 'text-neutral-500'}`}>
                {index + 1}
              </span>
              {teamFlagsByCode?.[standing.team] ? (
                <img src={teamFlagsByCode[standing.team]} alt="" className="w-6 h-4 object-cover rounded-sm flex-shrink-0" />
              ) : (
                <span className="text-lg leading-none flex-shrink-0">{team.flag}</span>
              )}
              <span className={`flex-1 min-w-0 truncate text-sm font-body ${qualified || tied ? 'font-bold text-white' : 'font-semibold text-neutral-300'}`}>
                {team.name}
              </span>
              {band ? (
                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                  selected ? 'bg-primary text-black' : 'bg-white/10 text-primary'
                }`}>
                  {selected ? `Tie #${selectedIndex + 1}` : 'Tap'}
                </span>
              ) : qualified ? (
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-primary/15 text-primary">
                  Qualified
                </span>
              ) : null}
              <span className={`text-xs font-black tabular-nums w-8 text-right ${qualified || tied ? 'text-white' : 'text-neutral-500'}`}>
                {standing.points} pt{standing.points === 1 ? '' : 's'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="px-3 py-2 bg-white/[0.02] border-t border-white/5">
        <p className="text-[10px] font-semibold text-neutral-400">
          Resolve each tied points group before this group feeds into the bracket.
        </p>
      </div>
    </div>
  );
}
