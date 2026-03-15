'use client';

import { useState, useMemo } from 'react';
import { LeaderboardPrediction, LiveMatch } from '@/types';
import { teamsByCode } from '@/data/teams';
import { allGroupMatches } from '@/data/matches';
import GroupMatchCard from './GroupMatchCard';
import BracketView from './BracketView';

interface Props {
  prediction: LeaderboardPrediction;
  onClose: () => void;
  liveMatches?: Record<string, LiveMatch>;
  teamFlagsByCode?: Record<string, string>;
}

type Tab = 'groups' | 'bracket';

export default function UserPredictionsModal({ prediction, onClose, liveMatches, teamFlagsByCode }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('groups');

  const championTeam = prediction.champion_code ? teamsByCode[prediction.champion_code] : null;
  const championFlagUrl = prediction.champion_code && teamFlagsByCode ? teamFlagsByCode[prediction.champion_code] : undefined;

  const matchesByDate = useMemo(() => {
    const sorted = [...allGroupMatches].sort((a, b) => {
      const dateA = liveMatches?.[a.id]?.utcDate ?? '';
      const dateB = liveMatches?.[b.id]?.utcDate ?? '';
      if (dateA && dateB) return dateA.localeCompare(dateB);
      // Fallback: keep static order when no live data
      return 0;
    });

    const sections: { label: string; matches: typeof sorted }[] = [];
    for (const match of sorted) {
      const utc = liveMatches?.[match.id]?.utcDate;
      const label = utc
        ? new Date(utc).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
        : 'Schedule TBD';
      const last = sections[sections.length - 1];
      if (last && last.label === label) {
        last.matches.push(match);
      } else {
        sections.push({ label, matches: [match] });
      }
    }
    return sections;
  }, [liveMatches]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-background-dark w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-neutral-900 px-6 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-black text-white">{prediction.display_name}&apos;s Predictions</h2>
            {championTeam && (
              <div className="flex items-center gap-1.5 mt-1 text-sm font-semibold text-neutral-500">
                <span className="text-xs font-medium text-neutral-400">Predicted Champion:</span>
                <div className="flex items-center gap-1 text-primary">
                  {championFlagUrl ? (
                    <img src={championFlagUrl} alt="" className="w-4 h-3 object-cover rounded-[2px]" />
                  ) : (
                    <span>{championTeam.flag}</span>
                  )}
                  <span className="font-body">{championTeam.name}</span>
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-neutral-400 hover:bg-white/15 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className={`bg-neutral-900 px-6 flex-shrink-0 flex gap-6 ${activeTab === 'groups' ? 'border-b border-white/10' : ''}`}>
          <button
            onClick={() => setActiveTab('groups')}
            className={`py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'groups' ? 'border-primary text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Group Stage
          </button>
          <button
            onClick={() => setActiveTab('bracket')}
            className={`py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'bracket' ? 'border-primary text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Knockout Bracket
          </button>
        </div>

        {/* Content */}
        <div className={`flex-grow overflow-y-auto ${activeTab === 'groups' ? 'p-6 pb-24' : 'pb-24'}`}>
          {activeTab === 'groups' ? (
            <div className="space-y-5 max-w-2xl mx-auto">
              {matchesByDate.map(section => (
                <div key={section.label}>
                  <div className="sticky top-0 z-10 bg-background-dark/90 backdrop-blur-sm py-2 mb-2">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{section.label}</span>
                  </div>
                  <div className="bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden">
                    {section.matches.map(match => (
                      <GroupMatchCard
                        key={match.id}
                        matchId={match.id}
                        homeCode={match.home}
                        awayCode={match.away}
                        result={prediction.group_matches[match.id]}
                        onPredict={() => {}}
                        liveMatch={liveMatches?.[match.id]}
                        teamFlagsByCode={teamFlagsByCode}
                        readOnly={true}
                        groupLabel={match.group}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <BracketView
              groupPredictions={prediction.group_matches}
              knockoutPredictions={prediction.knockout_matches}
              thirdPlaceTiebreaker={prediction.third_place_tiebreaker ?? undefined}
              onPredict={() => {}}
              liveMatches={liveMatches}
              teamFlagsByCode={teamFlagsByCode}
              readOnly={true}
            />
          )}
        </div>
      </div>
      
      {/* Backdrop click handler */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
