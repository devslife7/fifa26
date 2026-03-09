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
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500 font-bold">
          <tr>
            <th className="py-3 px-4 w-12 text-center">Pos</th>
            <th className="py-3 px-2">Team</th>
            <th className="py-3 px-4 text-center w-16">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {standings.map((s, i) => {
            const team = teamsByCode[s.team];
            if (!team) return null;

            let rowClass = '';
            if (showQualification) {
              if (i < 2) rowClass = 'bg-primary/5';
            }

            return (
              <tr key={s.team} className={rowClass}>
                <td className="py-4 px-4 text-center font-bold">{i + 1}</td>
                <td className="py-4 px-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{team.flag}</span>
                    <span className={i < 2 ? "font-bold" : "font-semibold"}>{team.name}</span>
                  </div>
                </td>
                <td className={`py-4 px-4 text-center font-black ${i < 2 ? '' : 'text-slate-500'}`}>{s.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
