'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { MatchResult, KnockoutResult, KnockoutRound, LiveMatch } from '@/types';
import { generateBracket, isPlaceholder } from '@/lib/logic/bracket';
import { KNOCKOUT_VENUES } from '@/data/matches';
import KnockoutMatchCard from './KnockoutMatchCard';

interface Props {
  groupPredictions: Record<string, MatchResult>;
  knockoutPredictions: Record<string, KnockoutResult>;
  thirdPlaceTiebreaker?: string[];
  onPredict: (matchId: string, result: KnockoutResult) => void;
  onRandomize?: () => void;
  liveMatches?: Record<string, LiveMatch>;
  teamFlagsByCode?: Record<string, string>;
  readOnly?: boolean;
}

const rounds: KnockoutRound[] = ['R32', 'R16', 'QF', 'SF', '3RD', 'FIN'];
const roundSizes: Partial<Record<KnockoutRound, number>> = { R32: 16, R16: 8, QF: 4, SF: 2, '3RD': 1, FIN: 1 };

const roundLabels: Record<KnockoutRound, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  '3RD': 'Third Place',
  FIN: 'Finals',
};

export default function BracketView({ groupPredictions, knockoutPredictions, thirdPlaceTiebreaker, onPredict, onRandomize, liveMatches, teamFlagsByCode, readOnly = false }: Props) {
  const [activeRound, setActiveRound] = useState<KnockoutRound>('R32');
  const bracket = generateBracket(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const roundRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const matchRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isScrollingFromClick = useRef(false);

  const setRoundRef = useCallback((round: KnockoutRound, el: HTMLDivElement | null) => {
    roundRefs.current[round] = el;
  }, []);

  const setTabRef = useCallback((round: KnockoutRound, el: HTMLButtonElement | null) => {
    tabRefs.current[round] = el;
  }, []);

  const setMatchRef = useCallback((matchId: string, el: HTMLDivElement | null) => {
    matchRefs.current[matchId] = el;
  }, []);

  // Pre-populate completedRounds so auto-advance doesn't re-trigger on mount
  const completedRounds = useRef<Set<KnockoutRound>>(new Set());
  const hasMounted = useRef(false);

  // On mount, scroll directly to the furthest round with predictions (before paint)
  // In readOnly mode (modal), always start at R32
  useLayoutEffect(() => {
    let targetRound: KnockoutRound = 'R32';
    for (const round of rounds) {
      const prefix = round + '-';
      const count = Object.keys(knockoutPredictions).filter(k => k.startsWith(prefix)).length;
      const size = roundSizes[round];
      if (size && count === size) {
        completedRounds.current.add(round);
      }
      if (!readOnly && count > 0) targetRound = round;
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
      if (ticking || isScrollingFromClick.current) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollLeft = container.scrollLeft;
        const containerWidth = container.clientWidth;

        // If scrolled to the rightmost end, select Finals
        const maxScroll = container.scrollWidth - containerWidth;
        if (scrollLeft >= maxScroll - 10) {
          setActiveRound(prev => prev !== 'FIN' ? 'FIN' : prev);
          ticking = false;
          return;
        }

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
    isScrollingFromClick.current = true;
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
    setTimeout(() => { isScrollingFromClick.current = false; }, 400);
  };

  // Group matches by round
  const matchesByRound: Record<KnockoutRound, typeof bracket> = {} as Record<KnockoutRound, typeof bracket>;
  for (const round of rounds) {
    matchesByRound[round] = bracket.filter(m => m.round === round);
  }

  const activeRoundMatches = matchesByRound[activeRound] ?? [];
  const activeRoundPicked = activeRoundMatches.filter(match => knockoutPredictions[match.id]).length;
  const activeRoundTotal = roundSizes[activeRound] ?? activeRoundMatches.length;

  const isMatchOpen = (match: typeof bracket[number]) => {
    return !!match.home && !!match.away && !isPlaceholder(match.home) && !isPlaceholder(match.away) && !knockoutPredictions[match.id];
  };

  const nextOpenMatch = (() => {
    const startIndex = rounds.indexOf(activeRound);
    const searchRounds = [...rounds.slice(startIndex), ...rounds.slice(0, startIndex)];
    for (const round of searchRounds) {
      const match = matchesByRound[round].find(isMatchOpen);
      if (match) return match;
    }
    return null;
  })();

  const handleNextOpenMatch = () => {
    if (!nextOpenMatch) return;
    const round = nextOpenMatch.round;
    setActiveRound(round);
    const roundEl = roundRefs.current[round];
    const matchEl = matchRefs.current[nextOpenMatch.id];
    const container = scrollContainerRef.current;
    if (roundEl && container) {
      container.scrollTo({ left: roundEl.offsetLeft - 16, behavior: 'smooth' });
    }
    setTimeout(() => {
      matchEl?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }, 120);
  };

  return (
    <div>
      {/* Sticky Round Tabs */}
      <div className="sticky top-[77px] z-20 bg-background-dark">
        {!readOnly && (
          <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-neutral-500">Current round</p>
              <p className="mt-0.5 text-sm font-black text-white">
                {roundLabels[activeRound]} <span className="text-primary tabular-nums">{activeRoundPicked}/{activeRoundTotal}</span>
              </p>
            </div>
            <button
              onClick={handleNextOpenMatch}
              disabled={!nextOpenMatch}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-black text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-neutral-600"
            >
              <span className="material-symbols-outlined text-[16px]">my_location</span>
              Next open
            </button>
          </div>
        )}
        <div className="flex items-center border-b border-white/10">
          <div
            ref={tabsContainerRef}
            className="flex overflow-x-auto no-scrollbar gap-6 px-4 flex-1"
          >
            {!readOnly && onRandomize && (
              <button
                onClick={onRandomize}
                className="pb-3 pt-4 whitespace-nowrap text-sm font-bold text-neutral-500 hover:text-primary transition-colors flex items-center gap-1 shrink-0"
                title="Randomize bracket"
              >
                <span className="material-symbols-outlined text-[18px]">casino</span>
              </button>
            )}
            {rounds.map(round => (
              <button
                key={round}
                ref={(el) => setTabRef(round, el)}
                className={`pb-3 pt-4 whitespace-nowrap text-sm font-bold transition-colors relative ${
                  activeRound === round
                    ? 'text-white'
                    : 'text-neutral-500 hover:text-neutral-300'
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
            className={`flex-shrink-0 ${['R32', 'R16', 'QF', 'SF'].includes(round) ? 'w-[320px]' : 'w-64'}`}
          >
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest text-center mb-4">
              {roundLabels[round]}
            </h3>
            <div className="flex flex-col">
              {(() => {
                const matches = matchesByRound[round];
                const nextRoundMap: Partial<Record<KnockoutRound, string>> = {
                  R32: 'R16',
                  R16: 'QF',
                  QF: 'SF',
                  SF: 'FIN',
                };
                const nextRoundPrefix = nextRoundMap[round];

                if (!nextRoundPrefix || matches.length < 2) {
                  return matches.map((match, i) => (
                    <div
                      key={match.id}
                      ref={(el) => setMatchRef(match.id, el)}
                      className={`${i > 0 ? 'mt-4' : ''} scroll-mt-32`}
                    >
                      <KnockoutMatchCard
                        matchId={match.id}
                        homeCode={match.home}
                        awayCode={match.away}
                        result={match.result}
                        onPredict={onPredict}
                        liveMatch={liveMatches?.[match.id]}
                        teamFlagsByCode={teamFlagsByCode}
                        readOnly={readOnly}
                        venue={KNOCKOUT_VENUES[match.id]}
                      />
                    </div>
                  ));
                }

                const pairs: { first: typeof matches[0]; second: typeof matches[0]; feedsId: string }[] = [];
                for (let i = 0; i < matches.length; i += 2) {
                  pairs.push({
                    first: matches[i],
                    second: matches[i + 1],
                    feedsId: `${nextRoundPrefix}-${i / 2 + 1}`,
                  });
                }

                return pairs.map((pair, pairIdx) => (
                  <div key={pair.feedsId} className={pairIdx > 0 ? 'mt-6' : ''}>
                    <div className="flex items-stretch">
                      {/* Match cards */}
                      <div className="flex-1 flex flex-col gap-3">
                        <div ref={(el) => setMatchRef(pair.first.id, el)} className="scroll-mt-32">
                          <KnockoutMatchCard
                            matchId={pair.first.id}
                            homeCode={pair.first.home}
                            awayCode={pair.first.away}
                            result={pair.first.result}
                            onPredict={onPredict}
                            liveMatch={liveMatches?.[pair.first.id]}
                            teamFlagsByCode={teamFlagsByCode}
                            readOnly={readOnly}
                            venue={KNOCKOUT_VENUES[pair.first.id]}
                          />
                        </div>
                        <div ref={(el) => setMatchRef(pair.second.id, el)} className="scroll-mt-32">
                          <KnockoutMatchCard
                            matchId={pair.second.id}
                            homeCode={pair.second.home}
                            awayCode={pair.second.away}
                            result={pair.second.result}
                            onPredict={onPredict}
                            liveMatch={liveMatches?.[pair.second.id]}
                            teamFlagsByCode={teamFlagsByCode}
                            readOnly={readOnly}
                            venue={KNOCKOUT_VENUES[pair.second.id]}
                          />
                        </div>
                      </div>
                      {/* Bracket connector lines + feeds badge */}
                      <div className="relative w-16 flex-shrink-0">
                        {/* Top horizontal line */}
                        <div className="absolute left-0 top-1/4 w-3 h-px bg-neutral-700 -translate-y-1/2" />
                        {/* Vertical line */}
                        <div className="absolute left-3 top-1/4 bottom-1/4 w-px bg-neutral-700" />
                        {/* Bottom horizontal line */}
                        <div className="absolute left-0 bottom-1/4 w-3 h-px bg-neutral-700 translate-y-1/2" />
                        {/* Middle connector to badge */}
                        <div className="absolute left-3 top-1/2 w-2 h-px bg-neutral-700 -translate-y-1/2" />
                        {/* Feeds badge */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-center">
                          <div className="text-[8px] text-neutral-600 leading-tight">Feeds</div>
                          <div className="text-[10px] font-semibold text-neutral-500 leading-tight">{pair.feedsId}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
