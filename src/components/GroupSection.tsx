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
  const predictedCount = matches.filter(m => predictions[m.id] !== undefined).length;

  return (
    <div className="">
      <h3 className="text-xl font-black mb-4 border-l-4 border-primary pl-3">Group {group}</h3>

      {/* Matches */}
      <div className="mb-6">
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
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-lg font-bold">Group {group} Standings</h3>
            <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded">Live Projection</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-1">
            <StandingsTable standings={standings} />
          </div>
          <p className="mt-4 text-[10px] text-center text-slate-400 uppercase tracking-widest font-bold">Top 2 advance + 8 best 3rd places</p>
        </div>
      )}
    </div>
  );
}
