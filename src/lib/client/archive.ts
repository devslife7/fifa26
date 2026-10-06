import snapshot from '@/data/archive/snapshot.json';
import type { LeaderboardEntry, LeaderboardPrediction, LiveMatch } from '@/types';

export const archive = {
  capturedAt: snapshot.capturedAt,
  championCode: snapshot.championCode,
  matches: snapshot.matches as LiveMatch[],
  predictions: snapshot.predictions as LeaderboardPrediction[],
  leaderboard: snapshot.leaderboard as LeaderboardEntry[],
};
export const archiveDate = new Date(archive.capturedAt).toISOString().slice(0, 10);
export const archivedMatchesById = Object.fromEntries(
  archive.matches.filter(m => m.localMatchId).map(m => [m.localMatchId!, m]),
);
export const archivedFlags = Object.fromEntries(archive.matches.flatMap(m => [
  ...(m.homeCode && m.homeFlag ? [[m.homeCode, m.homeFlag]] : []),
  ...(m.awayCode && m.awayFlag ? [[m.awayCode, m.awayFlag]] : []),
]));
