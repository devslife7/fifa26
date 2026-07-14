import assert from 'node:assert/strict';
import test from 'node:test';
import type { LiveMatch } from '@/types';
import { finishedMatchesToActualResults } from './sync-matches';

function fixture(partial: Partial<LiveMatch> & { apiMatchId: number }): LiveMatch {
  return {
    localMatchId: null,
    homeCode: null,
    awayCode: null,
    homeName: null,
    awayName: null,
    homeShortName: null,
    awayShortName: null,
    homeFlag: null,
    awayFlag: null,
    utcDate: '2026-06-20T18:00:00Z',
    status: 'SCHEDULED',
    venue: null,
    score: null,
    penalties: null,
    actualResult: null,
    stage: 'GROUP',
    group: null,
    ...partial,
  };
}

test('only finished, locally-bound fixtures are bridged into scoring results', () => {
  const rows = finishedMatchesToActualResults([
    fixture({
      apiMatchId: 1,
      localMatchId: 'A-1',
      status: 'FINISHED',
      actualResult: 'home',
      homeCode: 'MX',
      awayCode: 'ZA',
    }),
    fixture({
      apiMatchId: 2,
      localMatchId: 'A-2',
      status: 'IN_PLAY',
      actualResult: 'away',
      homeCode: 'KR',
      awayCode: 'CZ',
    }),
    fixture({ apiMatchId: 3, status: 'FINISHED', actualResult: 'draw' }),
  ]);

  assert.deepEqual(rows, [{
    match_id: 'A-1',
    match_type: 'group',
    result: 'home',
    winning_team: 'MX',
  }]);
});

test('finished knockout winners and group draws are bridged correctly', () => {
  const rows = finishedMatchesToActualResults([
    fixture({
      apiMatchId: 4,
      localMatchId: 'R32-1',
      stage: 'R32',
      status: 'FINISHED',
      actualResult: 'away',
      homeCode: 'CA',
      awayCode: 'CH',
    }),
    fixture({
      apiMatchId: 5,
      localMatchId: 'B-1',
      status: 'FINISHED',
      actualResult: 'draw',
      homeCode: 'BR',
      awayCode: 'MA',
    }),
  ]);

  assert.deepEqual(rows, [
    { match_id: 'R32-1', match_type: 'knockout', result: 'away', winning_team: 'CH' },
    { match_id: 'B-1', match_type: 'group', result: 'draw', winning_team: null },
  ]);
});
