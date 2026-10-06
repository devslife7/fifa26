/** One-time, read-only capture. Never called by the site build. */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createServiceClient } from '../../src/lib/services/supabase/server';
import { calculateScore } from '../../src/lib/logic/scoring';
import { computeTiedRanks, positionChangeFromRanks } from '../../src/lib/services/leaderboard-position';
import { isLateSubmission } from '../../src/data/tournament';
import type { ActualResult } from '../../src/lib/services/actual-results';
import type { LeaderboardPrediction, LiveMatch } from '../../src/types';

async function main() {
  if (existsSync('src/data/archive/snapshot.json') && !process.argv.includes('--replace')) {
    throw new Error('The archive is already captured. Use --replace only for an intentional recapture.');
  }
  const client = createServiceClient();
  const tables = ['fixtures', 'actual_results', 'predictions', 'profiles', 'scores'] as const;
  const rows = await Promise.all(tables.map(async table => {
    const all: Record<string, any>[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client.from(table).select('*').order(table === 'actual_results' ? 'match_id' : table === 'fixtures' ? 'api_match_id' : table === 'scores' ? 'prediction_id' : 'id').range(offset, offset + 999);
      if (error) throw new Error(`${table}: ${error.message}`);
      all.push(...data);
      if (data.length < 1000) return all;
    }
  }));
  const [fixtures, results, predictions, profiles, scores] = rows;
  const capturedAt = new Date().toISOString();
  const backupDir = `backups/archive-${capturedAt.replaceAll(':', '-')}`;
  await mkdir(backupDir, { recursive: true, mode: 0o700 });
  for (const [i, table] of tables.entries()) {
    await writeFile(`${backupDir}/${table}.json`, JSON.stringify(rows[i], null, 2) + '\n', { mode: 0o600 });
  }
  if (fixtures.length !== 104 || fixtures.some(f => f.status !== 'FINISHED' || !f.actual_result)) {
    throw new Error('Archive requires 104 finished fixtures with official outcomes. Private backup captured; no public snapshot written.');
  }
  if (results.length !== 104 || new Set(results.map(r => r.match_id)).size !== 104) throw new Error('Incomplete actual results');
  const profileNames = new Map(profiles.map(p => [p.id, p.display_name]));
  const publicPredictions: LeaderboardPrediction[] = predictions.filter(p => p.is_complete).map(p => {
    const score = scores.find(s => s.prediction_id === p.id || s.prediction_number === p.prediction_number);
    const total = calculateScore({ user_id: p.user_id ?? p.id, group_matches: p.group_matches, knockout_matches: p.knockout_matches, champion_code: p.champion_code, third_place_tiebreaker: p.third_place_tiebreaker }, results as ActualResult[]);
    if (!score || Number(score.total_points) !== total) {
      throw new Error(`Score mismatch for prediction ${p.prediction_number}: saved ${score?.total_points}, computed ${total}`);
    }
    return {
      prediction_number: p.prediction_number,
      user_id: `prediction-${p.prediction_number}`,
      name: p.name ?? null,
      display_name: p.submitter_name || profileNames.get(p.user_id) || 'Anonymous',
      champion_code: p.champion_code,
      group_matches: p.group_matches ?? {},
      knockout_matches: p.knockout_matches ?? {},
      third_place_tiebreaker: p.third_place_tiebreaker ?? [],
      total_points: score ? Number(score.total_points) : total,
      position_change: positionChangeFromRanks(score?.rank, score?.previous_rank),
      is_approved: !!p.is_approved,
      details_available: true,
      is_late_submission: isLateSubmission(p.completed_at, p.prediction_number),
      completed_at: p.completed_at,
      created_at: p.created_at,
      updated_at: p.updated_at,
    };
  });
  const matches: LiveMatch[] = fixtures.map(f => ({
    apiMatchId: f.api_match_id, localMatchId: f.local_match_id,
    homeCode: f.home_code, awayCode: f.away_code,
    homeName: f.home_name, awayName: f.away_name,
    homeShortName: f.home_short_name, awayShortName: f.away_short_name,
    homeFlag: f.home_code ? `/images/flags/${f.home_code.toLowerCase()}.png` : null,
    awayFlag: f.away_code ? `/images/flags/${f.away_code.toLowerCase()}.png` : null,
    utcDate: f.utc_date, status: f.status, venue: f.venue,
    score: f.score_home != null && f.score_away != null ? { home: f.score_home, away: f.score_away } : null,
    penalties: f.penalty_home != null && f.penalty_away != null ? { home: f.penalty_home, away: f.penalty_away } : null,
    actualResult: f.actual_result, stage: f.stage, group: f.group,
  })).sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  const approved = publicPredictions.filter(p => p.is_approved).sort((a,b) => Number(b.total_points)-Number(a.total_points) || (a.name || a.display_name).localeCompare(b.name || b.display_name));
  // Stored ranks include preview entries; the public UI ranks approved entries separately.
  const allRanked = [...publicPredictions].sort((a,b) => Number(b.total_points)-Number(a.total_points));
  const ranks = computeTiedRanks(allRanked, p => Number(p.total_points));
  for (const [i,p] of allRanked.entries()) {
    const stored = scores.find(s => s.prediction_number === p.prediction_number);
    if (stored?.rank != null && Number(stored.rank) !== ranks[i]) throw new Error(`Rank mismatch for prediction ${p.prediction_number}`);
  }
  const final = matches.find(m => m.localMatchId === 'FIN-1');
  if (!final || !['home','away'].includes(final.actualResult ?? '')) throw new Error('Missing final winner');
  const snapshot = {
    capturedAt, schemaVersion: 1,
    championCode: final.actualResult === 'home' ? final.homeCode : final.awayCode,
    matches, predictions: publicPredictions,
    leaderboard: approved.map(p => ({ ...p, calculated_at: capturedAt })),
  };
  // Shared tokens are kept in build-only data, separate from the leaderboard bundle.
  const shared = predictions.filter(p => p.is_complete && p.share_token).map(p => ({
    token: p.share_token,
    prediction: publicPredictions.find(row => row.prediction_number === p.prediction_number)!,
  }));
  await writeFile('src/data/archive/snapshot.json', JSON.stringify(snapshot, null, 2) + '\n');
  await writeFile('src/data/archive/shared.json', JSON.stringify(shared, null, 2) + '\n');
  console.log(`Archived ${matches.length} matches, ${publicPredictions.length} predictions, ${approved.length} competitors, ${shared.length} shared pages. Scores and ranks verified. Private backup: ${backupDir}`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
