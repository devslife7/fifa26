import assert from 'node:assert/strict';
import test from 'node:test';
import type { LiveMatch, MatchResult } from '@/types';
import { allGroupMatches, KNOCKOUT_VENUES } from '@/data/matches';
import { getGroupQualifiers } from './standings';
import {
  buildActualGroupResults,
  buildR32TeamSlotIndex,
  buildR32DisplayRows,
} from './actual-bracket';

function lm(partial: Partial<LiveMatch> & { apiMatchId: number }): LiveMatch {
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
    actualResult: null,
    stage: 'GROUP',
    group: null,
    ...partial,
  };
}

// Finished fixtures for the given groups, every match won by the home side.
function finishedGroups(...groups: string[]): LiveMatch[] {
  return allGroupMatches
    .filter(m => groups.includes(m.group))
    .map((m, i) =>
      lm({
        apiMatchId: 1000 + i,
        localMatchId: m.id,
        stage: 'GROUP',
        group: m.group,
        status: 'FINISHED',
        actualResult: 'home',
        homeCode: m.home,
        awayCode: m.away,
      }),
    );
}

const qualifiers = (...groups: string[]) =>
  getGroupQualifiers(
    Object.fromEntries(
      allGroupMatches
        .filter(m => groups.includes(m.group))
        .map(m => [m.id, 'home' as MatchResult]),
    ),
  );

test('buildActualGroupResults reads finished group fixtures', () => {
  const results = buildActualGroupResults([
    ...finishedGroups('A'),
    lm({ apiMatchId: 5, localMatchId: 'A-1', status: 'IN_PLAY', actualResult: null }),
  ]);
  assert.equal(results['A-1'], 'home');
  assert.equal(Object.keys(results).length, 6);
});

test('team-slot index maps qualified teams to their FIFA R32 slot', () => {
  // R32-1 = M73 = Runner-up A vs Runner-up B.
  const idxAB = buildR32TeamSlotIndex(finishedGroups('A', 'B'));
  const { runnersUp } = qualifiers('A', 'B');
  assert.equal(idxAB.get(runnersUp.A), 'R32-1');
  assert.equal(idxAB.get(runnersUp.B), 'R32-1');
  // R32-2 = M74 = Winner E vs a best-third.
  const idxE = buildR32TeamSlotIndex(finishedGroups('E'));
  assert.equal(idxE.get(qualifiers('E').winners.E), 'R32-2');
});

test('buildR32DisplayRows returns all 16 slots', () => {
  assert.equal(buildR32DisplayRows([]).length, 16);
});

test('does NOT fabricate Germany vs Morocco: the third-place side stays unresolved', () => {
  // Group E finished (Germany = Winner E), API has only Germany assigned to its R32 fixture.
  const matches = [
    ...finishedGroups('E'),
    lm({ apiMatchId: 537415, stage: 'R32', homeCode: 'DE', awayCode: null, status: 'TIMED' }),
  ];
  const winnerE = qualifiers('E').winners.E; // 'DE'
  const row = buildR32DisplayRows(matches).find(r => r.localMatchId === 'R32-2')!;

  assert.equal(row.homeCode, winnerE);
  assert.equal(row.awayCode, null); // best-third undecided → label, never a fabricated team
  assert.equal(row.apiMatchId, 537415); // joined to the API fixture by team identity
  // No row should pair Germany with a concrete opponent yet.
  assert.ok(!buildR32DisplayRows(matches).some(r => r.homeCode === 'DE' && r.awayCode));
});

test('resolved slot with no API fixture renders a static scheduled row', () => {
  const matches = finishedGroups('A', 'B');
  const { runnersUp } = qualifiers('A', 'B');
  const row = buildR32DisplayRows(matches).find(r => r.localMatchId === 'R32-1')!;

  assert.equal(row.homeCode, runnersUp.A);
  assert.equal(row.awayCode, runnersUp.B);
  assert.equal(row.status, 'SCHEDULED');
  assert.equal(row.apiMatchId, -1001); // synthetic, stable per slot
  assert.equal(row.venue, KNOCKOUT_VENUES['R32-1']);
});

test('overlays live API data, orienting teams/score onto the slot', () => {
  const { runnersUp } = qualifiers('A', 'B');
  // API reports the fixture with sides swapped relative to our slot (home = RU-B).
  const api = lm({
    apiMatchId: 99001,
    stage: 'R32',
    homeCode: runnersUp.B,
    awayCode: runnersUp.A,
    status: 'FINISHED',
    actualResult: 'home', // RU-B won
    score: { home: 2, away: 1 },
  });
  const row = buildR32DisplayRows([...finishedGroups('A', 'B'), api]).find(
    r => r.localMatchId === 'R32-1',
  )!;

  assert.equal(row.homeCode, runnersUp.A); // re-oriented to slot home
  assert.equal(row.awayCode, runnersUp.B);
  assert.deepEqual(row.score, { home: 1, away: 2 }); // score swapped to match
  assert.equal(row.actualResult, 'away'); // RU-B (now away) won
  assert.equal(row.apiMatchId, 99001);
});
