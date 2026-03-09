'use client';

import { KnockoutResult } from '@/types';
import { teamsByCode } from '@/data/teams';

interface Props {
  matchId: string;
  homeCode?: string;
  awayCode?: string;
  result?: KnockoutResult;
  onPredict: (matchId: string, result: KnockoutResult) => void;
  compact?: boolean;
}

export default function KnockoutMatchCard({
  matchId,
  homeCode,
  awayCode,
  result,
  onPredict,
  compact = false,
}: Props) {
  const home = homeCode ? teamsByCode[homeCode] : null;
  const away = awayCode ? teamsByCode[awayCode] : null;
  const canPredict = home && away;

  const TeamSlot = ({
    team,
    side,
    isSelected,
  }: {
    team: typeof home;
    side: KnockoutResult;
    isSelected: boolean;
  }) => {
    if (!team) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border/50">
          <span className="text-lg animate-pulse-gold">?</span>
          <span className="text-xs text-white/30 italic">TBD</span>
        </div>
      );
    }

    return (
      <button
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 w-full cursor-pointer ${
          isSelected
            ? 'bg-gold/20 border-gold text-gold shadow-[0_0_12px_rgba(201,168,76,0.3)]'
            : canPredict
              ? 'bg-surface border-border/50 hover:border-white/30 text-white/80'
              : 'bg-surface border-border/50 text-white/40 cursor-default'
        } ${compact ? 'py-1.5' : ''}`}
        onClick={() => canPredict && onPredict(matchId, side)}
        disabled={!canPredict}
      >
        <span className={compact ? 'text-base' : 'text-lg'}>{team.flag}</span>
        <span className={`font-medium truncate ${compact ? 'text-xs' : 'text-sm'}`}>
          {team.name}
        </span>
      </button>
    );
  };

  return (
    <div className={`bg-surface-light rounded-xl border border-border ${compact ? 'p-2' : 'p-3'}`}>
      <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 px-1">
        {matchId}
      </div>
      <div className="space-y-1.5">
        <TeamSlot team={home} side="home" isSelected={result === 'home'} />
        <TeamSlot team={away} side="away" isSelected={result === 'away'} />
      </div>
    </div>
  );
}
