import assert from 'node:assert/strict';
import test from 'node:test';
import { filterFinishedActualResults, type ActualResult } from './actual-results';
import {
  computeLeaderboardPositionChanges,
  type LeaderboardPredictionRow,
} from './leaderboard-position';

function prediction(
  id: string,
  name: string,
  groupMatches: Record<string, string>,
): LeaderboardPredictionRow {
  return {
    id,
    display_name: name,
    group_matches: groupMatches,
    knockout_matches: {},
    champion_code: null,
    third_place_tiebreaker: null,
  };
}

function changeFor(changes: ReturnType<typeof computeLeaderboardPositionChanges>, id: string): number | undefined {
  return changes.find(change => change.prediction_id === id)?.position_change;
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

test('does not show movement when a tied leader becomes the outright leader', () => {
  const predictions = [
    prediction('marcos', 'Marcos', { 'M-1': 'home', 'M-2': 'home', 'M-3': 'draw' }),
    prediction('alexis', 'Alexis', { 'M-1': 'home', 'M-2': 'home', 'M-3': 'home' }),
    prediction('emilio', 'Emilio', { 'M-1': 'home', 'M-2': 'home', 'M-3': 'away' }),
  ];
  const actualResults: ActualResult[] = [
    { match_id: 'M-1', match_type: 'group', result: 'home', winning_team: 'A' },
    { match_id: 'M-2', match_type: 'group', result: 'home', winning_team: 'A' },
    { match_id: 'M-3', match_type: 'group', result: 'draw', winning_team: null },
  ];

  const changes = computeLeaderboardPositionChanges(predictions, actualResults, { matchId: 'M-3', utcDate: '' });

  assert.equal(changeFor(changes, 'marcos'), 0);
});

test('shows positive movement only when displayed dense rank improves', () => {
  const predictions = [
    prediction('leader', 'Leader', { 'M-1': 'home', 'M-2': 'home', 'M-3': 'away' }),
    prediction('chaser', 'Chaser', { 'M-1': 'away', 'M-2': 'home', 'M-3': 'draw' }),
  ];
  const actualResults: ActualResult[] = [
    { match_id: 'M-1', match_type: 'group', result: 'home', winning_team: 'A' },
    { match_id: 'M-2', match_type: 'group', result: 'home', winning_team: 'A' },
    { match_id: 'M-3', match_type: 'group', result: 'draw', winning_team: null },
  ];

  const changes = computeLeaderboardPositionChanges(predictions, actualResults, { matchId: 'M-3', utcDate: '' });

  assert.equal(changeFor(changes, 'chaser'), 1);
});

test('shows negative movement only when displayed dense rank worsens', () => {
  const predictions = [
    prediction('leader', 'Leader', { 'M-1': 'home', 'M-2': 'home', 'M-3': 'away' }),
    prediction('winner', 'Winner', { 'M-1': 'home', 'M-2': 'home', 'M-3': 'draw' }),
  ];
  const actualResults: ActualResult[] = [
    { match_id: 'M-1', match_type: 'group', result: 'home', winning_team: 'A' },
    { match_id: 'M-2', match_type: 'group', result: 'home', winning_team: 'A' },
    { match_id: 'M-3', match_type: 'group', result: 'draw', winning_team: null },
  ];

  const changes = computeLeaderboardPositionChanges(predictions, actualResults, { matchId: 'M-3', utcDate: '' });

  assert.equal(changeFor(changes, 'leader'), -1);
});
