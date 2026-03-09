'use client';

import { GroupLetter, MatchResult } from '@/types';
import { getGroupMatches } from '@/data/matches';
import { calculateGroupStandings, isGroupComplete } from '@/lib/standings';
import GroupMatchCard from './GroupMatchCard';
import StandingsTable from './StandingsTable';

interface Props {
  group: GroupLetter;
  predictions: Record<string, MatchResult>;
  onPredict: (matchId: string, result: MatchResult) => void;
}

export default function GroupSection({ group, predictions, onPredict }: Props) {
  const matches = getGroupMatches(group);
  const standings = calculateGroupStandings(group, predictions);
  const complete = isGroupComplete(group, predictions);
  const predictedCount = matches.filter(m => predictions[m.id] !== undefined).length;

  return (
    <div className="bg-surface-light rounded-2xl border border-border overflow-hidden">
      {/* Group header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <h3 className="text-lg font-bold">
          <span className="text-gold">Group {group}</span>
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">{predictedCount}/6</span>
          {complete && (
            <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full font-medium">
              Complete
            </span>
          )}
        </div>
      </div>

      {/* Matches */}
      <div className="p-4 space-y-2">
        {matches.map(match => (
          <GroupMatchCard
            key={match.id}
            matchId={match.id}
            homeCode={match.home}
            awayCode={match.away}
            result={predictions[match.id]}
            onPredict={onPredict}
          />
        ))}
      </div>

      {/* Standings */}
      {predictedCount > 0 && (
        <div className="px-4 pb-4">
          <div className="bg-surface rounded-xl p-3 border border-border/50">
            <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
              Standings
            </h4>
            <StandingsTable standings={standings} />
          </div>
        </div>
      )}
    </div>
  );
}
