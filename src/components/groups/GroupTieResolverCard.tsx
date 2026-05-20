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
  const remainingTeams = tieBands.reduce((sum, band) => sum + band.teams.length, 0);
  const selectedTeams = tieBands.reduce((sum, band) => sum + (groupTiebreakers[band.key]?.length ?? 0), 0);

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
    <div className="bg-neutral-900 border-2 border-primary rounded-3xl overflow-hidden shadow-[0_0_0_4px_rgba(212,160,23,0.12),0_18px_40px_rgba(0,0,0,0.28)]">
      <div className="w-full px-4 py-3 bg-primary text-black border-b border-black/20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="material-symbols-outlined text-[22px] font-variation-fill flex-shrink-0">priority_high</span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] leading-none opacity-70">Action required</p>
              <p className="mt-1 text-[14px] font-black uppercase tracking-wider leading-tight">
                Group {group} tie breaker needed
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-lg bg-black px-2.5 py-1 text-[11px] font-black tabular-nums text-primary">
            {selectedTeams}/{remainingTeams}
          </span>
        </div>
        <p className="mt-2 text-[11px] font-bold leading-snug text-black/75">
          This group is not final. Tap the highlighted tied teams in finishing order.
        </p>
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
                    ? 'bg-primary/20 shadow-[inset_5px_0_0_0_var(--color-primary)]'
                    : 'bg-primary/[0.08] shadow-[inset_5px_0_0_0_rgba(212,160,23,0.45)] hover:bg-primary/[0.12]'
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
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${
                  selected ? 'bg-primary text-black' : 'bg-primary/20 text-primary ring-1 ring-primary/40'
                }`}>
                  {selected ? `Order ${selectedIndex + 1}` : 'Needs order'}
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

      <div className="px-4 py-3 bg-primary/[0.08] border-t border-primary/20">
        <p className="text-[11px] font-bold text-primary">
          Bracket and best-third placement are paused until this group tie is resolved.
        </p>
      </div>
    </div>
  );
}
