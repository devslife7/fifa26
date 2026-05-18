import type { GroupLetter } from '@/types';
import { ANNEX_C, type AnnexCAssignment, type WinnerSlot } from './annexC.generated';

export { ANNEX_C, type AnnexCAssignment, type WinnerSlot };

export const WINNER_SLOTS: readonly WinnerSlot[] = ['A', 'B', 'D', 'E', 'G', 'I', 'K', 'L'] as const;

export function annexCKey(qualifierGroups: readonly GroupLetter[]): string {
  return [...qualifierGroups].sort().join('');
}

export function lookupAnnexC(qualifierGroups: readonly GroupLetter[]): AnnexCAssignment | undefined {
  if (qualifierGroups.length !== 8) return undefined;
  return ANNEX_C[annexCKey(qualifierGroups)];
}
