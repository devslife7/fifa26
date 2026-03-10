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
  onRandomize?: () => void;
  liveMatches?: Record<string, LiveMatch>;
  teamFlagsByCode?: Record<string, string>;
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

export default function BracketView({ groupPredictions, knockoutPredictions, onPredict, onRandomize, liveMatches, teamFlagsByCode }: Props) {
  const [activeRound, setActiveRound] = useState<KnockoutRound>('R32');
  const allGroupsDone = areAllGroupsComplete(groupPredictions);
  const bracket = generateBracket(groupPredictions, knockoutPredictions);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const roundRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const setRoundRef = useCallback((round: KnockoutRound, el: HTMLDivElement | null) => {
    roundRefs.current[round] = el;
  }, []);

  // Auto-scroll to next round when current round is fully predicted
  const r32WasComplete = useRef(false);
  useEffect(() => {
    const roundSizes: Partial<Record<KnockoutRound, number>> = { R32: 16, R16: 8, QF: 4, SF: 2 };
    const size = roundSizes[activeRound];
    if (!size) return;

    const prefix = activeRound + '-';
    const count = Object.keys(knockoutPredictions).filter(k => k.startsWith(prefix)).length;
    const isComplete = count === size;

    if (isComplete && !r32WasComplete.current) {
      r32WasComplete.current = true;
      const roundOrder = rounds;
      const nextRound = roundOrder[roundOrder.indexOf(activeRound) + 1];
      if (nextRound) {
        setTimeout(() => {
          setActiveRound(nextRound);
          const el = roundRefs.current[nextRound];
          if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
        }, 350);
      }
    } else if (!isComplete) {
      r32WasComplete.current = false;
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
        <div className="flex items-center border-b border-slate-200">
          <div className="flex overflow-x-auto no-scrollbar gap-6 pt-4 px-4 flex-1">
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
          {onRandomize && (
            <div className="flex-shrink-0 px-3 pb-1 pt-4">
              <button
                onClick={onRandomize}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">casino</span>
                Randomize
              </button>
            </div>
          )}
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
                  teamFlagsByCode={teamFlagsByCode}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
