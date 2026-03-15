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
];

export default function BottomNav({ activeTab, onTabChange, groupsComplete }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background-dark border-t border-white/10">
      <div className="flex items-center pt-2 pb-nav-safe">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const isLocked = !groupsComplete && (tab.id === 'bracket');

          return (
            <button
              key={tab.id}
              onClick={() => !isLocked && onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] transition-colors relative ${isActive
                  ? 'text-primary'
                  : isLocked
                    ? 'text-neutral-400/30 cursor-not-allowed'
                    : 'text-neutral-400 hover:text-primary'
                }`}
            >
              <span className={`material-symbols-outlined text-2xl transition-transform ${isActive ? 'font-variation-fill scale-110' : ''}`}>
                {isLocked ? 'lock' : tab.icon}
              </span>
              {isActive
                ? <span className="text-[11px] font-bold uppercase tracking-tighter font-body">{tab.label}</span>
                : <span className="text-[10px] font-bold uppercase tracking-tighter font-body">{tab.label}</span>
              }
            </button>
          );
        })}
      </div>
    </nav>
  );
}
