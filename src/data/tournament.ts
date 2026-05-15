export const TOURNAMENT_KICKOFF = new Date('2026-06-11T16:00:00Z');
export const PREDICTIONS_LOCK = TOURNAMENT_KICKOFF;

export const TOURNAMENT_KICKOFF_DISPLAY = 'June 11, 2026';

export function daysUntilKickoff(now: Date = new Date()): number {
  return Math.ceil((TOURNAMENT_KICKOFF.getTime() - now.getTime()) / 86400000);
}
