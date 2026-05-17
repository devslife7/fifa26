'use client';

import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';

const THRESHOLD = 80;
const MAX_PULL = 120;

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh?: () => Promise<void> | void;
}

export default function PullToRefresh({ children, onRefresh }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0 && !refreshing) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [refreshing]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current || refreshing) return;

    // Re-check scroll position — user might have scrolled since touchstart
    if (window.scrollY > 0) {
      pulling.current = false;
      setPullDistance(0);
      return;
    }

    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      // Dampen the pull (feels more natural)
      const dampened = Math.min(delta * 0.5, MAX_PULL);
      setPullDistance(dampened);
      if (dampened > 10) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
    }
  }, [refreshing]);

  const onTouchEnd = useCallback(() => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      setTimeout(async () => {
        try {
          if (onRefresh) {
            await onRefresh();
          } else {
            window.location.reload();
            return;
          }
        } finally {
          setRefreshing(false);
          setPullDistance(0);
        }
      }, 250);
    } else {
      setPullDistance(0);
    }
  }, [onRefresh, pullDistance, refreshing]);

  useEffect(() => {
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const showIndicator = pullDistance > 10;

  return (
    <>
      {showIndicator && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ height: pullDistance }}
        >
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-900 shadow-lg border border-white/10"
            style={{
              opacity: progress,
              transform: `scale(${0.5 + progress * 0.5})`,
            }}
          >
            <span
              className={`material-symbols-outlined text-[20px] text-primary ${refreshing ? 'animate-spin' : ''}`}
              style={{
                transform: refreshing ? undefined : `rotate(${progress * 360}deg)`,
              }}
            >
              {refreshing ? 'progress_activity' : 'arrow_downward'}
            </span>
          </div>
        </div>
      )}
      <div
        style={{
          transform: showIndicator ? `translateY(${pullDistance}px)` : undefined,
          transition: pulling.current ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </>
  );
}
