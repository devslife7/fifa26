'use client';

import { useState, useEffect, useCallback } from 'react';
import { TabId, MatchResult, KnockoutResult, GroupLetter } from '@/types';
import { groups } from '@/data/teams';
import { allGroupMatches } from '@/data/matches';
import { areAllGroupsComplete } from '@/lib/standings';
import { loadPredictions, savePredictions, clearKnockoutDownstream } from '@/lib/storage';
import GroupSection from '@/components/GroupSection';
import ThirdPlaceTable from '@/components/ThirdPlaceTable';
import BracketView from '@/components/BracketView';
import ChampionScreen from '@/components/ChampionScreen';
import ProgressBar from '@/components/ProgressBar';
import BottomNav from '@/components/BottomNav';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('groups');
  const [groupPredictions, setGroupPredictions] = useState<Record<string, MatchResult>>({});
  const [knockoutPredictions, setKnockoutPredictions] = useState<Record<string, KnockoutResult>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = loadPredictions();
    setGroupPredictions(saved.groupMatches);
    setKnockoutPredictions(saved.knockoutMatches);
    setMounted(true);
  }, []);

  const handleGroupPredict = useCallback((matchId: string, result: MatchResult) => {
    setGroupPredictions(prev => {
      const next = { ...prev, [matchId]: result };
      // Save
      const predictions = loadPredictions();
      predictions.groupMatches = next;
      // When a group prediction changes, clear all knockout predictions
      // as the bracket teams may have changed
      predictions.knockoutMatches = {};
      savePredictions(predictions);
      setKnockoutPredictions({});
      return next;
    });
  }, []);

  const handleKnockoutPredict = useCallback((matchId: string, result: KnockoutResult) => {
    setKnockoutPredictions(prev => {
      const next = { ...prev, [matchId]: result };
      // Clear downstream
      clearKnockoutDownstream(matchId);
      // Remove downstream from state too
      const roundOrder = ['R32', 'R16', 'QF', 'SF', '3RD', 'F'];
      const [round] = matchId.split('-');
      const roundIdx = roundOrder.indexOf(round);
      const cleaned = { ...next };
      for (let i = roundIdx + 1; i < roundOrder.length; i++) {
        Object.keys(cleaned).forEach(key => {
          if (key.startsWith(roundOrder[i])) {
            delete cleaned[key];
          }
        });
      }
      const predictions = loadPredictions();
      predictions.knockoutMatches = cleaned;
      savePredictions(predictions);
      return cleaned;
    });
  }, []);

  const groupCount = Object.keys(groupPredictions).length;
  const knockoutCount = Object.keys(knockoutPredictions).length;
  const groupsComplete = areAllGroupsComplete(groupPredictions);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-trophy-glow">🏆</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <h1 className="text-lg font-black tracking-tight">
                <span className="text-gold">FIFA</span> World Cup 2026
              </h1>
              <p className="text-[10px] text-white/30 uppercase tracking-[0.15em]">
                Prediction Challenge
              </p>
            </div>
          </div>
        </div>
        <ProgressBar groupCount={groupCount} knockoutCount={knockoutCount} />
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'groups' && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">
                <span className="text-gold">Group Stage</span>
              </h2>
              <p className="text-white/40 text-sm">
                Predict all 48 matches across 12 groups
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {groups.map(group => (
                <GroupSection
                  key={group}
                  group={group}
                  predictions={groupPredictions}
                  onPredict={handleGroupPredict}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'third-place' && (
          <ThirdPlaceTable predictions={groupPredictions} />
        )}

        {activeTab === 'bracket' && (
          <BracketView
            groupPredictions={groupPredictions}
            knockoutPredictions={knockoutPredictions}
            onPredict={handleKnockoutPredict}
          />
        )}

        {activeTab === 'champion' && (
          <ChampionScreen
            groupPredictions={groupPredictions}
            knockoutPredictions={knockoutPredictions}
          />
        )}
      </main>

      {/* Bottom Nav */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        groupsComplete={groupsComplete}
      />
    </div>
  );
}
