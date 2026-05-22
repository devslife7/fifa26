'use client';

import { MatchResult } from '@/types';
import { getThirdPlaceRanking, detectThirdPlaceTie } from '@/lib/logic/standings';
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
  const selectableTeams = hasTie ? tieInfo.tied : [];
  const selectableTeamCodes = new Set(selectableTeams.map(entry => entry.team));
  const selectedCount = tiebreakerPicks.filter(teamCode => selectableTeamCodes.has(teamCode)).length;
  const remainingCount = Math.max(tieInfo.slotsToFill - selectedCount, 0);
  const tiebreakerComplete = hasTie && selectedCount === tieInfo.slotsToFill;

  const handleToggle = (teamCode: string) => {
    const current = new Set(tiebreakerPicks);
    if (current.has(teamCode)) {
      current.delete(teamCode);
    } else if (current.size < tieInfo.slotsToFill) {
      current.add(teamCode);
    }
    onTiebreakerChange(Array.from(current));
  };

  return (
    <div className="mt-8">
      <div className="mb-5">
        <div>
          <h2 className="text-[26px] font-black leading-tight text-white tracking-tight">
            {hasTie ? 'Resolve Third-Place Cutoff' : 'Third-Place Qualifiers'}
          </h2>
          <p className="text-neutral-500 text-sm mt-1">
            {hasTie
              ? 'These teams are tied on points for the final Round of 32 spots. Pick who advances.'
              : 'Top 8 of 12 third-place teams advance to the Round of 32.'}
          </p>
          {!hasTie && ranking.length === 12 && (
            <p className="text-neutral-600 text-xs mt-2 leading-snug">
              Group ties are resolved automatically using FIFA ranking for a faster prediction flow.
            </p>
          )}
        </div>
      </div>

      {ranking.length === 0 ? (
        <div className="bg-neutral-900 rounded-2xl border border-white/10 p-12 text-center">
          <div className="text-4xl mb-4 opacity-50">📋</div>
          <p className="text-neutral-500 font-medium">
            Complete group stage predictions to see the third-place ranking
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 rounded-2xl border border-white/10 bg-neutral-900 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-neutral-500">Tiebreaker Progress</p>
                <p className="mt-1 text-sm font-bold text-neutral-200">
                  {hasTie
                    ? tiebreakerComplete
                      ? 'Complete. These teams will feed into the Round of 32.'
                      : `${remainingCount} ${remainingCount === 1 ? 'pick' : 'picks'} remaining.`
                    : 'No tiebreaker picks are needed.'}
                </p>
              </div>
              {hasTie && (
                <span className="shrink-0 rounded-2xl bg-primary px-5 py-3 text-[32px] font-black leading-none text-black shadow-[0_0_0_1px_rgba(0,0,0,0.15)_inset]">
                  {selectedCount}/{tieInfo.slotsToFill}
                </span>
              )}
            </div>
          </div>

          {selectableTeams.length > 0 && (
            <div className="bg-neutral-900 rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-white/5 text-neutral-400 font-bold border-b border-white/5">
                  <tr>
                    <th className="text-center py-3 px-0.5 sm:py-4 sm:px-2 w-6 sm:w-10 text-[10px] sm:text-sm">#</th>
                    <th className="text-left py-3 px-1 sm:py-4 sm:px-2 text-[10px] sm:text-sm">Team</th>
                    <th className="text-center py-3 px-0.5 sm:py-4 sm:px-2 w-9 sm:w-14 text-[10px] sm:text-sm">Grp</th>
                    <th className="text-center py-3 px-0.5 sm:py-4 sm:px-2 w-7 sm:w-12 text-[10px] sm:text-sm">Pts</th>
                    <th className="text-center py-3 px-1 sm:py-4 sm:px-2 w-20 sm:w-28 text-[10px] sm:text-sm">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {selectableTeams.map((entry, i) => {
                    const team = teamsByCode[entry.team];
                    if (!team) return null;
                    const isSelected = tiebreakerPicks.includes(entry.team);

                    return (
                      <tr
                        key={entry.team}
                        className={`
                          relative cursor-pointer transition-all duration-200
                          ${isSelected ? 'bg-white/10 shadow-[inset_4px_0_0_0_var(--color-primary)]' : 'hover:bg-white/5'}
                        `}
                        onClick={() => handleToggle(entry.team)}
                      >
                        <td className={`py-3 px-0.5 sm:py-4 sm:px-2 text-center font-bold text-[11px] sm:text-sm ${isSelected ? 'text-white' : 'text-neutral-400'}`}>{i + 1}</td>
                        <td className="py-3 px-1 sm:py-4 sm:px-2 min-w-0">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            {teamFlagsByCode?.[entry.team] ? (
                              <span className="flex-shrink-0 inline-flex">
                                <img
                                  src={teamFlagsByCode[entry.team]}
                                  alt=""
                                  className="w-9 h-6 sm:w-11 sm:h-7 object-cover rounded-sm"
                                  onError={e => {
                                    e.currentTarget.style.display = 'none';
                                    (e.currentTarget.nextSibling as HTMLElement | null)?.removeAttribute('hidden');
                                  }}
                                />
                                <span className="text-3xl sm:text-4xl leading-none" hidden>{team.flag}</span>
                              </span>
                            ) : (
                              <span className="text-3xl sm:text-4xl leading-none flex-shrink-0">{team.flag}</span>
                            )}
                            <span className="font-body font-semibold text-[13px] sm:text-[15px] leading-tight truncate min-w-0 text-white">
                              {team.name}
                            </span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-0.5 sm:py-4 sm:px-2">
                          <span className="bg-white/10 px-1 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold text-neutral-300">
                            {entry.group}
                          </span>
                        </td>
                        <td className="text-center py-3 px-0.5 sm:py-4 sm:px-2 font-black text-white text-[13px] sm:text-base">
                          {entry.standing.points}
                        </td>
                        <td className="text-center py-3 px-1 sm:py-4 sm:px-2">
                          <button
                            className={`inline-flex h-8 w-[58px] items-center justify-center rounded-md px-1 text-center text-[9px] font-black uppercase leading-[10px] tracking-wider transition-colors duration-200 sm:w-[68px] ${
                              isSelected
                                ? 'bg-primary text-black'
                                : 'bg-white/10 text-neutral-300 hover:bg-primary/15 hover:text-primary'
                            }`}
                          >
                            {isSelected ? '✓ Picked' : 'Tap to pick'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {ranking.length > 0 && ranking.length < 12 && (
        <div className="mt-6 flex items-center justify-center gap-2 text-neutral-400">
          <div className="h-px bg-white/10 flex-1 max-w-[100px]"></div>
          <p className="text-[10px] uppercase tracking-widest font-bold">
            {ranking.length}/12 groups completed
          </p>
          <div className="h-px bg-white/10 flex-1 max-w-[100px]"></div>
        </div>
      )}
    </div>
  );
}
