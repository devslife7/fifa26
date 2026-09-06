// Read-only audit of the final leaderboard. Run via:
//   npx tsx --env-file=.env.local scripts/verify-winner.ts
//
// Recomputes every prediction's total with the authoritative calculateScore()
// against the current finished actual_results and diffs it with the stored
// `scores` snapshot. Writes nothing. Prints a per-category breakdown for the
// top finishers so the winner can be certified line-by-line.

import { createServiceClient } from '../src/lib/services/supabase/server';
import { getFinishedActualResults } from '../src/lib/services/actual-results';
import {
  calculateScore,
  getPredictedQualifiers,
  getActualQualifiers,
  GROUP_POINTS,
  QUALIFIER_POINTS,
  WINNER_POINTS,
  RUNNER_UP_POINTS,
  type Qualifiers,
} from '../src/lib/logic/scoring';

interface PredictionRow {
  id: string;
  prediction_number: number | null;
  user_id: string | null;
  name: string | null;
  submitter_name: string | null;
  group_matches: Record<string, string>;
  knockout_matches: Record<string, string>;
  champion_code: string | null;
  third_place_tiebreaker: string[] | null;
  is_approved: boolean | null;
}

function intersect(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter(x => b.has(x)).sort();
}

interface Breakdown {
  groupHits: number;
  r16: string[];
  qf: string[];
  sf: string[];
  thirdPart: string[];
  fin: string[];
  thirdWinner: boolean;
  runnerUp: boolean;
  champion: boolean;
  total: number;
}

function breakdown(
  pred: PredictionRow,
  actual: Qualifiers,
  actualResults: { match_id: string; match_type: string; result: string }[],
): Breakdown {
  const predicted = getPredictedQualifiers({
    user_id: pred.user_id ?? pred.id,
    group_matches: pred.group_matches,
    knockout_matches: pred.knockout_matches,
    champion_code: pred.champion_code,
    third_place_tiebreaker: pred.third_place_tiebreaker,
  });

  let groupHits = 0;
  for (const r of actualResults) {
    if (r.match_type === 'group' && pred.group_matches[r.match_id] === r.result) groupHits++;
  }

  const r16 = intersect(predicted.R16, actual.R16);
  const qf = intersect(predicted.QF, actual.QF);
  const sf = intersect(predicted.SF, actual.SF);
  const thirdPart = intersect(predicted.thirdParticipants, actual.thirdParticipants);
  const fin = intersect(predicted.finalParticipants, actual.finalParticipants);
  const thirdWinner = !!predicted.thirdWinner && predicted.thirdWinner === actual.thirdWinner;
  const runnerUp = !!predicted.finalRunnerUp && predicted.finalRunnerUp === actual.finalRunnerUp;
  const champion = !!predicted.finalWinner && predicted.finalWinner === actual.finalWinner;

  const total =
    groupHits * GROUP_POINTS +
    r16.length * QUALIFIER_POINTS.R16 +
    qf.length * QUALIFIER_POINTS.QF +
    sf.length * QUALIFIER_POINTS.SF +
    thirdPart.length * QUALIFIER_POINTS['3RD'] +
    fin.length * QUALIFIER_POINTS.FIN +
    (thirdWinner ? WINNER_POINTS['3RD'] : 0) +
    (runnerUp ? RUNNER_UP_POINTS : 0) +
    (champion ? WINNER_POINTS.FIN : 0);

  return { groupHits, r16, qf, sf, thirdPart, fin, thirdWinner, runnerUp, champion, total };
}

