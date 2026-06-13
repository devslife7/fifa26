'use client';

import { TabId, LiveMatch } from '@/types';
import NextMatchCard from '@/components/home/NextMatchCard';
import AppFooter from '@/components/layout/AppFooter';

interface HomeViewProps {
  teamFlagsByCode: Record<string, string>;
  todayMatches: LiveMatch[];
  onNavigate: (tab: TabId) => void;
}

function HomeHeader() {
  return (
    <section className="relative -mx-3 pb-3 sm:-mx-4 md:mx-0">
      <div className="relative mx-auto w-full overflow-hidden shadow-[0_24px_60px_-24px_rgba(0,0,0,0.85)] sm:max-w-[440px] sm:rounded-b-[32px] md:max-w-full">
        <img
          src="/images/promotional-image-hero.png"
          alt="FIFA World Cup 2026"
          className="block w-full object-cover object-[50%_15%] min-h-[260px] [height:calc(100svh-300px)] [max-height:560px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[26%] bg-gradient-to-t from-[#0a0a0a]/80 to-transparent"
        />
      </div>
    </section>
  );
}

export default function HomeView({
  teamFlagsByCode,
  todayMatches,
  onNavigate,
}: HomeViewProps) {
  return (
    <div className="flex flex-col gap-3 pb-8 pt-0">
      <HomeHeader />

      <NextMatchCard
        todayMatches={todayMatches}
        teamFlagsByCode={teamFlagsByCode}
        onNavigate={onNavigate}
      />

      <AppFooter onNavigate={onNavigate} />
    </div>
  );
}
