'use client';

import { MatchResult } from '@/types';
import { getThirdPlaceRanking, detectThirdPlaceTie, ThirdPlaceEntry } from '@/lib/standings';
import { teamsByCode } from '@/data/teams';

interface Props {
  predictions: Record<string, MatchResult>;
  tiebreakerPicks: string[];
  onTiebreakerChange: (picks: string[]) => void;
}

export default function ThirdPlaceTable({ predictions, tiebreakerPicks, onTiebreakerChange }: Props) {
  const ranking = getThirdPlaceRanking(predictions);
  const tieInfo = detectThirdPlaceTie(predictions);
  const hasTie = tieInfo.slotsToFill > 0;

  const tiedTeamCodes = new Set(tieInfo.tied.map(e => e.team));
  const lockedInCodes = new Set(tieInfo.lockedIn.map(e => e.team));

  const handleToggle = (teamCode: string) => {
    const current = new Set(tiebreakerPicks);
    if (current.has(teamCode)) {
      current.delete(teamCode);
    } else if (current.size < tieInfo.slotsToFill) {
      current.add(teamCode);
    }
    onTiebreakerChange(Array.from(current));
  };

  const getStatus = (entry: ThirdPlaceEntry) => {
    if (lockedInCodes.has(entry.team)) {
      return 'advances';
    }
    if (tiedTeamCodes.has(entry.team)) {
      return 'tied';
    }
    return 'eliminated';
  };

  // Build display order: lockedIn, then tied, then eliminated
  const displayOrder = hasTie
    ? [...tieInfo.lockedIn, ...tieInfo.tied, ...tieInfo.eliminated]
    : ranking;

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
        <>
          {hasTie && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-center">
              <p className="text-sm font-bold text-amber-700">
                Tiebreaker: Select {tieInfo.slotsToFill} of {tieInfo.tied.length} teams
              </p>
              <p className="text-xs text-amber-600 mt-1">
                These teams are tied on {tieInfo.tied[0]?.standing.points} points. Pick which ones advance.
              </p>
            </div>
          )}

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
                {displayOrder.map((entry, i) => {
                  const team = teamsByCode[entry.team];
                  if (!team) return null;
                  const status = getStatus(entry);
                  const isSelected = tiebreakerPicks.includes(entry.team);

                  return (
                    <tr
                      key={entry.team}
                      className={
                        status === 'advances' ? 'bg-primary/5' :
                        status === 'tied' && isSelected ? 'bg-primary/5' :
                        status === 'tied' ? 'bg-amber-50/50' :
                        ''
                      }
                      onClick={status === 'tied' ? () => handleToggle(entry.team) : undefined}
                      style={status === 'tied' ? { cursor: 'pointer' } : undefined}
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
                        {status === 'advances' && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                            Advances
                          </span>
                        )}
                        {status === 'tied' && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                            isSelected
                              ? 'bg-primary/20 text-primary'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {isSelected ? 'Selected' : 'Tap to pick'}
                          </span>
                        )}
                        {status === 'eliminated' && (
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
        </>
      )}

      {ranking.length > 0 && ranking.length < 12 && (
        <p className="text-center text-slate-400 text-[10px] mt-4 uppercase tracking-widest font-bold">
          {ranking.length}/12 groups completed — finish all groups to see the full ranking
        </p>
      )}
    </div>
  );
}
