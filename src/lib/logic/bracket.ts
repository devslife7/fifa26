import { KnockoutMatch, KnockoutRound, GroupLetter, MatchResult, KnockoutResult } from '@/types';
import { getGroupQualifiers, getBestThirdPlaceTeams, areAllGroupsComplete } from './standings';

// FIFA 2026 Round of 32 bracket structure
// 32 teams: 12 group winners + 12 runners-up + 8 best third-place teams
// The R32 pairings follow the official FIFA structure

// --- R32 Source Mapping ---

type TeamSource =
  | { type: 'winner'; group: GroupLetter }
  | { type: 'runnerUp'; group: GroupLetter }
  | { type: 'third'; slot: number };

interface R32SourceDef {
  id: string;
  position: number;
  home: TeamSource;
  away: TeamSource;
}

export const R32_SOURCES: R32SourceDef[] = [
  { id: 'R32-1',  position: 1,  home: { type: 'winner', group: 'A' }, away: { type: 'runnerUp', group: 'F' } },
  { id: 'R32-2',  position: 2,  home: { type: 'winner', group: 'B' }, away: { type: 'runnerUp', group: 'E' } },
  { id: 'R32-3',  position: 3,  home: { type: 'winner', group: 'C' }, away: { type: 'runnerUp', group: 'D' } },
  { id: 'R32-4',  position: 4,  home: { type: 'winner', group: 'D' }, away: { type: 'runnerUp', group: 'C' } },
  { id: 'R32-5',  position: 5,  home: { type: 'winner', group: 'E' }, away: { type: 'runnerUp', group: 'B' } },
  { id: 'R32-6',  position: 6,  home: { type: 'winner', group: 'F' }, away: { type: 'runnerUp', group: 'A' } },
  { id: 'R32-7',  position: 7,  home: { type: 'winner', group: 'G' }, away: { type: 'runnerUp', group: 'L' } },
  { id: 'R32-8',  position: 8,  home: { type: 'winner', group: 'H' }, away: { type: 'runnerUp', group: 'K' } },
  { id: 'R32-9',  position: 9,  home: { type: 'winner', group: 'I' }, away: { type: 'runnerUp', group: 'J' } },
  { id: 'R32-10', position: 10, home: { type: 'winner', group: 'J' }, away: { type: 'runnerUp', group: 'I' } },
  { id: 'R32-11', position: 11, home: { type: 'winner', group: 'K' }, away: { type: 'runnerUp', group: 'H' } },
  { id: 'R32-12', position: 12, home: { type: 'winner', group: 'L' }, away: { type: 'runnerUp', group: 'G' } },
  { id: 'R32-13', position: 13, home: { type: 'third', slot: 0 }, away: { type: 'third', slot: 7 } },
  { id: 'R32-14', position: 14, home: { type: 'third', slot: 1 }, away: { type: 'third', slot: 6 } },
  { id: 'R32-15', position: 15, home: { type: 'third', slot: 2 }, away: { type: 'third', slot: 5 } },
  { id: 'R32-16', position: 16, home: { type: 'third', slot: 3 }, away: { type: 'third', slot: 4 } },
];

// --- Placeholder Helpers ---

export function isPlaceholder(code: string | undefined): boolean {
  return !!code && code.startsWith('PH:');
}

export function placeholderLabel(code: string): string {
  if (!code.startsWith('PH:')) return code;
  const inner = code.slice(3);
  if (inner.startsWith('W-')) return `Winner ${inner.slice(2)}`;
  if (inner.startsWith('RU-')) return `Runner-up ${inner.slice(3)}`;
  if (inner.startsWith('3RD-')) return '3rd Place';
  return 'TBD';
}

// --- Dependency Helpers ---

export function getAffectedR32Matches(groupLetter: GroupLetter): string[] {
  const affected = new Set<string>();

  for (const source of R32_SOURCES) {
    const homeRef = source.home.type !== 'third' && source.home.group === groupLetter;
    const awayRef = source.away.type !== 'third' && source.away.group === groupLetter;
    if (homeRef || awayRef) {
      affected.add(source.id);
    }
  }

  // Conservative: any group change can shift third-place rankings
  for (const source of R32_SOURCES) {
    if (source.home.type === 'third' || source.away.type === 'third') {
      affected.add(source.id);
    }
  }

  return Array.from(affected);
}

