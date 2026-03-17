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
  apiGroupMatches?: LiveMatch[];
  teamFlagsByCode?: Record<string, string>;
  readOnly?: boolean;
}

export default function GroupSection({ group, predictions, onPredict, onStandings, liveMatches, apiGroupMatches, teamFlagsByCode, readOnly = false }: Props) {
  const staticMatches = getGroupMatches(group);

  // When API data is available, derive ordered match list from it using localMatchId to look up static data
  const matches = apiGroupMatches && apiGroupMatches.length > 0
    ? apiGroupMatches
        .filter(m => m.localMatchId !== null)
        .map(m => staticMatches.find(s => s.id === m.localMatchId))
        .filter((m): m is NonNullable<typeof m> => m !== undefined)
    : staticMatches;

  // Fall back to static if API yielded no usable matches (e.g. all localMatchIds null)
  const displayMatches = matches.length > 0 ? matches : staticMatches;

  // Sort by start date when live data is available
  const sortedMatches = liveMatches
    ? [...displayMatches].sort((a, b) => {
        const dateA = liveMatches[a.id]?.utcDate ?? '';
        const dateB = liveMatches[b.id]?.utcDate ?? '';
        return dateA.localeCompare(dateB);
      })
    : displayMatches;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-black uppercase border-l-4 border-primary pl-3">Group {group}</h3>
        {onStandings && (
          <button
            onClick={() => onStandings(group)}
            className="text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-primary transition-colors"
          >
            Standings
          </button>
        )}
      </div>

      <div className="flex flex-col bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden">
        {sortedMatches.map(match => (
          <GroupMatchCard
            key={match.id}
            matchId={match.id}
            homeCode={match.home}
            awayCode={match.away}
            result={predictions[match.id]}
            onPredict={onPredict}
            liveMatch={liveMatches?.[match.id]}
            teamFlagsByCode={teamFlagsByCode}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}
