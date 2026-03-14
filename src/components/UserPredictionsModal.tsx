'use client';

import { useState } from 'react';
import { LeaderboardPrediction, LiveMatch } from '@/types';
import { groups, teamsByCode } from '@/data/teams';
import GroupSection from './GroupSection';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-background-light w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-neutral-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-black text-neutral-800">{prediction.display_name}&apos;s Predictions</h2>
            {championTeam && (
              <div className="flex items-center gap-1.5 mt-1 text-sm font-semibold text-neutral-500">
                <span className="text-xs font-medium text-neutral-400">Predicted Champion:</span>
                <div className="flex items-center gap-1 text-primary">
                  {championFlagUrl ? (
                    <img src={championFlagUrl} alt="" className="w-4 h-3 object-cover rounded-[2px]" />
                  ) : (
                    <span>{championTeam.flag}</span>
                  )}
                  {championTeam.name}
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white px-6 border-b border-neutral-200 flex-shrink-0 flex gap-6">
          <button
            onClick={() => setActiveTab('groups')}
            className={`py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'groups' ? 'border-primary text-neutral-800' : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            Group Stage
          </button>
          <button
            onClick={() => setActiveTab('bracket')}
            className={`py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'bracket' ? 'border-primary text-neutral-800' : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            Knockout Bracket
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6">
          {activeTab === 'groups' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {groups.map(g => (
                <GroupSection
                  key={g}
                  group={g}
                  predictions={prediction.group_matches}
                  onPredict={() => {}}
                  liveMatches={liveMatches}
                  teamFlagsByCode={teamFlagsByCode}
                  readOnly={true}
                />
              ))}
            </div>
          ) : (
            <div className="-mx-6 -my-6">
              <BracketView
                groupPredictions={prediction.group_matches}
                knockoutPredictions={prediction.knockout_matches}
                onPredict={() => {}}
                liveMatches={liveMatches}
                teamFlagsByCode={teamFlagsByCode}
                readOnly={true}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Backdrop click handler */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
