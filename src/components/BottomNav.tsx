'use client';

import { TabId } from '@/types';

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  groupsComplete: boolean;
}

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'groups', label: 'Groups', icon: '⚽' },
  { id: 'third-place', label: '3rd Place', icon: '📊' },
  { id: 'bracket', label: 'Bracket', icon: '🏟️' },
  { id: 'champion', label: 'Champion', icon: '🏆' },
];

export default function BottomNav({ activeTab, onTabChange, groupsComplete }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-light/95 backdrop-blur-lg border-t border-border z-50">
      <div className="max-w-7xl mx-auto flex">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const isLocked = !groupsComplete && (tab.id === 'bracket');

          return (
            <button
              key={tab.id}
              onClick={() => !isLocked && onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 transition-colors cursor-pointer ${
                isActive
                  ? 'text-gold'
                  : isLocked
                    ? 'text-white/15 cursor-not-allowed'
                    : 'text-white/40 hover:text-white/60'
              }`}
            >
              <span className="text-lg">{isLocked ? '🔒' : tab.icon}</span>
              <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
