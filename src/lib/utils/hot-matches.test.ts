import assert from 'node:assert/strict';
import test from 'node:test';
import type { LiveMatch } from '@/types';
import {
  buildHotMatchRefreshQuery,
  getHotUnfinishedApiIds,
  getHotUnfinishedMatches,
  isWinnerPending,
} from './hot-matches';

const NOW = Date.parse('2026-07-14T20:00:00Z');

function match(partial: Partial<LiveMatch> & { apiMatchId: number }): LiveMatch {
  return {
    localMatchId: `A-${partial.apiMatchId}`,
    homeCode: 'MX',
    awayCode: 'ZA',
    homeName: 'Mexico',
    awayName: 'South Africa',
    homeShortName: 'Mexico',
    awayShortName: 'South Africa',
    homeFlag: null,
    awayFlag: null,
    utcDate: '2026-07-14T19:00:00Z',
    status: 'TIMED',
    venue: null,
    score: null,
    penalties: null,
    actualResult: null,
    stage: 'GROUP',
    group: 'A',
    ...partial,
  };
}

test('a finished match stays hot until the authoritative result arrives', () => {
  const pending = match({ apiMatchId: 1, status: 'FINISHED', score: { home: 2, away: 0 } });
  const settled = match({ apiMatchId: 2, status: 'FINISHED', actualResult: 'home', score: { home: 2, away: 0 } });

  assert.equal(isWinnerPending(pending), true);
  assert.equal(isWinnerPending(settled), false);
  assert.deepEqual(getHotUnfinishedMatches([pending, settled], NOW), [pending]);
});

test('live and winner-pending IDs are batched into one targeted refresh query', () => {
  const live = match({ apiMatchId: 11, status: 'IN_PLAY' });
  const pending = match({ apiMatchId: 12, status: 'FINISHED' });
  const settled = match({ apiMatchId: 13, status: 'FINISHED', actualResult: 'away' });

  assert.deepEqual(getHotUnfinishedApiIds([live, pending, settled], NOW), [11, 12]);

  // buildHotMatchRefreshQuery uses the real clock, so keep these matches active
  // independently of kickoff time.
  live.utcDate = new Date().toISOString();
  pending.utcDate = new Date().toISOString();
  assert.equal(buildHotMatchRefreshQuery([live, pending, settled]), 'mode=ids&ids=11%2C12');
});

test('polling stops once every finished match has an official result', () => {
  const settled = match({ apiMatchId: 21, status: 'FINISHED', actualResult: 'draw' });
  assert.deepEqual(getHotUnfinishedApiIds([settled], NOW), []);
  assert.equal(buildHotMatchRefreshQuery([settled]), null);
});
