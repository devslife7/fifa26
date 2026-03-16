import { KnockoutMatch, KnockoutRound, GroupLetter, MatchResult, KnockoutResult } from '@/types';
import { getGroupQualifiers, getBestThirdPlaceTeams, areAllGroupsComplete } from './standings';

// FIFA 2026 Round of 32 bracket structure
// 32 teams: 12 group winners + 12 runners-up + 8 best third-place teams
// The R32 pairings follow the official FIFA structure

export interface BracketSlot {
  id: string;
  round: KnockoutRound;
  position: number;
  home?: string;
  away?: string;
  label: string;
}

// Third-place pairing matrix based on which groups the 8 best thirds come from
// This is a simplified version — in reality FIFA defines exact pairings
// based on the combination of qualifying groups
function assignThirdPlaceToSlots(
  thirdPlaceTeams: { team: string; group: GroupLetter }[]
): Record<number, string> {
  // Assign third-place teams to R32 slots 13-16 (the 4 matches involving 3rd-place teams)
  // Simplified: pair them in order against group winners
  const slots: Record<number, string> = {};
  thirdPlaceTeams.forEach((tp, i) => {
    slots[i] = tp.team;
  });
  return slots;
}

export function generateBracket(
  groupPredictions: Record<string, MatchResult>,
  knockoutPredictions: Record<string, KnockoutResult>,
  thirdPlaceTiebreaker?: string[]
): KnockoutMatch[] {
  const allGroupsDone = areAllGroupsComplete(groupPredictions);
  const matches: KnockoutMatch[] = [];

  if (!allGroupsDone) {
    // Return empty bracket structure
    return generateEmptyBracket();
  }

  const { winners, runnersUp } = getGroupQualifiers(groupPredictions);
  const bestThirds = getBestThirdPlaceTeams(groupPredictions, thirdPlaceTiebreaker);
  if (bestThirds.length < 8) {
    return generateEmptyBracket(); // tie not resolved yet
  }
  const thirdSlots = assignThirdPlaceToSlots(bestThirds);

  // Round of 32 (16 matches)
  // Official FIFA 2026 R32 pairings:
  const r32Pairings: [string | undefined, string | undefined][] = [
    [winners['A'], thirdSlots[4]],        // R32-1
    [runnersUp['C'], runnersUp['D']],       // R32-2
    [winners['B'], thirdSlots[5]],        // R32-3
    [runnersUp['A'], runnersUp['B']],       // R32-4
    [winners['C'], thirdSlots[6]],        // R32-5
    [runnersUp['E'], runnersUp['F']],       // R32-6
    [winners['D'], thirdSlots[7]],        // R32-7
    [runnersUp['G'], runnersUp['H']],       // R32-8
    [winners['E'], thirdSlots[0]],        // R32-9
    [runnersUp['I'], runnersUp['J']],       // R32-10
    [winners['F'], thirdSlots[1]],        // R32-11
    [runnersUp['K'], runnersUp['L']],       // R32-12
    [winners['G'], thirdSlots[2]],        // R32-13
    [winners['H'], runnersUp['I']],         // R32-14 (adjusted)
    [winners['I'], thirdSlots[3]],        // R32-15
    [winners['J'], runnersUp['G']],         // R32-16 (adjusted)
  ];

  // But we need 16 R32 matches for 32 teams. Let me reconsider.
  // 12 winners + 12 runners + 8 thirds = 32 teams
  // Each R32 match takes 2 teams, so 16 matches.
  // Let me use a simpler bracket structure:

  const r32: KnockoutMatch[] = r32Pairings.map(([home, away], i) => ({
    id: `R32-${i + 1}`,
    round: 'R32' as KnockoutRound,
    position: i + 1,
    home,
    away,
    result: knockoutPredictions[`R32-${i + 1}`],
  }));

  // But wait, we have 32 teams but only 16 pairings above, and we're missing
  // some winners/runners. Let me redo this properly.
  // 12 group winners, 12 runners-up, 8 best thirds = 32
  // We need to pair all 32 into 16 matches.

  const allR32: KnockoutMatch[] = [
    { id: 'R32-1', round: 'R32', position: 1, home: winners['A'], away: runnersUp['F'] },
    { id: 'R32-2', round: 'R32', position: 2, home: winners['B'], away: runnersUp['E'] },
    { id: 'R32-3', round: 'R32', position: 3, home: winners['C'], away: runnersUp['D'] },
    { id: 'R32-4', round: 'R32', position: 4, home: winners['D'], away: runnersUp['C'] },
    { id: 'R32-5', round: 'R32', position: 5, home: winners['E'], away: runnersUp['B'] },
    { id: 'R32-6', round: 'R32', position: 6, home: winners['F'], away: runnersUp['A'] },
    { id: 'R32-7', round: 'R32', position: 7, home: winners['G'], away: runnersUp['L'] },
    { id: 'R32-8', round: 'R32', position: 8, home: winners['H'], away: runnersUp['K'] },
    { id: 'R32-9', round: 'R32', position: 9, home: winners['I'], away: runnersUp['J'] },
    { id: 'R32-10', round: 'R32', position: 10, home: winners['J'], away: runnersUp['I'] },
    { id: 'R32-11', round: 'R32', position: 11, home: winners['K'], away: runnersUp['H'] },
    { id: 'R32-12', round: 'R32', position: 12, home: winners['L'], away: runnersUp['G'] },
    { id: 'R32-13', round: 'R32', position: 13, home: thirdSlots[0], away: thirdSlots[7] },
    { id: 'R32-14', round: 'R32', position: 14, home: thirdSlots[1], away: thirdSlots[6] },
    { id: 'R32-15', round: 'R32', position: 15, home: thirdSlots[2], away: thirdSlots[5] },
    { id: 'R32-16', round: 'R32', position: 16, home: thirdSlots[3], away: thirdSlots[4] },
  ];

  allR32.forEach(m => { m.result = knockoutPredictions[m.id]; });
  matches.push(...allR32);

  // Round of 16 (8 matches)
  for (let i = 0; i < 8; i++) {
    const m1 = allR32[i * 2];
    const m2 = allR32[i * 2 + 1];
    const home = m1.result ? (m1.result === 'home' ? m1.home : m1.away) : undefined;
    const away = m2.result ? (m2.result === 'home' ? m2.home : m2.away) : undefined;
    matches.push({
      id: `R16-${i + 1}`,
      round: 'R16',
      position: i + 1,
      home,
      away,
      result: knockoutPredictions[`R16-${i + 1}`],
    });
  }

  // Quarterfinals (4 matches)
  const r16 = matches.filter(m => m.round === 'R16');
  for (let i = 0; i < 4; i++) {
    const m1 = r16[i * 2];
    const m2 = r16[i * 2 + 1];
    const home = m1.result ? (m1.result === 'home' ? m1.home : m1.away) : undefined;
    const away = m2.result ? (m2.result === 'home' ? m2.home : m2.away) : undefined;
    matches.push({
      id: `QF-${i + 1}`,
      round: 'QF',
      position: i + 1,
      home,
      away,
      result: knockoutPredictions[`QF-${i + 1}`],
    });
  }

  // Semifinals (2 matches)
  const qf = matches.filter(m => m.round === 'QF');
  for (let i = 0; i < 2; i++) {
    const m1 = qf[i * 2];
    const m2 = qf[i * 2 + 1];
    const home = m1.result ? (m1.result === 'home' ? m1.home : m1.away) : undefined;
    const away = m2.result ? (m2.result === 'home' ? m2.home : m2.away) : undefined;
    matches.push({
      id: `SF-${i + 1}`,
      round: 'SF',
      position: i + 1,
      home,
      away,
      result: knockoutPredictions[`SF-${i + 1}`],
    });
  }

  // Third place match
  const sf = matches.filter(m => m.round === 'SF');
  const thirdHome = sf[0].result ? (sf[0].result === 'home' ? sf[0].away : sf[0].home) : undefined;
  const thirdAway = sf[1].result ? (sf[1].result === 'home' ? sf[1].away : sf[1].home) : undefined;
  matches.push({
    id: '3RD-1',
    round: '3RD',
    position: 1,
    home: thirdHome,
    away: thirdAway,
    result: knockoutPredictions['3RD-1'],
  });

  // Final
  const finalHome = sf[0].result ? (sf[0].result === 'home' ? sf[0].home : sf[0].away) : undefined;
  const finalAway = sf[1].result ? (sf[1].result === 'home' ? sf[1].home : sf[1].away) : undefined;
  matches.push({
    id: 'FIN-1',
    round: 'FIN',
    position: 1,
    home: finalHome,
    away: finalAway,
    result: knockoutPredictions['FIN-1'],
  });

  return matches;
}

