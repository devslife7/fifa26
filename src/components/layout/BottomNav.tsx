'use client';

import { TabId } from '@/types';

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const PREDICTION_TABS: TabId[] = ['groups', 'bracket', 'thirdplace'];

const navItems = [
  { label: 'Home', icon: 'home', navigateTo: 'home' as TabId, activeTabs: ['home'] as TabId[] },
  { label: 'Predictions', icon: 'sports_soccer', navigateTo: 'groups' as TabId, activeTabs: PREDICTION_TABS },
  { label: 'Ranking', icon: 'leaderboard', navigateTo: 'ranking' as TabId, activeTabs: ['ranking'] as TabId[] },
  { label: 'News', icon: 'newspaper', navigateTo: 'news' as TabId, activeTabs: ['news'] as TabId[] },
];

export default function BottomNav({ activeTab, onTabChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background-dark border-t border-white/10">
      <div className="flex items-center pt-2 pb-nav-safe">
        {navItems.map(item => {
          const isActive = item.activeTabs.includes(activeTab);

          return (
            <button
              key={item.label}
              onClick={() => onTabChange(item.navigateTo)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] transition-colors relative ${isActive
                  ? 'text-primary'
                  : 'text-neutral-400 hover:text-primary'
                }`}
            >
              <span className={`material-symbols-outlined text-2xl transition-transform ${isActive ? 'font-variation-fill scale-110' : ''}`}>
                {item.icon}
              </span>
              {isActive
                ? <span className="text-[11px] font-bold uppercase tracking-tighter font-body">{item.label}</span>
                : <span className="text-[10px] font-bold uppercase tracking-tighter font-body">{item.label}</span>
              }
            </button>
          );
        })}
      </div>
    </nav>
  );
}
