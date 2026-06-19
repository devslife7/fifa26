'use client';

import { TabId } from '@/types';
import { teamsByCode } from '@/data/teams';
import type { DailyRecap } from '@/hooks/useDailyRecap';

interface Props {
  recap: DailyRecap;
  onNavigate: (tab: TabId) => void;
}

function teamName(code: string | null): string {
  if (!code) return '—';
  return teamsByCode[code]?.name ?? code;
}

function standoutLabel(standout: NonNullable<DailyRecap['standout']>): string {
  const { actualWinnerCode, homeCode, awayCode } = standout;
  if (!actualWinnerCode) {
    return `${teamName(homeCode)} drew ${teamName(awayCode)}`;
  }
  const otherCode = actualWinnerCode === homeCode ? awayCode : homeCode;
  return `${teamName(actualWinnerCode)} beat ${teamName(otherCode)}`;
}

function RankLine({ rank, totalUsers, positionChange }: Pick<DailyRecap, 'rank' | 'totalUsers' | 'positionChange'>) {
  if (rank == null) return null;
  const ofTotal = totalUsers != null ? ` of ${totalUsers}` : '';

  if (positionChange == null || positionChange === 0) {
    return (
      <RecapRow icon="trending_flat" tone="neutral">
        {positionChange === 0 ? 'You held your spot' : 'Your standing'} ·{' '}
        <span className="text-primary">#{rank}</span>
        {ofTotal}
      </RecapRow>
    );
  }

  const climbed = positionChange > 0;
  const places = Math.abs(positionChange);
  const placeWord = places === 1 ? 'place' : 'places';
  return (
    <RecapRow icon={climbed ? 'trending_up' : 'trending_down'} tone={climbed ? 'good' : 'bad'}>
      {climbed ? 'Climbed' : 'Slipped'} {places} {placeWord} → <span className="text-primary">#{rank}</span>
      {ofTotal}
    </RecapRow>
  );
}

function RecapRow({
  icon,
  tone,
  children,
}: {
  icon: string;
  tone: 'good' | 'bad' | 'neutral' | 'gold';
  children: React.ReactNode;
}) {
  const toneClass =
    tone === 'good' ? 'text-wc-green'
    : tone === 'bad' ? 'text-wc-red'
    : tone === 'gold' ? 'text-primary'
    : 'text-neutral-400';
  return (
    <div className="flex items-center gap-2.5">
      <span className={`material-symbols-outlined text-[18px] ${toneClass}`}>{icon}</span>
      <span className="min-w-0 truncate text-[13px] font-bold text-neutral-100">{children}</span>
    </div>
  );
}

export default function DailyRecapCard({ recap, onNavigate }: Props) {
  if (recap.status !== 'ready') return null;

  const { hitCount, newResultCount, pointsGained, rank, totalUsers, positionChange, standout } = recap;

  return (
    <button
      onClick={() => onNavigate('ranking')}
      className="w-full rounded-[26px] border border-white/[0.08] bg-white/[0.03] px-5 py-5 text-left transition-transform active:scale-[0.99]"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="font-body text-[11px] font-black uppercase tracking-[0.16em] text-neutral-500">
          Since you were last here
        </span>
        <span className="material-symbols-outlined text-[18px] text-neutral-600">chevron_right</span>
      </div>

      <div className="space-y-3">
        <RecapRow icon={hitCount > 0 ? 'check_circle' : 'history'} tone={hitCount > 0 ? 'good' : 'neutral'}>
          {hitCount > 0 ? (
            <>
              {hitCount} of {newResultCount} {newResultCount === 1 ? 'pick' : 'picks'} hit ·{' '}
              <span className="text-wc-green">+{pointsGained} pts</span>
            </>
          ) : (
            <>
              {newResultCount} new {newResultCount === 1 ? 'result' : 'results'} · no points this time
            </>
          )}
        </RecapRow>

        <RankLine rank={rank} totalUsers={totalUsers} positionChange={positionChange} />

        {standout && standout.points > 0 && (
          <RecapRow icon="star" tone="gold">
            Best call: {standoutLabel(standout)}{' '}
            <span className="text-primary">+{standout.points}</span>
          </RecapRow>
        )}
      </div>
    </button>
  );
}
