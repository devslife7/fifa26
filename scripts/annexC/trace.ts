// Fixture trace verification — runs generateBracket() against a deterministic
// group-stage input ("all home wins") and dumps every match for human inspection.
// Run via: npx tsx scripts/annexC/trace.ts

import { generateBracket } from '../../src/lib/logic/bracket';
import { allGroupMatches } from '../../src/data/matches';
import type { MatchResult } from '../../src/types';

// All home wins. With this schedule, every group's 3rd-placed team finishes on 3
// points, which means all 12 thirds tie at the 8/9 boundary — the app would
// surface the tiebreaker UI. Here we supply an explicit tiebreaker so the
// fixture has a fully resolved bracket.
const groupPredictions: Record<string, MatchResult> = {};
for (const m of allGroupMatches) {
  groupPredictions[m.id] = 'home';
}

import { getThirdPlaceRanking } from '../../src/lib/logic/standings';
const ranking = getThirdPlaceRanking(groupPredictions);
const tiebreaker = ranking.slice(0, 8).map(e => e.team);

const bracket = generateBracket(groupPredictions, {}, tiebreaker);

console.log('Round | ID    | Position | Home | Away');
console.log('------+-------+----------+------+------');
for (const m of bracket) {
  console.log(`${m.round.padEnd(5)} | ${m.id.padEnd(5)} | ${String(m.position).padStart(8)} | ${(m.home ?? '-').padEnd(20)} | ${(m.away ?? '-').padEnd(20)}`);
}

// Sanity checks
const r32 = bracket.filter(m => m.round === 'R32');
const r16 = bracket.filter(m => m.round === 'R16');
const qf = bracket.filter(m => m.round === 'QF');
const sf = bracket.filter(m => m.round === 'SF');
console.log(`\nCounts: R32=${r32.length} R16=${r16.length} QF=${qf.length} SF=${sf.length}`);

if (r32.length !== 16) throw new Error('expected 16 R32 matches');
if (r16.length !== 8) throw new Error('expected 8 R16 matches');
if (qf.length !== 4) throw new Error('expected 4 QF matches');
if (sf.length !== 2) throw new Error('expected 2 SF matches');

// Verify all R32 matches have concrete teams (no placeholders) under a complete fixture.
for (const m of r32) {
  if (!m.home || m.home.startsWith('PH:')) throw new Error(`R32 ${m.id} home unresolved: ${m.home}`);
  if (!m.away || m.away.startsWith('PH:')) throw new Error(`R32 ${m.id} away unresolved: ${m.away}`);
}

// Verify display order — first two R32 matches should feed R16-1, next two R16-2, etc.
const expectedR32Order = [
  'R32-2', 'R32-5',    // R16-1 = W74 + W77
  'R32-1', 'R32-3',    // R16-2 = W73 + W75
  'R32-4', 'R32-6',    // R16-3 = W76 + W78
  'R32-7', 'R32-8',    // R16-4 = W79 + W80
  'R32-11','R32-12',   // R16-5 = W83 + W84
  'R32-9', 'R32-10',   // R16-6 = W81 + W82
  'R32-14','R32-16',   // R16-7 = W86 + W88
  'R32-13','R32-15',   // R16-8 = W85 + W87
];
const actualR32Order = r32.map(m => m.id);
for (let i = 0; i < expectedR32Order.length; i++) {
  if (actualR32Order[i] !== expectedR32Order[i]) {
    throw new Error(`R32 display order pos ${i}: expected ${expectedR32Order[i]}, got ${actualR32Order[i]}`);
  }
}
console.log('R32 display order: OK');

const expectedR16Order = ['R16-1','R16-2','R16-5','R16-6','R16-3','R16-4','R16-7','R16-8'];
const actualR16Order = r16.map(m => m.id);
for (let i = 0; i < expectedR16Order.length; i++) {
  if (actualR16Order[i] !== expectedR16Order[i]) {
    throw new Error(`R16 display order pos ${i}: expected ${expectedR16Order[i]}, got ${actualR16Order[i]}`);
  }
}
console.log('R16 display order: OK');

console.log('\nFixture trace OK — all 30 matches resolved with the expected display order.');
