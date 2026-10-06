'use client';

import type { TabId, LiveMatch } from '@/types';
import SignedOutHero from '@/components/home/SignedOutHero';
import KnockoutScoringCard from '@/components/home/KnockoutScoringCard';
import AppFooter from '@/components/layout/AppFooter';

interface HomeViewProps {
  liveMatches: Record<string, LiveMatch>;
  onNavigate: (tab: TabId) => void;
}

export default function HomeView({ onNavigate }: HomeViewProps) {
  return (
    <div className="home-view flex flex-col gap-3 pb-8 pt-0">
      <SignedOutHero onExplore={() => onNavigate('groups')} />
      <KnockoutScoringCard />
      <AppFooter />
    </div>
  );
}
