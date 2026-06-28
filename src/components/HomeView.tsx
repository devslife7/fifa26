'use client';

import { useEffect, useRef, useState } from 'react';
import { TabId, LiveMatch } from '@/types';
import DailyRecapCard from '@/components/home/DailyRecapCard';
import SignedOutHero from '@/components/home/SignedOutHero';
import LeaderboardPeek from '@/components/home/LeaderboardPeek';
import KnockoutScoringCard from '@/components/home/KnockoutScoringCard';
import AppFooter from '@/components/layout/AppFooter';
import AuthModal from '@/components/auth/AuthModal';
import { useAuth } from '@/components/providers/AuthProvider';
import { useDailyRecap } from '@/hooks/useDailyRecap';

interface HomeViewProps {
  liveMatches: Record<string, LiveMatch>;
  onNavigate: (tab: TabId) => void;
}

function HomeAccountBar({ displayName, onSignOut }: { displayName: string; onSignOut: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div className="flex items-center gap-3 pt-1">
      <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-gradient-to-br from-primary/20 to-wc-blue/15">
        <span className="text-xs font-black text-primary">{initials}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-body text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
          Signed in as
        </p>
        <p className="truncate text-sm font-black text-white">{displayName}</p>
      </div>
      <div className="relative flex-shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(open => !open)}
          aria-label="Account menu"
          className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
        >
          <span className="material-symbols-outlined text-[20px] text-white/40">more_vert</span>
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-xl border border-white/10 bg-neutral-800 shadow-xl">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onSignOut();
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-wc-red/80 transition-colors hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function HomeHeader({ compact }: { compact: boolean }) {
  return (
    <section className="relative -mx-3 pb-3 sm:-mx-4 md:mx-0">
      <div className="relative mx-auto w-full overflow-hidden shadow-[0_24px_60px_-24px_rgba(0,0,0,0.85)] sm:max-w-[440px] sm:rounded-b-[32px] md:max-w-full">
        <img
          src="/images/promotional-image-hero.png"
          alt="FIFA World Cup 2026"
          className={
            compact
              ? 'block w-full object-cover object-[50%_15%] min-h-[140px] [height:22vh] [max-height:200px]'
              : 'block w-full object-cover object-[50%_15%] min-h-[260px] [height:calc(100svh-300px)] [max-height:560px]'
          }
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
  liveMatches,
  onNavigate,
}: HomeViewProps) {
  const { user, signOut } = useAuth();
  const recap = useDailyRecap(liveMatches);
  const showRecap = recap.status === 'ready';
  const [showAuth, setShowAuth] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  return (
    <div className="flex flex-col gap-3 pb-8 pt-0">
      {user ? (
        <>
          {showRecap && <DailyRecapCard recap={recap} onNavigate={onNavigate} />}
          <HomeHeader compact={showRecap} />
          <HomeAccountBar
            displayName={user.display_name || 'Player'}
            onSignOut={() => setShowSignOutConfirm(true)}
          />
        </>
      ) : (
        <>
          <SignedOutHero onSignIn={() => setShowAuth(true)} />
          <LeaderboardPeek onNavigate={onNavigate} onSignIn={() => setShowAuth(true)} />
        </>
      )}

      <KnockoutScoringCard />

      <AppFooter />

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuthenticated={() => setShowAuth(false)}
        />
      )}

      {showSignOutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowSignOutConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-neutral-800 p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-bold text-white">Sign Out?</h3>
            <p className="mb-4 text-sm text-white/50">Are you sure?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 rounded-xl bg-white/10 py-3 text-sm font-bold text-white/60 transition-colors hover:bg-white/15"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowSignOutConfirm(false); signOut(); }}
                className="flex-1 rounded-xl bg-wc-red py-3 text-sm font-bold text-white transition-colors hover:bg-wc-red/90"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
