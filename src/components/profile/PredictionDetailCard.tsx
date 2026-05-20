'use client';

import { useMemo } from 'react';
import { SavedPrediction, GroupLetter, KnockoutRound } from '@/types';
import { teamsByCode, groups } from '@/data/teams';
import { getGroupQualifiers, isGroupComplete } from '@/lib/logic/standings';
import { generateBracket } from '@/lib/logic/bracket';

interface Props {
  prediction: SavedPrediction;
  darkMode: boolean;
}

export default function PredictionDetailCard({ prediction: p, darkMode: d }: Props) {
  const groupPredictions = p.group_matches ?? {};
  const knockoutPredictions = p.knockout_matches ?? {};
  const groupTiebreakers = p.group_tiebreakers ?? {};

  const qualifiers = useMemo(
    () => getGroupQualifiers(groupPredictions, groupTiebreakers),
    [groupPredictions, groupTiebreakers]
  );

  const bracket = useMemo(
    () => generateBracket(groupPredictions, knockoutPredictions, p.third_place_tiebreaker ?? undefined, groupTiebreakers),
    [groupPredictions, knockoutPredictions, p.third_place_tiebreaker, groupTiebreakers]
  );

  const completedGroups = useMemo(
    () => groups.filter(g => isGroupComplete(g, groupPredictions)).length,
    [groupPredictions]
  );

  const knockoutStats = useMemo(() => {
    const rounds: KnockoutRound[] = ['R32', 'R16', 'QF', 'SF', '3RD', 'FIN'];
    const total: Record<string, number> = { R32: 16, R16: 8, QF: 4, SF: 2, '3RD': 1, FIN: 1 };
    const filled: Record<string, number> = {};
    let totalFilled = 0;
    for (const r of rounds) {
      filled[r] = bracket.filter(m => m.round === r && m.result).length;
      totalFilled += filled[r];
    }
    return { filled, total, totalFilled, totalMatches: 32 };
  }, [bracket]);

  const sf = bracket.filter(m => m.round === 'SF');
  const fin = bracket.find(m => m.round === 'FIN');

  const teamFlag = (code: string | undefined) => {
    if (!code) return '?';
    const t = teamsByCode[code];
    return t ? t.flag : '?';
  };

  const teamLabel = (code: string | undefined) => {
    if (!code) return null;
    const t = teamsByCode[code];
    if (!t) return null;
    return { flag: t.flag, code: t.code, name: t.name };
  };

  const groupCount = Object.keys(groupPredictions).length;
  const knockoutCount = Object.keys(knockoutPredictions).length;

  return (
    <div className={`mx-4 mb-2 rounded-xl border ${d ? 'bg-white/[0.03] border-white/10' : 'bg-neutral-50/80 border-neutral-100'}`}>
      {/* Group Stage Grid */}
      <div className="p-3 pb-2">
        <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${d ? 'text-white/30' : 'text-neutral-400'}`}>
          Groups
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
          {groups.map(g => {
            const complete = isGroupComplete(g, groupPredictions);
            const winner = qualifiers.winners[g];
            const runner = qualifiers.runnersUp[g];
            return (
              <div
                key={g}
                className={`rounded-lg px-1.5 py-1 text-center ${
                  complete
                    ? d ? 'bg-white/5' : 'bg-white'
                    : d ? 'bg-white/[0.02]' : 'bg-neutral-100/50'
                }`}
              >
                <span className={`text-[9px] font-bold block ${d ? 'text-white/25' : 'text-neutral-300'}`}>
                  {g}
                </span>
                <div className="flex items-center justify-center gap-0.5 mt-0.5">
                  <span className="text-sm leading-none">{teamFlag(winner)}</span>
                  <span className="text-sm leading-none">{teamFlag(runner)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Knockout Summary */}
      {(sf.some(m => m.home || m.away) || fin?.home || fin?.away) && (
        <div className={`px-3 pb-2 pt-1 border-t ${d ? 'border-white/5' : 'border-neutral-100'}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${d ? 'text-white/30' : 'text-neutral-400'}`}>
            Knockout
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {/* Semifinals */}
            {sf.map((m, i) => {
              const home = teamLabel(m.home);
              const away = teamLabel(m.away);
              if (!home && !away) return null;
              return (
                <div key={m.id} className="flex items-center gap-1">
                  <span className={`text-[9px] font-bold ${d ? 'text-white/20' : 'text-neutral-300'}`}>SF{i + 1}</span>
                  <span className="text-xs leading-none">{home?.flag ?? '?'}</span>
                  <span className={`text-[10px] ${d ? 'text-white/15' : 'text-neutral-300'}`}>v</span>
                  <span className="text-xs leading-none">{away?.flag ?? '?'}</span>
                </div>
              );
            })}
            {/* Final */}
            {fin && (fin.home || fin.away) && (
              <div className="flex items-center gap-1">
                <span className={`text-[9px] font-bold ${d ? 'text-primary/60' : 'text-primary/70'}`}>FIN</span>
                <span className="text-xs leading-none">{teamFlag(fin.home)}</span>
                <span className={`text-[10px] ${d ? 'text-white/15' : 'text-neutral-300'}`}>v</span>
                <span className="text-xs leading-none">{teamFlag(fin.away)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Completion Stats */}
      <div className={`px-3 py-1.5 border-t ${d ? 'border-white/5' : 'border-neutral-100'}`}>
        <p className={`text-[10px] ${d ? 'text-white/20' : 'text-neutral-400'}`}>
          {completedGroups}/12 groups · {knockoutCount}/32 knockout
        </p>
      </div>
    </div>
  );
}