export function getDownstreamMatchIds(matchId: string): string[] {
  const [round, posStr] = matchId.split('-');
  const pos = parseInt(posStr, 10);

  if (round === 'FIN' || round === '3RD') return [];

  const downstream: string[] = [];
  const roundChain = ['R32', 'R16', 'QF', 'SF'];
  const startIdx = roundChain.indexOf(round);
  if (startIdx === -1) return [];

  let currentPos = pos;
  for (let i = startIdx + 1; i < roundChain.length; i++) {
    currentPos = Math.ceil(currentPos / 2);
    downstream.push(`${roundChain[i]}-${currentPos}`);
  }

  downstream.push('FIN-1', '3RD-1');
  return downstream;
}

// --- Third Place Assignment ---

function assignThirdPlaceToSlots(
  thirdPlaceTeams: { team: string; group: GroupLetter }[]
): Record<number, string> {
  const slots: Record<number, string> = {};
  thirdPlaceTeams.forEach((tp, i) => {
    slots[i] = tp.team;
  });
  return slots;
}

// --- Match Winner/Loser Resolution ---

function getMatchWinner(match: KnockoutMatch): string | undefined {
  if (!match.home || !match.away) return undefined;
  if (isPlaceholder(match.home) || isPlaceholder(match.away)) return undefined;
  if (!match.result) return undefined;
  return match.result === 'home' ? match.home : match.away;
}

function getMatchLoser(match: KnockoutMatch): string | undefined {
  if (!match.home || !match.away) return undefined;
  if (isPlaceholder(match.home) || isPlaceholder(match.away)) return undefined;
  if (!match.result) return undefined;
  return match.result === 'home' ? match.away : match.home;
}

// --- Source Resolution ---

function resolveSource(
  source: TeamSource,
  winners: Record<string, string>,
  runnersUp: Record<string, string>,
  thirdSlots: Record<number, string>,
  thirdsResolved: boolean
): string {
  if (source.type === 'winner') {
    return winners[source.group] ?? `PH:W-${source.group}`;
  } else if (source.type === 'runnerUp') {
    return runnersUp[source.group] ?? `PH:RU-${source.group}`;
  } else {
    return thirdsResolved && thirdSlots[source.slot] !== undefined
      ? thirdSlots[source.slot]
      : `PH:3RD-${source.slot}`;
  }
}

// --- Bracket Generation ---

export function generateBracket(
  groupPredictions: Record<string, MatchResult>,
  knockoutPredictions: Record<string, KnockoutResult>,
  thirdPlaceTiebreaker?: string[]
): KnockoutMatch[] {
  const matches: KnockoutMatch[] = [];
  const allGroupsDone = areAllGroupsComplete(groupPredictions);
  const { winners, runnersUp } = getGroupQualifiers(groupPredictions);

  // Third place — only available when all groups complete + ties resolved
  let thirdSlots: Record<number, string> = {};
  const bestThirds = allGroupsDone ? getBestThirdPlaceTeams(groupPredictions, thirdPlaceTiebreaker) : [];
  const thirdsResolved = bestThirds.length >= 8;
  if (thirdsResolved) {
    thirdSlots = assignThirdPlaceToSlots(bestThirds);
  }

  // Round of 32 — partial data with placeholders for incomplete groups
  const allR32: KnockoutMatch[] = R32_SOURCES.map(source => ({
    id: source.id,
    round: 'R32' as KnockoutRound,
    position: source.position,
    home: resolveSource(source.home, winners, runnersUp, thirdSlots, thirdsResolved),
    away: resolveSource(source.away, winners, runnersUp, thirdSlots, thirdsResolved),
    result: knockoutPredictions[source.id],
  }));

  matches.push(...allR32);

  // Round of 16 (8 matches) — only propagate when both source teams are real
  for (let i = 0; i < 8; i++) {
    const m1 = allR32[i * 2];
    const m2 = allR32[i * 2 + 1];
    matches.push({
      id: `R16-${i + 1}`,
      round: 'R16',
      position: i + 1,
      home: getMatchWinner(m1),
      away: getMatchWinner(m2),
      result: knockoutPredictions[`R16-${i + 1}`],
    });
  }

  // Quarterfinals (4 matches)
  const r16 = matches.filter(m => m.round === 'R16');
  for (let i = 0; i < 4; i++) {
    const m1 = r16[i * 2];
    const m2 = r16[i * 2 + 1];
    matches.push({
      id: `QF-${i + 1}`,
      round: 'QF',
      position: i + 1,
      home: getMatchWinner(m1),
      away: getMatchWinner(m2),
      result: knockoutPredictions[`QF-${i + 1}`],
    });
  }

  // Semifinals (2 matches)
  const qf = matches.filter(m => m.round === 'QF');
  for (let i = 0; i < 2; i++) {
    const m1 = qf[i * 2];
    const m2 = qf[i * 2 + 1];
    matches.push({
      id: `SF-${i + 1}`,
      round: 'SF',
      position: i + 1,
      home: getMatchWinner(m1),
      away: getMatchWinner(m2),
      result: knockoutPredictions[`SF-${i + 1}`],
    });
  }

  // Third place match
  const sf = matches.filter(m => m.round === 'SF');
  matches.push({
    id: '3RD-1',
    round: '3RD',
    position: 1,
    home: getMatchLoser(sf[0]),
    away: getMatchLoser(sf[1]),
    result: knockoutPredictions['3RD-1'],
  });

  // Final
  matches.push({
    id: 'FIN-1',
    round: 'FIN',
    position: 1,
    home: getMatchWinner(sf[0]),
    away: getMatchWinner(sf[1]),
    result: knockoutPredictions['FIN-1'],
  });

  return matches;
}

