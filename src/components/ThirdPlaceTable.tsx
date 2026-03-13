'use client';

import { MatchResult } from '@/types';
import { getThirdPlaceRanking, detectThirdPlaceTie, ThirdPlaceEntry } from '@/lib/standings';
import { teamsByCode } from '@/data/teams';

interface Props {
  predictions: Record<string, MatchResult>;
  tiebreakerPicks: string[];
  onTiebreakerChange: (picks: string[]) => void;
  teamFlagsByCode?: Record<string, string>;
}

export default function ThirdPlaceTable({ predictions, tiebreakerPicks, onTiebreakerChange, teamFlagsByCode }: Props) {
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
    <div className="mt-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Third-Place Teams</h2>
          <p className="text-slate-500 text-sm mt-1">
            Top 8 of 12 third-place teams advance to the Round of 32
          </p>
        </div>
      </div>

      {ranking.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="text-4xl mb-4 opacity-50">📋</div>
          <p className="text-slate-500 font-medium">
            Complete group stage predictions to see the third-place ranking
          </p>
        </div>
      ) : (
        <>
          {hasTie && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-4 text-center shadow-sm">
              <p className="text-sm font-bold text-white">
                Tiebreaker: Select {tieInfo.slotsToFill} of {tieInfo.tied.length} teams
              </p>
              <p className="text-xs text-slate-400 mt-1">
                These teams are tied on {tieInfo.tied[0]?.standing.points} points. Pick which ones advance.
              </p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="text-center py-3 px-1 sm:py-4 sm:px-3 w-8 sm:w-12 text-xs sm:text-sm">#</th>
                  <th className="text-left py-3 px-2 sm:py-4 sm:px-2 text-xs sm:text-sm">Team</th>
                  <th className="text-center py-3 px-1 sm:py-4 sm:px-3 w-12 sm:w-20 text-xs sm:text-sm">Group</th>
                  <th className="text-center py-3 px-1 sm:py-4 sm:px-3 w-10 sm:w-16 text-xs sm:text-sm">Pts</th>
                  <th className="text-center py-3 px-2 sm:py-4 sm:px-4 w-24 sm:w-32 text-xs sm:text-sm">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayOrder.map((entry, i) => {
                  const team = teamsByCode[entry.team];
                  if (!team) return null;
                  const status = getStatus(entry);
                  const isSelected = tiebreakerPicks.includes(entry.team);
                  const isTied = status === 'tied';
                  const isAdvances = status === 'advances';
                  const isEliminated = status === 'eliminated';

                  return (
                    <tr
                      key={entry.team}
                      className={`
                        transition-all duration-200 relative
                        ${isAdvances ? 'bg-emerald-50/30' : ''}
                        ${isTied && isSelected ? 'bg-slate-100/80 shadow-[inset_4px_0_0_0_#0f172a]' : ''}
                        ${isTied && !isSelected ? 'hover:bg-slate-50 cursor-pointer' : ''}
                        ${isEliminated ? 'opacity-75' : ''}
                      `}
                      onClick={isTied ? () => handleToggle(entry.team) : undefined}
                    >
                      <td className={`py-3 px-1 sm:py-4 sm:px-3 text-center font-bold text-xs sm:text-sm ${isTied && isSelected ? 'text-slate-900' : 'text-slate-400'}`}>{i + 1}</td>
                      <td className="py-3 px-2 sm:py-4 sm:px-2">
                        <div className="flex items-center gap-2 sm:gap-3">
                          {teamFlagsByCode?.[entry.team] ? (
                            <span className="flex-shrink-0 inline-flex">
                              <img
                                src={teamFlagsByCode[entry.team]}
                                alt=""
                                className="w-5 h-3.5 sm:w-7 sm:h-5 object-cover rounded-sm"
                                onError={e => {
                                  e.currentTarget.style.display = 'none';
                                  (e.currentTarget.nextSibling as HTMLElement | null)?.removeAttribute('hidden');
                                }}
                              />
                              <span className="text-lg sm:text-xl leading-none" hidden>{team.flag}</span>
                            </span>
                          ) : (
                            <span className="text-lg sm:text-xl leading-none">{team.flag}</span>
                          )}
                          <span className={`font-bold text-xs sm:text-sm leading-tight ${isEliminated ? 'text-slate-500' : 'text-slate-900'}`}>
                            {team.name}
                          </span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-1 sm:py-4 sm:px-3">
                        <span className="bg-slate-100 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold text-slate-600">
                          {entry.group}
                        </span>
                      </td>
                      <td className="text-center py-3 px-1 sm:py-4 sm:px-3 font-black text-slate-900 text-sm sm:text-base">
                        {entry.standing.points}
                      </td>
                      <td className="text-center py-3 px-2 sm:py-4 sm:px-4">
                        {isAdvances && (
                          <span className="inline-flex items-center justify-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-700 w-full">
                            Advances
                          </span>
                        )}
                        {isTied && (
                          <button 
                            className={`w-full text-[10px] sm:text-xs px-2 py-1 sm:px-3 sm:py-1.5 rounded-full font-bold transition-all duration-200 border ${
                              isSelected
                                ? 'bg-black text-white border-black shadow-md scale-105'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-black hover:text-black'
                            }`}
                          >
                            {isSelected ? '✓ Picked' : 'Tap to pick'}
                          </button>
                        )}
                        {isEliminated && (
                          <span className="inline-flex items-center justify-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-red-50 text-red-500 w-full">
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
        <div className="mt-6 flex items-center justify-center gap-2 text-slate-400">
          <div className="h-px bg-slate-200 flex-1 max-w-[100px]"></div>
          <p className="text-[10px] uppercase tracking-widest font-bold">
            {ranking.length}/12 groups completed
          </p>
          <div className="h-px bg-slate-200 flex-1 max-w-[100px]"></div>
        </div>
      )}
    </div>
  );
}
