'use client';

import { useState, useEffect, useCallback } from 'react';
import { TabId, MatchResult, KnockoutResult } from '@/types';
import { groups } from '@/data/teams';
import { areAllGroupsComplete } from '@/lib/standings';
import { loadPredictions, savePredictions, clearKnockoutDownstream } from '@/lib/storage';
import { useAuth } from '@/components/providers/AuthProvider';
import GroupSection from '@/components/GroupSection';
import ThirdPlaceTable from '@/components/ThirdPlaceTable';
import BracketView from '@/components/BracketView';
import ChampionScreen from '@/components/ChampionScreen';
import ProgressBar from '@/components/ProgressBar';
import BottomNav from '@/components/BottomNav';
import RankingView from '@/components/RankingView';

export default function Home() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('groups');

  const [groupPredictions, setGroupPredictions] = useState<Record<string, MatchResult>>({});
  const [knockoutPredictions, setKnockoutPredictions] = useState<Record<string, KnockoutResult>>({});
  const [mounted, setMounted] = useState(false);

  // Load local predictions on mount
  useEffect(() => {
    const saved = loadPredictions();
    setGroupPredictions(saved.groupMatches);
    setKnockoutPredictions(saved.knockoutMatches);
    setMounted(true);
  }, []);

  // Sync server predictions on auth (hydrate localStorage if local is empty)
  useEffect(() => {
    if (!user || !mounted) return;

    const local = loadPredictions();
    const hasLocal = Object.keys(local.groupMatches).length > 0;

    if (!hasLocal) {
      fetch('/api/predictions')
        .then(res => res.json())
        .then(data => {
          if (data.predictions) {
            const serverPreds = data.predictions;
            const hydrated = {
              groupMatches: serverPreds.group_matches ?? {},
              knockoutMatches: serverPreds.knockout_matches ?? {},
            };
            savePredictions(hydrated);
            setGroupPredictions(hydrated.groupMatches);
            setKnockoutPredictions(hydrated.knockoutMatches);
          }
        })
        .catch(() => {});
    }
  }, [user, mounted]);

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
      <main className={`mx-auto pb-8 ${activeTab === 'bracket' ? 'max-w-full' : 'max-w-md px-4'}`}>
        {activeTab === 'groups' && (
          <div>
            <ProgressBar groupCount={groupCount} knockoutCount={knockoutCount} />

            <div className="mt-6 space-y-10">
              {groups.map(g => (
                <GroupSection
                  key={g}
                  group={g}
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

        {activeTab === 'ranking' && (
          <RankingView />
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
