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
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">
          <span className="text-gold">Best Third-Place</span> Teams
        </h2>
        <p className="text-white/40 text-sm">
          Top 8 of 12 third-place teams advance to the Round of 32
        </p>
      </div>

      {ranking.length === 0 ? (
        <div className="bg-surface-light rounded-2xl border border-border p-12 text-center">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-white/40">
            Complete group stage predictions to see the third-place ranking
          </p>
        </div>
      ) : (
        <div className="bg-surface-light rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs uppercase tracking-wider border-b border-border">
                <th className="text-left py-3 px-4">#</th>
                <th className="text-left py-3 px-4">Team</th>
                <th className="text-center py-3 px-3">Group</th>
                <th className="text-center py-3 px-3">P</th>
                <th className="text-center py-3 px-3">W</th>
                <th className="text-center py-3 px-3">D</th>
                <th className="text-center py-3 px-3">L</th>
                <th className="text-center py-3 px-3 font-bold">Pts</th>
                <th className="text-center py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((entry, i) => {
                const team = teamsByCode[entry.team];
                if (!team) return null;
                const qualifies = i < 8;

                return (
                  <tr
                    key={entry.team}
                    className={`border-t border-border/50 ${
                      qualifies
                        ? 'bg-malachite/10 border-l-2 border-l-malachite'
                        : 'bg-red-950/10 border-l-2 border-l-red-900/50'
                    }`}
                  >
                    <td className="py-3 px-4 text-white/40 font-medium">{i + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{team.flag}</span>
                        <span className="font-medium">{team.name}</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-3">
                      <span className="bg-surface-lighter px-2 py-0.5 rounded text-xs font-medium text-gold">
                        {entry.group}
                      </span>
                    </td>
                    <td className="text-center py-3 px-3 text-white/60">{entry.standing.played}</td>
                    <td className="text-center py-3 px-3 text-white/60">{entry.standing.won}</td>
                    <td className="text-center py-3 px-3 text-white/60">{entry.standing.drawn}</td>
                    <td className="text-center py-3 px-3 text-white/60">{entry.standing.lost}</td>
                    <td className="text-center py-3 px-3 font-bold text-gold">
                      {entry.standing.points}
                    </td>
                    <td className="text-center py-3 px-4">
                      {qualifies ? (
                        <span className="text-xs bg-malachite/20 text-green-400 px-2 py-0.5 rounded-full font-medium">
                          Advances
                        </span>
                      ) : (
                        <span className="text-xs bg-red-900/20 text-red-400 px-2 py-0.5 rounded-full font-medium">
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
        <p className="text-center text-white/30 text-xs mt-4">
          {ranking.length}/12 groups completed — finish all groups to see the full ranking
        </p>
      )}
    </div>
  );
}
