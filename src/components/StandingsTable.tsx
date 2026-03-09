'use client';

import { GroupStanding } from '@/types';
import { teamsByCode } from '@/data/teams';

interface Props {
  standings: GroupStanding[];
  showQualification?: boolean;
}

export default function StandingsTable({ standings, showQualification = true }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-white/40 text-xs uppercase tracking-wider">
            <th className="text-left py-2 px-2">#</th>
            <th className="text-left py-2 px-2">Team</th>
            <th className="text-center py-2 px-1">P</th>
            <th className="text-center py-2 px-1">W</th>
            <th className="text-center py-2 px-1">D</th>
            <th className="text-center py-2 px-1">L</th>
            <th className="text-center py-2 px-1 font-bold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => {
            const team = teamsByCode[s.team];
            if (!team) return null;

            let rowClass = '';
            if (showQualification) {
              if (i < 2) rowClass = 'bg-malachite/10 border-l-2 border-l-malachite';
              else if (i === 2) rowClass = 'bg-gold/5 border-l-2 border-l-gold';
            }

            return (
              <tr key={s.team} className={`border-t border-border/50 ${rowClass}`}>
                <td className="py-2 px-2 text-white/40">{i + 1}</td>
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{team.flag}</span>
                    <span className="font-medium text-sm">{team.name}</span>
                  </div>
                </td>
                <td className="text-center py-2 px-1 text-white/60">{s.played}</td>
                <td className="text-center py-2 px-1 text-white/60">{s.won}</td>
                <td className="text-center py-2 px-1 text-white/60">{s.drawn}</td>
                <td className="text-center py-2 px-1 text-white/60">{s.lost}</td>
                <td className="text-center py-2 px-1 font-bold text-gold">{s.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
