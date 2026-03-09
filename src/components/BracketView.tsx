'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MatchResult, KnockoutResult, KnockoutRound, LiveMatch } from '@/types';
import { generateBracket } from '@/lib/bracket';
import { areAllGroupsComplete } from '@/lib/standings';
import KnockoutMatchCard from './KnockoutMatchCard';

interface Props {
  groupPredictions: Record<string, MatchResult>;
  knockoutPredictions: Record<string, KnockoutResult>;
  onPredict: (matchId: string, result: KnockoutResult) => void;
  liveMatches?: Record<string, LiveMatch>;
}

const rounds: KnockoutRound[] = ['R32', 'R16', 'QF', 'SF', 'F', '3RD'];

const roundLabels: Record<KnockoutRound, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  '3RD': 'Third Place',
  F: 'Finals',
};

export default function BracketView({ groupPredictions, knockoutPredictions, onPredict, liveMatches }: Props) {
  const [activeRound, setActiveRound] = useState<KnockoutRound>('R32');
  const allGroupsDone = areAllGroupsComplete(groupPredictions);
  const bracket = generateBracket(groupPredictions, knockoutPredictions);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const roundRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const setRoundRef = useCallback((round: KnockoutRound, el: HTMLDivElement | null) => {
    roundRefs.current[round] = el;
  }, []);

  // Scroll → update active tab
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollLeft = container.scrollLeft;
        const containerWidth = container.clientWidth;
        let closestRound: KnockoutRound = rounds[0];
        let closestDistance = Infinity;

        for (const round of rounds) {
          const el = roundRefs.current[round];
          if (!el) continue;
          // Distance from the left edge of the column to the center of the viewport
          const colCenter = el.offsetLeft + el.offsetWidth / 2;
          const viewCenter = scrollLeft + containerWidth / 2;
          const distance = Math.abs(colCenter - viewCenter);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestRound = round;
          }
        }

        setActiveRound(prev => (prev !== closestRound ? closestRound : prev));
        ticking = false;
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Tab click → scroll to round
  const handleTabClick = (round: KnockoutRound) => {
    setActiveRound(round);
    const el = roundRefs.current[round];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    }
  };

  if (!allGroupsDone) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="text-6xl mb-6 animate-pulse-gold">🏟️</div>
        <h2 className="text-2xl font-bold mb-3">Knockout Stage Locked</h2>
        <p className="text-slate-500">
          Complete all 48 group stage predictions to unlock the knockout bracket
        </p>
      </div>
    );
  }

  // Group matches by round
  const matchesByRound: Record<KnockoutRound, typeof bracket> = {} as Record<KnockoutRound, typeof bracket>;
  for (const round of rounds) {
    matchesByRound[round] = bracket.filter(m => m.round === round);
  }

  return (
    <div className="mt-2">
      {/* Sticky Round Tabs */}
      <div className="sticky top-0 z-20 bg-white">
        <div className="flex overflow-x-auto no-scrollbar gap-6 pt-4 px-4 border-b border-slate-200">
          {rounds.map(round => (
            <button
              key={round}
              className={`pb-3 whitespace-nowrap text-sm font-bold transition-colors relative ${
                activeRound === round
                  ? 'text-slate-800'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              onClick={() => handleTabClick(round)}
            >
              {roundLabels[round]}
              {activeRound === round && (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal Scrollable Bracket */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto gap-8 px-4 pt-6 pb-4"
      >
        {rounds.map(round => (
          <div
            key={round}
            ref={(el) => setRoundRef(round, el)}
            className="flex-shrink-0 w-72"
          >
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-4">
              {roundLabels[round]}
            </h3>
            <div className="flex flex-col gap-4">
              {matchesByRound[round].map(match => (
                <KnockoutMatchCard
                  key={match.id}
                  matchId={match.id}
                  homeCode={match.home}
                  awayCode={match.away}
                  result={match.result}
                  onPredict={onPredict}
                  liveMatch={liveMatches?.[match.id]}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
