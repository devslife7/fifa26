'use client';

import type { MatchResult, KnockoutResult } from '@/types';
import { getTopThree } from '@/lib/logic/bracket';
import { teamsByCode } from '@/data/teams';
import Podium from './Podium';

interface Props {
  groupPredictions: Record<string, MatchResult>;
  knockoutPredictions: Record<string, KnockoutResult>;
  thirdPlaceTiebreaker: string[];
  onReset: () => void;
  onBrowse: () => void;
}
export default function DemoChampion({ groupPredictions, knockoutPredictions, thirdPlaceTiebreaker, onReset, onBrowse }: Props) {
  const podium = getTopThree(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker);
  const champion = podium.first ? teamsByCode[podium.first] : null;
  return (
    <section className="mx-auto max-w-lg space-y-7 py-10 text-center">
      <p className="font-body text-xs font-bold uppercase tracking-widest text-primary">Prediction workflow · Demo complete</p>
      <h1 className="text-4xl font-black">{champion?.name ?? 'Your champion'}</h1>
      {podium.first && <Podium championCode={podium.first} secondCode={podium.second ?? undefined} thirdCode={podium.third ?? undefined} />}
      <p className="font-body text-sm leading-relaxed text-neutral-400">You’ve explored the original prediction workflow, from the group stage to the final. These demo picks are not saved or submitted and do not affect the archived leaderboard.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={onBrowse} className="rounded-xl bg-primary px-5 py-3 font-bold text-black">Browse demo bracket</button>
        <button onClick={onReset} className="rounded-xl border border-white/20 px-5 py-3 font-bold">Reset demo</button>
      </div>
    </section>
  );
}
