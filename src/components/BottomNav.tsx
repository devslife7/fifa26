'use client';

import { TabId } from '@/types';

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  groupsComplete: boolean;
}

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'groups', label: 'Groups', icon: 'grid_view' },
  { id: 'bracket', label: 'Bracket', icon: 'account_tree' },
  { id: 'profile', label: 'Profile', icon: 'person' },
  { id: 'ranking', label: 'Ranking', icon: 'leaderboard' },
  { id: 'tracking', label: 'Tracking', icon: 'query_stats' },
];

export default function BottomNav({ activeTab, onTabChange, groupsComplete }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background-light border-t border-neutral-200">
      <div className="max-w-2xl mx-auto flex justify-between items-center px-4 pt-3 pb-nav-safe">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const isLocked = !groupsComplete && (tab.id === 'bracket');

          return (
            <button
              key={tab.id}
              onClick={() => !isLocked && onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 transition-colors ${isActive
                  ? 'text-primary'
                  : isLocked
                    ? 'text-neutral-400/30 cursor-not-allowed'
                    : 'text-neutral-400 hover:text-primary'
                }`}
            >
              <span className={`material-symbols-outlined text-2xl ${isActive ? 'font-variation-fill' : ''}`}>
                {isLocked ? 'lock' : tab.icon}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
