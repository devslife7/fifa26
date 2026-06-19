'use client';

import { useEffect, useState } from 'react';
import { TabId, LeaderboardEntry } from '@/types';

interface Props {
  onNavigate: (tab: TabId) => void;
  onSignIn: () => void;
}

function entryName(entry: LeaderboardEntry): string {
  return (entry.name?.trim() || entry.display_name || 'Anonymous');
}

const RANK_TONE = ['text-medal-gold', 'text-medal-silver', 'text-medal-bronze'];

export default function LeaderboardPeek({ onNavigate, onSignIn }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setEntries((data.leaderboard ?? []) as LeaderboardEntry[]);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hide entirely until we know there's something worth showing.
  if (!entries || entries.length === 0) return null;

  const top = entries.slice(0, 3);

  return (
    <section className="w-full rounded-[26px] border border-white/[0.08] bg-white/[0.03] px-5 py-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="font-body text-[11px] font-black uppercase tracking-[0.16em] text-neutral-500">
          Leaderboard
        </span>
        <span className="font-body text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
          {entries.length} competing
        </span>
      </div>

      <div className="space-y-2.5">
        {top.map((entry, index) => (
          <div key={entry.prediction_id ?? `${entry.prediction_number ?? entry.user_id ?? index}`} className="flex items-center gap-3">
            <span className={`w-5 shrink-0 text-center font-display text-sm font-black tabular-nums ${RANK_TONE[index] ?? 'text-neutral-400'}`}>
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-black text-neutral-100">
              {entryName(entry)}
            </span>
            <span className="shrink-0 font-display text-sm font-black tabular-nums text-primary">
              {entry.total_points}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onNavigate('ranking')}
          className="flex-1 rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-2.5 font-body text-xs font-black text-neutral-100 transition-colors hover:bg-white/[0.08]"
        >
          View full leaderboard
        </button>
        <button
          type="button"
          onClick={onSignIn}
          className="flex-1 rounded-[14px] bg-primary px-4 py-2.5 font-body text-xs font-black text-black transition-colors hover:bg-primary/90"
        >
          Sign in to compete
        </button>
      </div>
    </section>
  );
}
