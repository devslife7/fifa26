'use client';

import { useState } from 'react';
import { MatchResult, KnockoutResult, GroupTiebreakers } from '@/types';
import { groups, teamsByCode } from '@/data/teams';
import GroupSection from '@/components/groups/GroupSection';
import BracketView from '@/components/bracket/BracketView';

interface Props {
  displayName: string;
  championCode: string | null;
  groupMatches: Record<string, MatchResult>;
  knockoutMatches: Record<string, KnockoutResult>;
  groupTiebreakers?: GroupTiebreakers;
  thirdPlaceTiebreaker?: string[];
}

type Tab = 'groups' | 'bracket';

export default function SharedPredictionView({
  displayName, championCode, groupMatches, knockoutMatches, groupTiebreakers = {}, thirdPlaceTiebreaker,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('groups');
  const champion = championCode ? teamsByCode[championCode] : null;

  return (
    <div className="min-h-screen bg-background-dark font-display text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <img src="/images/fifa_logo.svg" alt="FIFA World Cup 2026" className="w-14 h-14 mb-4 mx-auto" />
          <h1 className="text-2xl font-black mb-1">{displayName}&apos;s Predictions</h1>
          <p className="text-neutral-400 text-sm">FIFA World Cup 2026</p>
        </div>

        {/* Champion */}
        {champion && (
          <div className="bg-neutral-900 rounded-2xl border border-primary/20 p-6 text-center mb-6">
            <p className="text-neutral-400 text-xs uppercase tracking-widest mb-2">Predicted Champion</p>
            <div className="text-5xl mb-2">{champion.flag}</div>
            <p className="text-2xl font-black text-primary font-body">{champion.name}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-6 border-b border-white/10 mb-0">
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
        <div className={activeTab === 'groups' ? 'pt-6 pb-12' : 'pb-12'}>
          {activeTab === 'groups' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {groups.map(g => (
                <GroupSection
                  key={g}
                  group={g}
                  predictions={groupMatches}
                  onPredict={() => {}}
                  readOnly={true}
                />
              ))}
            </div>
          ) : (
            <BracketView
              groupPredictions={groupMatches}
              knockoutPredictions={knockoutMatches}
              groupTiebreakers={groupTiebreakers}
              thirdPlaceTiebreaker={thirdPlaceTiebreaker}
              onPredict={() => {}}
              readOnly={true}
            />
          )}
        </div>

        {/* CTA */}
        <div className="text-center pb-8">
          <a
            href="/"
            className="inline-block bg-primary text-black font-bold px-8 py-3 rounded-xl hover:bg-primary/90 transition-colors"
          >
            Make Your Own Predictions
          </a>
        </div>
      </div>
    </div>
  );
}
