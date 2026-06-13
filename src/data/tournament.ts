export const TOURNAMENT_KICKOFF = new Date('2026-06-11T19:00:00Z');
export const PREDICTIONS_LOCK = TOURNAMENT_KICKOFF;

export const TOURNAMENT_KICKOFF_DISPLAY = 'June 11, 2026';
export const PREDICTIONS_ACCEPTING_SUBMISSIONS = false;
export const PREDICTIONS_CLOSED_TITLE = 'Predictions are closed';
export const PREDICTIONS_CLOSED_MESSAGE =
  'The tournament has already begun, so predictions are no longer accepted. Submitted picks stay locked in for the leaderboard.';

export function daysUntilKickoff(now: Date = new Date()): number {
  return Math.ceil((TOURNAMENT_KICKOFF.getTime() - now.getTime()) / 86400000);
}

export function arePredictionDetailsPublic(now: Date = new Date()): boolean {
  return now.getTime() >= PREDICTIONS_LOCK.getTime();
}

export const LATE_SUBMISSION_EXEMPT_PREDICTION_NUMBERS = new Set([189]);

export function isLateSubmission(
  completedAt?: string | Date | null,
  predictionNumber?: number | null,
): boolean {
  if (predictionNumber != null && LATE_SUBMISSION_EXEMPT_PREDICTION_NUMBERS.has(predictionNumber)) {
    return false;
  }
  if (!completedAt) return false;
  const submittedAt = completedAt instanceof Date ? completedAt : new Date(completedAt);
  if (Number.isNaN(submittedAt.getTime())) return false;
  return submittedAt.getTime() > PREDICTIONS_LOCK.getTime();
}
