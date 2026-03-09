'use client';

import { useState, useEffect, useCallback } from 'react';
import { TabId, MatchResult, KnockoutResult, GroupLetter } from '@/types';
import { groups } from '@/data/teams';
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
  const [activeGroup, setActiveGroup] = useState<GroupLetter>('A');
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
      <main className={`mx-auto pb-8 ${activeTab === 'bracket' ? 'max-w-full px-0' : 'max-w-md px-4'}`}>
        {activeTab === 'groups' && (
          <div>
            <ProgressBar groupCount={groupCount} knockoutCount={knockoutCount} />

            {/* Group Tabs */}
            <div className="flex overflow-x-auto no-scrollbar gap-2 py-6 mt-2 border-b border-slate-200">
              {groups.map(g => (
                <button
                  key={g}
                  className={`px-5 py-2 rounded-full font-semibold text-sm whitespace-nowrap ${activeGroup === g
                    ? 'bg-primary font-bold shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-primary/20'
                    }`}
                  onClick={() => setActiveGroup(g)}
                >
                  Group {g}
                </button>
              ))}
            </div>

            <div className="mt-6">
              <GroupSection
                group={activeGroup}
                predictions={groupPredictions}
                onPredict={handleGroupPredict}
              />
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
