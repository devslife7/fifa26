'use client';

import { MatchResult, GroupLetter } from '@/types';
import { getThirdPlaceRanking } from '@/lib/standings';
import { teamsByCode } from '@/data/teams';

interface Props {
  predictions: Record<string, MatchResult>;
}

export default function ThirdPlaceTable({ predictions }: Props) {
  const ranking = getThirdPlaceRanking(predictions);

  return (
    <div className="mt-6">
      <div className="mb-6">
        <h2 className="text-xl font-black border-l-4 border-primary pl-3">Best Third-Place Teams</h2>
        <p className="text-slate-400 text-xs mt-2 pl-4">
          Top 8 of 12 third-place teams advance to the Round of 32
        </p>
      </div>

      {ranking.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-slate-400 text-sm">
            Complete group stage predictions to see the third-place ranking
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold">
              <tr>
                <th className="text-center py-3 px-3 w-10">#</th>
                <th className="text-left py-3 px-2">Team</th>
                <th className="text-center py-3 px-3">Group</th>
                <th className="text-center py-3 px-3 w-14">Pts</th>
                <th className="text-center py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ranking.map((entry, i) => {
                const team = teamsByCode[entry.team];
                if (!team) return null;
                const qualifies = i < 8;

                return (
                  <tr
                    key={entry.team}
                    className={qualifies ? 'bg-primary/5' : ''}
                  >
                    <td className="py-3 px-3 text-center font-bold text-slate-400">{i + 1}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{team.flag}</span>
                        <span className="font-semibold">{team.name}</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-3">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-bold text-primary">
                        {entry.group}
                      </span>
                    </td>
                    <td className="text-center py-3 px-3 font-black">
                      {entry.standing.points}
                    </td>
                    <td className="text-center py-3 px-3">
                      {qualifies ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                          Advances
                        </span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                          Eliminated
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {ranking.length > 0 && ranking.length < 12 && (
        <p className="text-center text-slate-400 text-[10px] mt-4 uppercase tracking-widest font-bold">
          {ranking.length}/12 groups completed — finish all groups to see the full ranking
        </p>
      )}
    </div>
  );
}