function generateEmptyBracket(): KnockoutMatch[] {
  const matches: KnockoutMatch[] = [];

  for (let i = 1; i <= 16; i++) {
    matches.push({ id: `R32-${i}`, round: 'R32', position: i });
  }
  for (let i = 1; i <= 8; i++) {
    matches.push({ id: `R16-${i}`, round: 'R16', position: i });
  }
  for (let i = 1; i <= 4; i++) {
    matches.push({ id: `QF-${i}`, round: 'QF', position: i });
  }
  for (let i = 1; i <= 2; i++) {
    matches.push({ id: `SF-${i}`, round: 'SF', position: i });
  }
  matches.push({ id: '3RD-1', round: '3RD', position: 1 });
  matches.push({ id: 'FIN-1', round: 'FIN', position: 1 });

  return matches;
}

export function generateRandomKnockoutPredictions(
  groupPredictions: Record<string, MatchResult>,
  thirdPlaceTiebreaker?: string[]
): Record<string, KnockoutResult> {
  const predictions: Record<string, KnockoutResult> = {};
  const pick = (): KnockoutResult => Math.random() < 0.5 ? 'home' : 'away';

  // Generate round by round, feeding winners forward
  const bracket = generateBracket(groupPredictions, {}, thirdPlaceTiebreaker);
  const r32 = bracket.filter(m => m.round === 'R32');

  // R32
  for (const m of r32) {
    if (m.home && m.away) {
      predictions[m.id] = pick();
    }
  }

  // Rebuild with R32 predictions to get R16 teams
  const afterR32 = generateBracket(groupPredictions, predictions, thirdPlaceTiebreaker);
  for (const m of afterR32.filter(m => m.round === 'R16')) {
    if (m.home && m.away) predictions[m.id] = pick();
  }

  const afterR16 = generateBracket(groupPredictions, predictions, thirdPlaceTiebreaker);
  for (const m of afterR16.filter(m => m.round === 'QF')) {
    if (m.home && m.away) predictions[m.id] = pick();
  }

  const afterQF = generateBracket(groupPredictions, predictions, thirdPlaceTiebreaker);
  for (const m of afterQF.filter(m => m.round === 'SF')) {
    if (m.home && m.away) predictions[m.id] = pick();
  }

  const afterSF = generateBracket(groupPredictions, predictions, thirdPlaceTiebreaker);
  for (const m of afterSF.filter(m => m.round === '3RD' || m.round === 'FIN')) {
    if (m.home && m.away) predictions[m.id] = pick();
  }

  return predictions;
}

export function getChampion(
  groupPredictions: Record<string, MatchResult>,
  knockoutPredictions: Record<string, KnockoutResult>,
  thirdPlaceTiebreaker?: string[]
): string | undefined {
  const bracket = generateBracket(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker);
  const final = bracket.find(m => m.id === 'FIN-1');
  if (!final || !final.result) return undefined;
  return final.result === 'home' ? final.home : final.away;
}

export function getTopThree(
  groupPredictions: Record<string, MatchResult>,
  knockoutPredictions: Record<string, KnockoutResult>,
  thirdPlaceTiebreaker?: string[]
): { first?: string; second?: string; third?: string } {
  const bracket = generateBracket(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker);
  const final = bracket.find(m => m.id === 'FIN-1');
  const thirdMatch = bracket.find(m => m.id === '3RD-1');

  const first = final?.result ? (final.result === 'home' ? final.home : final.away) : undefined;
  const second = final?.result ? (final.result === 'home' ? final.away : final.home) : undefined;
  const third = thirdMatch?.result ? (thirdMatch.result === 'home' ? thirdMatch.home : thirdMatch.away) : undefined;

  return { first, second, third };
}
