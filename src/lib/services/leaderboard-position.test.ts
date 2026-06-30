import assert from 'node:assert/strict';
import test from 'node:test';
import { filterFinishedActualResults, type ActualResult } from './actual-results';
import {
  applyRankSnapshot,
  positionChangeFromRanks,
  type ExistingRankRow,
  type ScoreRowForRanking,
} from './leaderboard-position';

const TODAY = '2026-06-29';
const YESTERDAY = '2026-06-28';

function scoreRow(id: string, name: string, points: number): ScoreRowForRanking {
  return { prediction_id: id, total_points: points, display_name: name, name: null };
}

function existing(
  id: string,
  points: number,
  rank: number | null,
  previousRank: number | null,
  previousRankDate: string | null = null,
): ExistingRankRow {
  return { prediction_id: id, total_points: points, rank, previous_rank: previousRank, previous_rank_date: previousRankDate };
}

function changeFor(
  rows: ReturnType<typeof applyRankSnapshot>,
  id: string,
): number | undefined {
  const row = rows.find(r => r.prediction_id === id)!;
  return positionChangeFromRanks(row.rank, row.previous_rank);
}

test('filters actual results to fixtures that are finished', () => {
  const actualResults: ActualResult[] = [
    { match_id: 'A-1', match_type: 'group', result: 'home', winning_team: 'MX' },
    { match_id: 'A-2', match_type: 'group', result: 'home', winning_team: 'KR' },
    { match_id: 'A-3', match_type: 'group', result: 'home', winning_team: 'CZ' },
    { match_id: 'A-4', match_type: 'group', result: 'away', winning_team: 'KR' },
    { match_id: 'B-1', match_type: 'group', result: 'draw', winning_team: null },
  ];

  const filtered = filterFinishedActualResults(actualResults, [
    { local_match_id: 'A-1', status: 'FINISHED' },
    { local_match_id: 'A-2', status: 'FINISHED' },
    { local_match_id: 'A-3', status: 'TIMED' },
    { local_match_id: 'A-4', status: 'TIMED' },
    { local_match_id: 'B-1', status: 'FINISHED' },
  ]);

  assert.deepEqual(filtered.map(result => result.match_id), ['A-1', 'A-2', 'B-1']);
});

test("first recalc of the day captures the full climb from yesterday's rank", () => {
  // Yesterday Jason finished 4th; today he climbs to a tie at the top — ▲3.
  // Baselines are stamped YESTERDAY, so this recalc re-snapshots to today.
  const existingRows = [
    existing('marinescaero', 52, 1, 1, YESTERDAY),
    existing('diana', 51, 2, 2, YESTERDAY),
    existing('ermias', 50, 3, 3, YESTERDAY),
    existing('jason', 49, 4, 4, YESTERDAY),
  ];
  const newRows = [
    scoreRow('marinescaero', 'marinescaero', 52),
    scoreRow('diana', 'diana mendez', 51),
    scoreRow('ermias', 'Ermias', 50),
    scoreRow('jason', 'Jason', 52),
  ];

  const result = applyRankSnapshot(existingRows, newRows, TODAY);

  const jason = result.find(r => r.prediction_id === 'jason')!;
  assert.equal(jason.rank, 1);
  assert.equal(jason.previous_rank, 4);
  assert.equal(jason.previous_rank_date, TODAY);
  assert.equal(changeFor(result, 'jason'), 3);
  // Players who did not move show no change rather than a spurious drop.
  assert.equal(changeFor(result, 'diana'), 0);
});

test('unrelated scoring later in the day preserves an existing arrow', () => {
  // The core regression: Jason already climbed to #1 today (baseline rank 4).
  // Someone else (ermias) now scores; Jason's baseline must NOT be wiped.
  const existingRows = [
    existing('jason', 52, 1, 4, TODAY),
    existing('marinescaero', 52, 2, 1, TODAY),
    existing('diana', 51, 3, 2, TODAY),
    existing('ermias', 40, 4, 3, TODAY),
  ];
  const newRows = [
    scoreRow('jason', 'Jason', 52),
    scoreRow('marinescaero', 'marinescaero', 52),
    scoreRow('diana', 'diana mendez', 51),
    scoreRow('ermias', 'Ermias', 50), // ermias gains points but stays last
  ];

  const result = applyRankSnapshot(existingRows, newRows, TODAY);

  const jason = result.find(r => r.prediction_id === 'jason')!;
  assert.equal(jason.rank, 1);
  assert.equal(jason.previous_rank, 4);
  assert.equal(changeFor(result, 'jason'), 3); // arrow still ▲3
});

test('records downward movement when overtaken on the first recalc of the day', () => {
  const existingRows = [
    existing('leader', 10, 1, 1, YESTERDAY),
    existing('chaser', 8, 2, 2, YESTERDAY),
  ];
  const newRows = [
    scoreRow('leader', 'Leader', 10),
    scoreRow('chaser', 'Chaser', 12),
  ];

  const result = applyRankSnapshot(existingRows, newRows, TODAY);

  assert.equal(changeFor(result, 'chaser'), 1);
  assert.equal(changeFor(result, 'leader'), -1);
});

test('day rollover re-baselines so arrows reset until the user moves again', () => {
  // Jason ended yesterday at #1 with an arrow; the first recalc of the new day
  // re-anchors his baseline to his current rank, so the arrow resets to "—".
  const existingRows = [
    existing('jason', 52, 1, 4, YESTERDAY),
    existing('diana', 51, 2, 1, YESTERDAY),
  ];
  const newRows = [
    scoreRow('jason', 'Jason', 52),
    scoreRow('diana', 'diana mendez', 51),
  ];

  const result = applyRankSnapshot(existingRows, newRows, TODAY);

  const jason = result.find(r => r.prediction_id === 'jason')!;
  assert.equal(jason.previous_rank, 1); // yesterday's final rank
  assert.equal(jason.previous_rank_date, TODAY);
  assert.equal(changeFor(result, 'jason'), 0);
});

test('a newly added prediction baselines to its own rank and shows no change', () => {
  const existingRows = [existing('a', 10, 1, 1, TODAY)];
  const newRows = [
    scoreRow('a', 'A', 10),
    scoreRow('newcomer', 'Newcomer', 5),
  ];

  const result = applyRankSnapshot(existingRows, newRows, TODAY);

  const newcomer = result.find(r => r.prediction_id === 'newcomer')!;
  assert.equal(newcomer.rank, 2);
  assert.equal(newcomer.previous_rank, 2); // no spurious jump on first appearance
  assert.equal(newcomer.previous_rank_date, TODAY);
  assert.equal(changeFor(result, 'newcomer'), 0);
});

test('positionChangeFromRanks returns undefined without a baseline', () => {
  assert.equal(positionChangeFromRanks(1, null), undefined);
  assert.equal(positionChangeFromRanks(null, 1), undefined);
  assert.equal(positionChangeFromRanks(2, 5), 3);
});
