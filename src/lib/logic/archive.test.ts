import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { archive, archivedMatchesById } from '../client/archive';
import shared from '../../data/archive/shared.json';
import { computePredictionResults } from '../../hooks/usePredictionResults';
import { computeTiedRanks } from '../services/leaderboard-position';

test('archive contains all final outcomes and a resolved champion', () => {
  assert.equal(archive.matches.length, 104);
  assert.equal(new Set(archive.matches.map(m => m.localMatchId)).size, 104);
  for (const match of archive.matches) {
    assert.equal(match.status, 'FINISHED');
    assert.ok(match.actualResult);
    for (const flag of [match.homeFlag, match.awayFlag]) {
      assert.ok(flag?.startsWith('/images/flags/'));
      assert.ok(existsSync(`public${flag}`));
    }
  }
  const final = archivedMatchesById['FIN-1'];
  assert.equal(archive.championCode, final.actualResult === 'home' ? final.homeCode : final.awayCode);
});

test('every archived detail score matches its frozen leaderboard score', () => {
  for (const prediction of archive.predictions) {
    const computed = computePredictionResults(prediction, archivedMatchesById).summary.totalPoints;
    assert.equal(computed, prediction.total_points, `Prediction ${prediction.prediction_number}`);
  }
  assert.equal(archive.leaderboard.length, archive.predictions.filter(p => p.is_approved).length);
  const ranks = computeTiedRanks(archive.leaderboard, p => p.total_points);
  assert.equal(ranks[0], 1);
  for (let i = 1; i < ranks.length; i++) assert.ok(ranks[i] >= ranks[i-1]);
});

test('public snapshot excludes private fields and shared-token index', () => {
  const forbidden = /^(email|submitter_email|pdf_path|user_email|share_token|token|id|prediction_id)$/;
  function inspect(value: unknown) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      assert.ok(!forbidden.test(key), `Unexpected private field: ${key}`);
      if (key === 'user_id') assert.match(String(child), /^prediction-\d+$/);
      inspect(child);
    }
  }
  inspect(archive);
  assert.equal(shared.length, 27);
  assert.equal(new Set(shared.map(p => p.token)).size, shared.length);
  for (const entry of shared) {
    inspect(entry.prediction);
    assert.ok(archive.predictions.some(p => p.prediction_number === entry.prediction.prediction_number));
  }
});

test('archive routes and demo have no submission or browser-draft persistence paths', () => {
  assert.ok(!existsSync('src/app/api'));
  assert.ok(!existsSync('src/app/admin'));
  for (const path of ['src/app/page.tsx', 'src/components/champion/DemoChampion.tsx', 'src/components/bracket/BracketView.tsx']) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /fetch\(|localStorage|sessionStorage|savePredictions|AuthProvider|ChampionOverlay/);
  }
});
