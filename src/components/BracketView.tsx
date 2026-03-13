'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { MatchResult, KnockoutResult, KnockoutRound, LiveMatch } from '@/types';
import { generateBracket } from '@/lib/bracket';
import { areAllGroupsComplete } from '@/lib/standings';
import KnockoutMatchCard from './KnockoutMatchCard';

interface Props {
  groupPredictions: Record<string, MatchResult>;
  knockoutPredictions: Record<string, KnockoutResult>;
  thirdPlaceTiebreaker?: string[];
  onPredict: (matchId: string, result: KnockoutResult) => void;
  liveMatches?: Record<string, LiveMatch>;
  teamFlagsByCode?: Record<string, string>;
  readOnly?: boolean;
}

const rounds: KnockoutRound[] = ['R32', 'R16', 'QF', 'SF', '3RD', 'F'];

const roundLabels: Record<KnockoutRound, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  '3RD': 'Third Place',
  F: 'Finals',
};

export default function BracketView({ groupPredictions, knockoutPredictions, thirdPlaceTiebreaker, onPredict, liveMatches, teamFlagsByCode, readOnly = false }: Props) {
  const [activeRound, setActiveRound] = useState<KnockoutRound>('R32');
  const allGroupsDone = areAllGroupsComplete(groupPredictions);
  const bracket = generateBracket(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const roundRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const setRoundRef = useCallback((round: KnockoutRound, el: HTMLDivElement | null) => {
    roundRefs.current[round] = el;
  }, []);

  const setTabRef = useCallback((round: KnockoutRound, el: HTMLButtonElement | null) => {
    tabRefs.current[round] = el;
  }, []);

  // Pre-populate completedRounds so auto-advance doesn't re-trigger on mount
  const completedRounds = useRef<Set<KnockoutRound>>(new Set());
  const hasMounted = useRef(false);

  // On mount, scroll directly to the furthest round with predictions (before paint)
  useLayoutEffect(() => {
    let targetRound: KnockoutRound = 'R32';
    const roundSizes: Partial<Record<KnockoutRound, number>> = { R32: 16, R16: 8, QF: 4, SF: 2, '3RD': 1 };
    for (const round of rounds) {
      const prefix = round + '-';
      const count = Object.keys(knockoutPredictions).filter(k => k.startsWith(prefix)).length;
      if (count > 0) targetRound = round;
      const size = roundSizes[round];
      if (size && count === size) {
        completedRounds.current.add(round);
      }
    }
    const el = roundRefs.current[targetRound];
    const container = scrollContainerRef.current;
    if (el && container) {
      container.scrollTo({ left: el.offsetLeft - 16, behavior: 'instant' });
    }
    setActiveRound(targetRound);
    hasMounted.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!hasMounted.current) return;
    const roundSizes: Partial<Record<KnockoutRound, number>> = { R32: 16, R16: 8, QF: 4, SF: 2, '3RD': 1 };
    const size = roundSizes[activeRound];
    if (!size) return;

    const prefix = activeRound + '-';
    const count = Object.keys(knockoutPredictions).filter(k => k.startsWith(prefix)).length;
    const isComplete = count === size;

    if (isComplete && !completedRounds.current.has(activeRound)) {
      completedRounds.current.add(activeRound);
      const roundOrder = rounds;
      const nextRound = roundOrder[roundOrder.indexOf(activeRound) + 1];
      if (nextRound) {
        setTimeout(() => {
          setActiveRound(nextRound);
          const el = roundRefs.current[nextRound];
          const container = scrollContainerRef.current;
          if (el && container) {
            container.scrollTo({
              left: el.offsetLeft - 16, // 16px to match the px-4 padding
              behavior: 'smooth'
            });
            // Delay vertical scroll slightly so mobile browsers don't cancel the horizontal one
            setTimeout(() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 50);
          }
        }, 350);
      }
    } else if (!isComplete) {
      completedRounds.current.delete(activeRound);
    }
  }, [knockoutPredictions, activeRound]);

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
        let leftmostRound: KnockoutRound = rounds[0];

        for (const round of rounds) {
          const el = roundRefs.current[round];
          if (!el) continue;
          // A column is "visible" if its right edge is past the scroll position
          const colRight = el.offsetLeft + el.offsetWidth;
          if (colRight > scrollLeft + 40) {
            leftmostRound = round;
            break;
          }
        }

        setActiveRound(prev => (prev !== leftmostRound ? leftmostRound : prev));
        ticking = false;
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll the tabs container so the active tab is visible
  useEffect(() => {
    const container = tabsContainerRef.current;
    const activeTabEl = tabRefs.current[activeRound];

    if (container && activeTabEl) {
      const containerWidth = container.clientWidth;
      const tabLeft = activeTabEl.offsetLeft;
      const tabWidth = activeTabEl.offsetWidth;

      // Calculate the ideal scroll position to center the tab
      const scrollPos = tabLeft - (containerWidth / 2) + (tabWidth / 2);

      container.scrollTo({
        left: scrollPos,
        behavior: hasMounted.current ? 'smooth' : 'instant'
      });
    }
  }, [activeRound]);

  // Tab click → scroll to round
  const handleTabClick = (round: KnockoutRound) => {
    setActiveRound(round);
    const el = roundRefs.current[round];
    const container = scrollContainerRef.current;
    if (el && container) {
      container.scrollTo({
        left: el.offsetLeft - 16, // 16px to match the px-4 padding
        behavior: 'smooth'
      });
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
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
    <div>
      {/* Sticky Round Tabs */}
      <div className="sticky top-0 z-20 bg-white">
        <div className="flex items-center border-b border-slate-200">
          <div 
            ref={tabsContainerRef}
            className="flex overflow-x-auto no-scrollbar gap-6 px-4 flex-1"
          >
            {rounds.map(round => (
              <button
                key={round}
                ref={(el) => setTabRef(round, el)}
                className={`pb-3 pt-4 whitespace-nowrap text-sm font-bold transition-colors relative ${
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
      </div>

      {/* Horizontal Scrollable Bracket */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto no-scrollbar gap-8 px-4 pt-6 pb-4 relative"
      >
        {rounds.map(round => (
          <div
            key={round}
            ref={(el) => setRoundRef(round, el)}
            className="flex-shrink-0 w-48"
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
                  teamFlagsByCode={teamFlagsByCode}
                  readOnly={readOnly}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
