'use client';

import { GroupLetter, MatchResult, LiveMatch } from '@/types';
import { getGroupMatches } from '@/data/matches';
import GroupMatchCard from './GroupMatchCard';

interface Props {
  group: GroupLetter;
  predictions: Record<string, MatchResult>;
  onPredict: (matchId: string, result: MatchResult) => void;
  onStandings?: (group: GroupLetter) => void;
  liveMatches?: Record<string, LiveMatch>;
}

export default function GroupSection({ group, predictions, onPredict, onStandings, liveMatches }: Props) {
  const matches = getGroupMatches(group);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-black uppercase border-l-4 border-primary pl-3">Group {group}</h3>
        {onStandings && (
          <button
            onClick={() => onStandings(group)}
            className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-primary transition-colors"
          >
            Standings
          </button>
        )}
      </div>

      <div className="space-y-2">
        {matches.map(match => (
          <GroupMatchCard
            key={match.id}
            matchId={match.id}
            homeCode={match.home}
            awayCode={match.away}
            result={predictions[match.id]}
            onPredict={onPredict}
            liveMatch={liveMatches?.[match.id]}
          />
        ))}
      </div>
    </div>
  );
}