async function main() {
  const supabase = createServiceClient();

  const { data: actualResults, error: resultsError } = await getFinishedActualResults(supabase);
  if (resultsError) throw new Error(resultsError);
  console.log(`Finished actual results: ${actualResults.length} (expect 104)`);

  const { data: predictions, error: predError } = await supabase
    .from('predictions')
    .select('id, prediction_number, user_id, name, submitter_name, group_matches, knockout_matches, champion_code, third_place_tiebreaker, is_approved')
    .eq('is_complete', true);
  if (predError) throw new Error(predError.message);

  const { data: storedScores, error: scoresError } = await supabase
    .from('scores')
    .select('prediction_id, total_points, rank, calculated_at');
  if (scoresError) throw new Error(scoresError.message);
  const storedById = new Map(storedScores!.map(s => [s.prediction_id, s]));

  const actual = getActualQualifiers(actualResults, null);
  console.log('\nActual tournament outcome (from actual_results):');
  console.log(`  Champion: ${actual.finalWinner} · Runner-up: ${actual.finalRunnerUp} · 3rd-place winner: ${actual.thirdWinner}`);
  console.log(`  Finalists: ${[...actual.finalParticipants].sort().join(', ')}`);
  console.log(`  Semifinalists: ${[...actual.SF].sort().join(', ')}`);

  const rows = (predictions as PredictionRow[]).map(pred => {
    const recomputed = calculateScore(
      {
        user_id: pred.user_id ?? pred.id,
        group_matches: pred.group_matches,
        knockout_matches: pred.knockout_matches,
        champion_code: pred.champion_code,
        third_place_tiebreaker: pred.third_place_tiebreaker,
      },
      actualResults,
    );
    const bd = breakdown(pred, actual, actualResults);
    const stored = storedById.get(pred.id);
    return {
      name: pred.name?.trim() || pred.submitter_name || 'Anonymous',
      approved: pred.is_approved ?? false,
      stored: stored?.total_points ?? null,
      storedRank: stored?.rank ?? null,
      recomputed,
      bd,
      pred,
    };
  });

  rows.sort((a, b) => b.recomputed - a.recomputed);

  console.log('\n=== Three-way diff (sorted by recomputed points) ===');
  console.log('name'.padEnd(24) + 'approved'.padEnd(10) + 'stored'.padEnd(8) + 'recomputed'.padEnd(12) + 'delta'.padEnd(8) + 'breakdown-sum-check');
  let mismatches = 0;
  for (const r of rows) {
    const delta = r.stored == null ? null : r.recomputed - r.stored;
    if (delta !== 0) mismatches++;
    const sumOk = r.bd.total === r.recomputed ? 'ok' : `MISMATCH (${r.bd.total})`;
    console.log(
      r.name.padEnd(24) +
      String(r.approved).padEnd(10) +
      String(r.stored ?? '—').padEnd(8) +
      String(r.recomputed).padEnd(12) +
      String(delta ?? '—').padEnd(8) +
      sumOk,
    );
  }
  console.log(`\n${mismatches} of ${rows.length} predictions differ from the stored scores snapshot.`);

  console.log('\n=== Line-item audit — top 5 (approved only) ===');
  const top = rows.filter(r => r.approved).slice(0, 5);
  for (const r of top) {
    const b = r.bd;
    console.log(`\n${r.name} — ${r.recomputed} pts (stored: ${r.stored})`);
    console.log(`  Group hits:            ${b.groupHits} × ${GROUP_POINTS} = ${b.groupHits * GROUP_POINTS}`);
    console.log(`  R32 wins (→R16):       ${b.r16.length} × ${QUALIFIER_POINTS.R16} = ${b.r16.length * QUALIFIER_POINTS.R16}  [${b.r16.join(', ')}]`);
    console.log(`  Reached QF:            ${b.qf.length} × ${QUALIFIER_POINTS.QF} = ${b.qf.length * QUALIFIER_POINTS.QF}  [${b.qf.join(', ')}]`);
    console.log(`  Reached SF:            ${b.sf.length} × ${QUALIFIER_POINTS.SF} = ${b.sf.length * QUALIFIER_POINTS.SF}  [${b.sf.join(', ')}]`);
    console.log(`  In 3rd-place match:    ${b.thirdPart.length} × ${QUALIFIER_POINTS['3RD']} = ${b.thirdPart.length * QUALIFIER_POINTS['3RD']}  [${b.thirdPart.join(', ')}]`);
    console.log(`  Reached Final:         ${b.fin.length} × ${QUALIFIER_POINTS.FIN} = ${b.fin.length * QUALIFIER_POINTS.FIN}  [${b.fin.join(', ')}]`);
    console.log(`  3rd-place winner:      ${b.thirdWinner ? `+${WINNER_POINTS['3RD']}` : '0'}`);
    console.log(`  Runner-up:             ${b.runnerUp ? `+${RUNNER_UP_POINTS}` : '0'}`);
    console.log(`  Champion (${String(r.pred.champion_code).padEnd(6)}):     ${b.champion ? `+${WINNER_POINTS.FIN}` : '0'}`);
    console.log(`  TOTAL:                 ${b.total}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