export function generateRandomKnockoutPredictions(
  groupPredictions: Record<string, MatchResult>,
  thirdPlaceTiebreaker?: string[]
): Record<string, KnockoutResult> {
  const predictions: Record<string, KnockoutResult> = {};
  const pick = (): KnockoutResult => Math.random() < 0.5 ? 'home' : 'away';

  const bracket = generateBracket(groupPredictions, {}, thirdPlaceTiebreaker);
  const r32 = bracket.filter(m => m.round === 'R32');

  for (const m of r32) {
    if (m.home && m.away && !isPlaceholder(m.home) && !isPlaceholder(m.away)) {
      predictions[m.id] = pick();
    }
  }

  const afterR32 = generateBracket(groupPredictions, predictions, thirdPlaceTiebreaker);
  for (const m of afterR32.filter(m => m.round === 'R16')) {
    if (m.home && m.away && !isPlaceholder(m.home) && !isPlaceholder(m.away)) {
      predictions[m.id] = pick();
    }
  }

  const afterR16 = generateBracket(groupPredictions, predictions, thirdPlaceTiebreaker);
  for (const m of afterR16.filter(m => m.round === 'QF')) {
    if (m.home && m.away && !isPlaceholder(m.home) && !isPlaceholder(m.away)) {
      predictions[m.id] = pick();
    }
  }

  const afterQF = generateBracket(groupPredictions, predictions, thirdPlaceTiebreaker);
  for (const m of afterQF.filter(m => m.round === 'SF')) {
    if (m.home && m.away && !isPlaceholder(m.home) && !isPlaceholder(m.away)) {
      predictions[m.id] = pick();
    }
  }

  const afterSF = generateBracket(groupPredictions, predictions, thirdPlaceTiebreaker);
  for (const m of afterSF.filter(m => m.round === '3RD' || m.round === 'FIN')) {
    if (m.home && m.away && !isPlaceholder(m.home) && !isPlaceholder(m.away)) {
      predictions[m.id] = pick();
    }
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
  const winner = final.result === 'home' ? final.home : final.away;
  if (winner && isPlaceholder(winner)) return undefined;
  return winner;
}

export function getTopThree(
  groupPredictions: Record<string, MatchResult>,
  knockoutPredictions: Record<string, KnockoutResult>,
  thirdPlaceTiebreaker?: string[]
): { first?: string; second?: string; third?: string } {
  const bracket = generateBracket(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker);
  const final = bracket.find(m => m.id === 'FIN-1');
  const thirdMatch = bracket.find(m => m.id === '3RD-1');

  let first = final?.result ? (final.result === 'home' ? final.home : final.away) : undefined;
  let second = final?.result ? (final.result === 'home' ? final.away : final.home) : undefined;
  let third = thirdMatch?.result ? (thirdMatch.result === 'home' ? thirdMatch.home : thirdMatch.away) : undefined;

  if (first && isPlaceholder(first)) first = undefined;
  if (second && isPlaceholder(second)) second = undefined;
  if (third && isPlaceholder(third)) third = undefined;

  return { first, second, third };
}
