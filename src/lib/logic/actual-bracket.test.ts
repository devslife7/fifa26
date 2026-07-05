import assert from 'node:assert/strict';
import test from 'node:test';
import type { LiveMatch, MatchResult } from '@/types';
import { allGroupMatches, KNOCKOUT_VENUES } from '@/data/matches';
import { getGroupQualifiers } from './standings';
import {
  buildActualGroupResults,
  buildR32TeamSlotIndex,
  buildR32DisplayRows,
  buildKnockoutDisplayRows,
  bindDeepKnockoutSlots,
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
    penalties: null,
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

// --- buildKnockoutDisplayRows ---

// Build synthetic finished R32 API fixtures from bracket-computed slot teams.
function finishedR32Fixtures(groupMatches: LiveMatch[]): LiveMatch[] {
  return buildR32DisplayRows(groupMatches)
    .filter(s => s.homeCode && s.awayCode)
    .map((s, i) =>
      lm({
        apiMatchId: 5000 + i,
        stage: 'R32',
        homeCode: s.homeCode,
        awayCode: s.awayCode,
        status: 'FINISHED',
        actualResult: 'home',
      }),
    );
}

test('buildKnockoutDisplayRows returns 16 rows (R16 through FIN)', () => {
  assert.equal(buildKnockoutDisplayRows([]).length, 16);
});

test('R16 teams populated after all R32 finish', () => {
  const groups = finishedGroups('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L');
  const matches = [...groups, ...finishedR32Fixtures(groups)];
  const rows = buildKnockoutDisplayRows(matches);
  const r16 = rows.filter(r => r.localMatchId?.startsWith('R16'));
  assert.equal(r16.length, 8);
  for (const row of r16) {
    assert.ok(row.homeCode, `${row.localMatchId} missing homeCode`);
    assert.ok(row.awayCode, `${row.localMatchId} missing awayCode`);
  }
});

test('R16 teams stay null when no R32 results', () => {
  const groups = finishedGroups('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L');
  const rows = buildKnockoutDisplayRows(groups);
  const r16 = rows.filter(r => r.localMatchId?.startsWith('R16'));
  assert.equal(r16.length, 8);
  for (const row of r16) {
    assert.equal(row.homeCode, null);
    assert.equal(row.awayCode, null);
  }
});

test('API-supplied R16 team codes are not overwritten by bracket', () => {
  const groups = finishedGroups('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L');
  const r32 = finishedR32Fixtures(groups);
  // Find which teams the bracket puts in R16-1 so we can create a matching API fixture.
  const r16Slot = buildKnockoutDisplayRows([...groups, ...r32]).find(
    r => r.localMatchId === 'R16-1',
  )!;
  assert.ok(r16Slot.homeCode, 'prerequisite: R16-1 must have bracket teams');

  const r16Api = lm({
    apiMatchId: 9001,
    stage: 'R16',
    homeCode: r16Slot.homeCode,
    awayCode: r16Slot.awayCode,
    status: 'TIMED',
    actualResult: null,
  });
  const rows = buildKnockoutDisplayRows([...groups, ...r32, r16Api]);
  const row = rows.find(r => r.localMatchId === 'R16-1')!;
  assert.equal(row.apiMatchId, 9001);           // joined to API fixture
  assert.equal(row.homeCode, r16Slot.homeCode); // API code preserved, not overwritten
  assert.equal(row.awayCode, r16Slot.awayCode);
});

// --- bindDeepKnockoutSlots ---

// Bound + finished R32 fixtures (home side wins), giving every R16 slot real teams.
function boundFinishedR32Fixtures(groupMatches: LiveMatch[]): LiveMatch[] {
  return buildR32DisplayRows(groupMatches)
    .filter(s => s.homeCode && s.awayCode)
    .map((s, i) =>
      lm({
        apiMatchId: 5000 + i,
        localMatchId: s.localMatchId,
        stage: 'R32',
        homeCode: s.homeCode,
        awayCode: s.awayCode,
        status: 'FINISHED',
        actualResult: 'home',
      }),
    );
}

test('binds R16 fixtures to their slot by team identity, correcting wrong ids', () => {
  const groups = finishedGroups('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L');
  const r32 = boundFinishedR32Fixtures(groups);
  const r16Slots = buildKnockoutDisplayRows([...groups, ...r32]).filter(r =>
    r.localMatchId?.startsWith('R16'),
  );

  // Regression shape of the Morocco bug: three finished R16 fixtures, one carrying
  // a stale binding that collides with another slot, one with flipped home/away.
  const fixtures = [
    lm({
      apiMatchId: 9101,
      localMatchId: 'R16-1', // stale: actually the R16-2 matchup
      stage: 'R16',
      homeCode: r16Slots[1].homeCode,
      awayCode: r16Slots[1].awayCode,
      status: 'FINISHED',
      actualResult: 'away',
    }),
    lm({
      apiMatchId: 9102,
      localMatchId: null,
      stage: 'R16',
      homeCode: r16Slots[0].awayCode, // flipped orientation
      awayCode: r16Slots[0].homeCode,
      status: 'FINISHED',
      actualResult: 'home',
    }),
    lm({
      apiMatchId: 9103,
      localMatchId: 'R16-1', // stale collision
      stage: 'R16',
      homeCode: r16Slots[2].homeCode,
      awayCode: r16Slots[2].awayCode,
      status: 'FINISHED',
      actualResult: 'away',
    }),
  ];

  const matches = [...groups, ...r32, ...fixtures];
  bindDeepKnockoutSlots(matches);

  assert.equal(fixtures[0].localMatchId, r16Slots[1].localMatchId);
  assert.equal(fixtures[1].localMatchId, r16Slots[0].localMatchId);
  assert.equal(fixtures[2].localMatchId, r16Slots[2].localMatchId);
});

test('propagates R16 winners so QF fixtures bind to their slot', () => {
  const groups = finishedGroups('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L');
  const r32 = boundFinishedR32Fixtures(groups);
  const r16Slots = buildKnockoutDisplayRows([...groups, ...r32]).filter(r =>
    r.localMatchId?.startsWith('R16'),
  );
  // All eight R16 games finish (home side wins).
  const r16 = r16Slots.map((s, i) =>
    lm({
      apiMatchId: 9200 + i,
      localMatchId: null,
      stage: 'R16',
      homeCode: s.homeCode,
      awayCode: s.awayCode,
      status: 'FINISHED',
      actualResult: 'home',
    }),
  );
  // QF-1 pairs the winners of R16-1 and R16-2 (Article 12.8: M97 = W89 v W90).
  const w = (slotId: string) => r16Slots.find(s => s.localMatchId === slotId)!.homeCode;
  const qf = lm({
    apiMatchId: 9301,
    localMatchId: null,
    stage: 'QF',
    homeCode: w('R16-1'),
    awayCode: w('R16-2'),
    status: 'TIMED',
  });

  bindDeepKnockoutSlots([...groups, ...r32, ...r16, qf]);
  assert.equal(qf.localMatchId, 'QF-1');
});

test('leaves deep knockout fixtures unbound when teams cannot be resolved (partial fetch)', () => {
  const orphan = lm({
    apiMatchId: 9401,
    localMatchId: null,
    stage: 'R16',
    homeCode: 'BR',
    awayCode: 'NO',
    status: 'FINISHED',
    actualResult: 'away',
  });
  bindDeepKnockoutSlots([orphan]); // no group/R32 context to propagate from
  assert.equal(orphan.localMatchId, null);
});
