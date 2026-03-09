'use client';

import { MatchResult, KnockoutResult } from '@/types';
import { getChampion } from '@/lib/bracket';
import { teamsByCode } from '@/data/teams';

interface Props {
  groupPredictions: Record<string, MatchResult>;
  knockoutPredictions: Record<string, KnockoutResult>;
}

export default function ChampionScreen({ groupPredictions, knockoutPredictions }: Props) {
  const championCode = getChampion(groupPredictions, knockoutPredictions);
  const champion = championCode ? teamsByCode[championCode] : null;

  if (!champion) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-7xl mb-6 animate-trophy-glow">🏆</div>
        <h2 className="text-3xl font-bold mb-3">Your Champion</h2>
        <p className="text-white/40 max-w-md">
          Complete all 104 match predictions to reveal your predicted FIFA World Cup 2026 champion
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-8">
        <div className="text-8xl animate-trophy-glow">🏆</div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-3 bg-gold/20 rounded-full blur-xl" />
      </div>

      <div className="mb-6">
        <span className="text-7xl">{champion.flag}</span>
      </div>

      <h2 className="text-4xl font-black mb-2 bg-gradient-to-r from-gold-light via-gold to-gold-dark bg-clip-text text-transparent">
        {champion.name}
      </h2>

      <p className="text-gold/60 text-sm uppercase tracking-[0.2em] font-medium mb-8">
        Your Predicted Champion
      </p>

      <div className="bg-surface-light rounded-2xl border border-gold/20 px-8 py-6 max-w-sm animate-pulse-gold">
        <p className="text-white/60 text-sm">
          FIFA World Cup 2026
        </p>
        <p className="text-gold font-bold text-lg mt-1">
          {champion.flag} {champion.name}
        </p>
      </div>
    </div>
  );
}
