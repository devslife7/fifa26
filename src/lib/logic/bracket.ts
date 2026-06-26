import { KnockoutMatch, KnockoutRound, GroupLetter, MatchResult, KnockoutResult } from '@/types';
import { getGroupQualifiers, getBestThirdPlaceTeams, areAllGroupsComplete } from './standings';
import { lookupAnnexC, WINNER_SLOTS, type AnnexCAssignment, type WinnerSlot } from './annexC';

// FIFA World Cup 26 bracket structure — codified from the official Regulations
// (https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf):
//   Article 12.6  → R32 pairings (M73–M88)
//   Article 12.7  → R16 pairings (M89–M96)
//   Article 12.8  → QF pairings  (M97–M100)
//   Article 12.9  → SF pairings  (M101–M102)
//   Article 12.10 → Third-place match (M103)
//   Article 12.11 → Final (M104)
//   Annexe C      → 495-row table mapping {8 qualifying third-place groups} →
//                    which third-place team faces which group winner.
//
// Internal IDs use the existing `R32-N`, `R16-N`, `QF-N`, `SF-N`, `3RD-1`, `FIN-1`
// scheme. The numeric suffix follows FIFA M-numbering (R32-1 = M73, R16-1 = M89,
// QF-1 = M97, SF-1 = M101) so position is stable across consumers.
//
// `generateBracket()` returns matches in *display order* — consecutive pairs of
// matches in each round are the two feeders of the next round's match at the
// same pair-index, so the UI can pair `matches[i*2]` with `matches[i*2+1]`
// without knowing the feeder map.

// --- R32 Sources (Article 12.6) ---

type TeamSource =
  | { type: 'winner'; group: GroupLetter }
  | { type: 'runnerUp'; group: GroupLetter }
  | { type: 'best3From'; candidates: readonly GroupLetter[] };

interface R32SourceDef {
  id: string;
  position: number;
  fifaMatchNumber: number;
  home: TeamSource;
  away: TeamSource;
}

const R32_BY_M_NUMBER: Record<number, R32SourceDef> = (() => {
  const defs: Omit<R32SourceDef, 'id' | 'position'>[] = [
    { fifaMatchNumber: 73, home: { type: 'runnerUp', group: 'A' }, away: { type: 'runnerUp', group: 'B' } },
    { fifaMatchNumber: 74, home: { type: 'winner', group: 'E' }, away: { type: 'best3From', candidates: ['A','B','C','D','F'] } },
    { fifaMatchNumber: 75, home: { type: 'winner', group: 'F' }, away: { type: 'runnerUp', group: 'C' } },
    { fifaMatchNumber: 76, home: { type: 'winner', group: 'C' }, away: { type: 'runnerUp', group: 'F' } },
    { fifaMatchNumber: 77, home: { type: 'winner', group: 'I' }, away: { type: 'best3From', candidates: ['C','D','F','G','H'] } },
    { fifaMatchNumber: 78, home: { type: 'runnerUp', group: 'E' }, away: { type: 'runnerUp', group: 'I' } },
    { fifaMatchNumber: 79, home: { type: 'winner', group: 'A' }, away: { type: 'best3From', candidates: ['C','E','F','H','I'] } },
    { fifaMatchNumber: 80, home: { type: 'winner', group: 'L' }, away: { type: 'best3From', candidates: ['E','H','I','J','K'] } },
    { fifaMatchNumber: 81, home: { type: 'winner', group: 'D' }, away: { type: 'best3From', candidates: ['B','E','F','I','J'] } },
    { fifaMatchNumber: 82, home: { type: 'winner', group: 'G' }, away: { type: 'best3From', candidates: ['A','E','H','I','J'] } },
    { fifaMatchNumber: 83, home: { type: 'runnerUp', group: 'K' }, away: { type: 'runnerUp', group: 'L' } },
    { fifaMatchNumber: 84, home: { type: 'winner', group: 'H' }, away: { type: 'runnerUp', group: 'J' } },
    { fifaMatchNumber: 85, home: { type: 'winner', group: 'B' }, away: { type: 'best3From', candidates: ['E','F','G','I','J'] } },
    { fifaMatchNumber: 86, home: { type: 'winner', group: 'J' }, away: { type: 'runnerUp', group: 'H' } },
    { fifaMatchNumber: 87, home: { type: 'winner', group: 'K' }, away: { type: 'best3From', candidates: ['D','E','I','J','L'] } },
    { fifaMatchNumber: 88, home: { type: 'runnerUp', group: 'D' }, away: { type: 'runnerUp', group: 'G' } },
  ];
  const out: Record<number, R32SourceDef> = {};
  defs.forEach((d, i) => {
    const id = `R32-${i + 1}`;
    out[d.fifaMatchNumber] = { ...d, id, position: i + 1 };
  });
  return out;
})();

export const R32_SOURCES: readonly R32SourceDef[] = Object.values(R32_BY_M_NUMBER).sort(
  (a, b) => a.position - b.position
);

// --- Feeder tables (Articles 12.7–12.11) ---
//
// Each entry: this round's match is fed by the winners (or losers) of two
// upstream matches identified by FIFA M-number. We translate M-numbers to
// internal R32/R16/QF/SF IDs at build time.

interface FeederDef {
  id: string;
  position: number;
  fifaMatchNumber: number;
  homeFromFifa: number;
  awayFromFifa: number;
}

// Article 12.7 — Round of 16
const R16_FEEDERS_RAW = [
  { fifaMatchNumber: 89, homeFromFifa: 74, awayFromFifa: 77 },
  { fifaMatchNumber: 90, homeFromFifa: 73, awayFromFifa: 75 },
  { fifaMatchNumber: 91, homeFromFifa: 76, awayFromFifa: 78 },
  { fifaMatchNumber: 92, homeFromFifa: 79, awayFromFifa: 80 },
  { fifaMatchNumber: 93, homeFromFifa: 83, awayFromFifa: 84 },
  { fifaMatchNumber: 94, homeFromFifa: 81, awayFromFifa: 82 },
  { fifaMatchNumber: 95, homeFromFifa: 86, awayFromFifa: 88 },
  { fifaMatchNumber: 96, homeFromFifa: 85, awayFromFifa: 87 },
] as const;

// Article 12.8 — Quarter-finals
const QF_FEEDERS_RAW = [
  { fifaMatchNumber: 97,  homeFromFifa: 89, awayFromFifa: 90 },
  { fifaMatchNumber: 98,  homeFromFifa: 93, awayFromFifa: 94 },
  { fifaMatchNumber: 99,  homeFromFifa: 91, awayFromFifa: 92 },
  { fifaMatchNumber: 100, homeFromFifa: 95, awayFromFifa: 96 },
] as const;

// Article 12.9 — Semi-finals
const SF_FEEDERS_RAW = [
  { fifaMatchNumber: 101, homeFromFifa: 97, awayFromFifa: 98 },
  { fifaMatchNumber: 102, homeFromFifa: 99, awayFromFifa: 100 },
] as const;

// Article 12.10 — Third-place (losers of SF) — M103
// Article 12.11 — Final (winners of SF) — M104
const FINAL_FROM_FIFA: readonly [number, number] = [101, 102];
const THIRD_FROM_FIFA: readonly [number, number] = [101, 102];

// Build the feeder tables once, keyed by ID, using the chosen ID scheme.
function buildFeeders(
  prefix: 'R16' | 'QF' | 'SF',
  raw: readonly { fifaMatchNumber: number; homeFromFifa: number; awayFromFifa: number }[],
  upstreamPrefix: 'R32' | 'R16' | 'QF',
  upstreamMByPos: Record<number, number>
): FeederDef[] {
  const upstreamIdFromFifa = (fifa: number): string => {
    // upstreamMByPos maps upstream position → fifa M-number; invert.
    const pos = Object.entries(upstreamMByPos).find(([, m]) => m === fifa)?.[0];
    if (!pos) throw new Error(`No ${upstreamPrefix} position for M${fifa}`);
    return `${upstreamPrefix}-${pos}`;
  };
  return raw.map((r, i) => ({
    id: `${prefix}-${i + 1}`,
    position: i + 1,
    fifaMatchNumber: r.fifaMatchNumber,
    homeFromFifa: r.homeFromFifa,
    awayFromFifa: r.awayFromFifa,
    // Stored as IDs for runtime use:
    _homeId: upstreamIdFromFifa(r.homeFromFifa),
    _awayId: upstreamIdFromFifa(r.awayFromFifa),
  })) as unknown as FeederDef[];
}

// Position → FIFA M# inversions (built from R32_BY_M_NUMBER / feeder tables)
const R32_M_BY_POS: Record<number, number> = (() => {
  const out: Record<number, number> = {};
  R32_SOURCES.forEach(s => { out[s.position] = s.fifaMatchNumber; });
  return out;
})();

const R16_FEEDERS = buildFeeders('R16', R16_FEEDERS_RAW, 'R32', R32_M_BY_POS) as (FeederDef & { _homeId: string; _awayId: string })[];

const R16_M_BY_POS: Record<number, number> = (() => {
  const out: Record<number, number> = {};
  R16_FEEDERS.forEach(f => { out[f.position] = f.fifaMatchNumber; });
  return out;
})();

const QF_FEEDERS = buildFeeders('QF', QF_FEEDERS_RAW, 'R16', R16_M_BY_POS) as (FeederDef & { _homeId: string; _awayId: string })[];

const QF_M_BY_POS: Record<number, number> = (() => {
  const out: Record<number, number> = {};
  QF_FEEDERS.forEach(f => { out[f.position] = f.fifaMatchNumber; });
  return out;
})();

const SF_FEEDERS = buildFeeders('SF', SF_FEEDERS_RAW, 'QF', QF_M_BY_POS) as (FeederDef & { _homeId: string; _awayId: string })[];

// Helper: SF IDs that feed FIN-1 / 3RD-1
const SF_FEED_IDS: [string, string] = (() => {
  const inv = (fifa: number) => SF_FEEDERS.find(f => f.fifaMatchNumber === fifa)!.id;
  return [inv(FINAL_FROM_FIFA[0]), inv(FINAL_FROM_FIFA[1])];
})();
const SF_THIRD_IDS: [string, string] = (() => {
  const inv = (fifa: number) => SF_FEEDERS.find(f => f.fifaMatchNumber === fifa)!.id;
  return [inv(THIRD_FROM_FIFA[0]), inv(THIRD_FROM_FIFA[1])];
})();

// --- Display ordering ---
//
// To let `BracketView` pair `matches[i*2]` with `matches[i*2+1]` naturally,
// each round's matches are returned in an order where consecutive pairs feed
// the same next-round match.

function displayOrder<T extends { id: string; position: number }>(
  matches: T[],
  feeders: readonly (FeederDef & { _homeId: string; _awayId: string })[]
): T[] {
  const byId = new Map(matches.map(m => [m.id, m] as const));
  const out: T[] = [];
  for (const f of feeders) {
    out.push(byId.get(f._homeId)!);
    out.push(byId.get(f._awayId)!);
  }
  return out;
}

// --- Placeholders ---

export function isPlaceholder(code: string | undefined): boolean {
  return !!code && code.startsWith('PH:');
}

export function placeholderLabel(code: string): string {
  if (!code.startsWith('PH:')) return code;
  const inner = code.slice(3);
  if (inner.startsWith('W-')) return `Winner ${inner.slice(2)}`;
  if (inner.startsWith('RU-')) return `Runner-up ${inner.slice(3)}`;
  if (inner.startsWith('BEST3-')) {
    const cands = inner.slice(6);
    return `3rd of ${cands.split('').join('/')}`;
  }
  if (inner.startsWith('3RD-')) return '3rd Place';
  return 'TBD';
}

// --- Slot labels (for TBD knockout matches) ---
//
// Friendly labels for the two sides of a knockout slot whose teams are not yet
// known. R32 slots map to group positions (Article 12.6); deeper rounds are fed
// by upstream match winners, so we degrade to a generic label.

function sourceLabel(source: TeamSource): string {
  if (source.type === 'winner') return `Winner ${source.group}`;
  if (source.type === 'runnerUp') return `Runner-up ${source.group}`;
  return `3rd of ${source.candidates.join('/')}`;
}

export function getSlotLabels(matchId: string): { home: string; away: string } | null {
  const def = R32_SOURCES.find(s => s.id === matchId);
  if (def) return { home: sourceLabel(def.home), away: sourceLabel(def.away) };
  if (/^(R16|QF|SF|3RD|FIN)-/.test(matchId)) {
    return { home: 'Winner of previous round', away: 'Winner of previous round' };
  }
  return null;
}

// Distinct groups whose results determine an R32 slot's teams (for "Teams lock
// once Groups A & B finish" copy). Empty for deeper rounds / unknown ids.
export function getSlotGroupDeps(matchId: string): GroupLetter[] {
  const def = R32_SOURCES.find(s => s.id === matchId);
  if (!def) return [];
  const groups = new Set<GroupLetter>();
  for (const source of [def.home, def.away]) {
    if (source.type === 'winner' || source.type === 'runnerUp') groups.add(source.group);
    else source.candidates.forEach(g => groups.add(g));
  }
  return Array.from(groups).sort();
}

// --- Dependency helpers ---

export function getAffectedR32Matches(groupLetter: GroupLetter): string[] {
  const affected = new Set<string>();
  for (const source of R32_SOURCES) {
    const refsHome =
      (source.home.type === 'winner' && source.home.group === groupLetter) ||
      (source.home.type === 'runnerUp' && source.home.group === groupLetter);
    const refsAway =
      (source.away.type === 'winner' && source.away.group === groupLetter) ||
      (source.away.type === 'runnerUp' && source.away.group === groupLetter);
    if (refsHome || refsAway) affected.add(source.id);
    // Any group change can reshuffle which 8 third-placed teams qualify,
    // which in turn changes the Annex C row → 8 winner-vs-best-3rd matches.
    if (source.home.type === 'best3From' || source.away.type === 'best3From') {
      affected.add(source.id);
    }
  }
  return Array.from(affected);
}

// R32 matches whose source on either side is a best-third qualifier — the eight
// matches that depend on which 8 of the 12 third-place teams advance.
export function getBestThirdDependentR32Matches(): string[] {
  return R32_SOURCES
    .filter(s => s.home.type === 'best3From' || s.away.type === 'best3From')
    .map(s => s.id);
}

// Reverse adjacency: for each upstream match ID, the downstream match IDs it feeds into.
const FEEDS_INTO: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  const add = (from: string, to: string) => {
    (map[from] ??= []).push(to);
  };
  for (const f of R16_FEEDERS) { add(f._homeId, f.id); add(f._awayId, f.id); }
  for (const f of QF_FEEDERS)  { add(f._homeId, f.id); add(f._awayId, f.id); }
  for (const f of SF_FEEDERS)  { add(f._homeId, f.id); add(f._awayId, f.id); }
  // SF -> both FIN and 3RD
  add(SF_FEED_IDS[0], 'FIN-1');
  add(SF_FEED_IDS[1], 'FIN-1');
  add(SF_THIRD_IDS[0], '3RD-1');
  add(SF_THIRD_IDS[1], '3RD-1');
  return map;
})();

export function getDownstreamMatchIds(matchId: string): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const queue: string[] = [matchId];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const next of FEEDS_INTO[cur] ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      result.push(next);
      queue.push(next);
    }
  }
  return result;
}

// --- Match winner/loser resolution ---

export function getMatchWinner(match: KnockoutMatch): string | undefined {
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

// --- Source resolution ---

function winnerSlotOf(source: TeamSource): WinnerSlot | undefined {
  if (source.type !== 'winner') return undefined;
  return (WINNER_SLOTS as readonly string[]).includes(source.group)
    ? (source.group as WinnerSlot)
    : undefined;
}

function resolveSource(
  source: TeamSource,
  winners: Record<string, string>,
  runnersUp: Record<string, string>,
  thirdByGroup: Partial<Record<GroupLetter, string>>,
  annexC: AnnexCAssignment | undefined,
  pairedWinnerSlot: WinnerSlot | undefined
): string {
  if (source.type === 'winner') {
    return winners[source.group] ?? `PH:W-${source.group}`;
  }
  if (source.type === 'runnerUp') {
    return runnersUp[source.group] ?? `PH:RU-${source.group}`;
  }
  // best3From
  if (!annexC || !pairedWinnerSlot) {
    return `PH:BEST3-${source.candidates.join('')}`;
  }
  const thirdGroup = annexC[pairedWinnerSlot];
  const team = thirdByGroup[thirdGroup];
  return team ?? `PH:BEST3-${source.candidates.join('')}`;
}

// --- Bracket generation ---

export function generateBracket(
  groupPredictions: Record<string, MatchResult>,
  knockoutPredictions: Record<string, KnockoutResult>,
  thirdPlaceTiebreaker?: string[],
): KnockoutMatch[] {
  const allGroupsDone = areAllGroupsComplete(groupPredictions);
  const { winners, runnersUp } = getGroupQualifiers(groupPredictions);

  // Resolve third-place qualifiers via Annex C (only when all groups done).
  const bestThirds = allGroupsDone ? getBestThirdPlaceTeams(groupPredictions, thirdPlaceTiebreaker) : [];
  const thirdsResolved = bestThirds.length === 8;
  const thirdByGroup: Partial<Record<GroupLetter, string>> = {};
  let annexC: AnnexCAssignment | undefined;
  if (thirdsResolved) {
    const qualifierGroups: GroupLetter[] = [];
    for (const t of bestThirds) {
      thirdByGroup[t.group] = t.team;
      qualifierGroups.push(t.group);
    }
    annexC = lookupAnnexC(qualifierGroups);
    if (!annexC && typeof console !== 'undefined') {
      // Should be impossible: 12-choose-8 = 495 and ANNEX_C has all 495 keys.
      console.error('Annex C miss for qualifier groups', qualifierGroups);
    }
  }

  // R32: resolve each match.
  const r32ById = new Map<string, KnockoutMatch>();
  for (const def of R32_SOURCES) {
    // For best3From sides, the paired winner slot lives on the opposite side.
    const homeSlot = def.away.type === 'best3From' ? winnerSlotOf(def.home) : undefined;
    const awaySlot = def.home.type === 'best3From' ? winnerSlotOf(def.away) : undefined;

    const home = resolveSource(def.home, winners, runnersUp, thirdByGroup, annexC, awaySlot);
    const away = resolveSource(def.away, winners, runnersUp, thirdByGroup, annexC, homeSlot);

    r32ById.set(def.id, {
      id: def.id,
      round: 'R32',
      position: def.position,
      home,
      away,
      result: knockoutPredictions[def.id],
    });
  }

  // Downstream rounds: forward pass via feeder tables.
  const all = new Map<string, KnockoutMatch>(r32ById);

  const buildRound = (
    feeders: readonly (FeederDef & { _homeId: string; _awayId: string })[],
    round: KnockoutRound
  ) => {
    for (const f of feeders) {
      const home = all.get(f._homeId);
      const away = all.get(f._awayId);
      const match: KnockoutMatch = {
        id: f.id,
        round,
        position: f.position,
        home: home ? getMatchWinner(home) : undefined,
        away: away ? getMatchWinner(away) : undefined,
        result: knockoutPredictions[f.id],
      };
      all.set(f.id, match);
    }
  };

  buildRound(R16_FEEDERS, 'R16');
  buildRound(QF_FEEDERS, 'QF');
  buildRound(SF_FEEDERS, 'SF');

  // 3rd-place and Final from the two semi-finals.
  const sf1 = all.get(SF_THIRD_IDS[0])!;
  const sf2 = all.get(SF_THIRD_IDS[1])!;
  const thirdMatch: KnockoutMatch = {
    id: '3RD-1',
    round: '3RD',
    position: 1,
    home: getMatchLoser(sf1),
    away: getMatchLoser(sf2),
    result: knockoutPredictions['3RD-1'],
  };
  const finSf1 = all.get(SF_FEED_IDS[0])!;
  const finSf2 = all.get(SF_FEED_IDS[1])!;
  const finalMatch: KnockoutMatch = {
    id: 'FIN-1',
    round: 'FIN',
    position: 1,
    home: getMatchWinner(finSf1),
    away: getMatchWinner(finSf2),
    result: knockoutPredictions['FIN-1'],
  };
  all.set('3RD-1', thirdMatch);
  all.set('FIN-1', finalMatch);

  // Return in display order. R32 ordered by R16 feeder adjacency,
  // R16 ordered by QF feeder adjacency, QF ordered by SF feeder adjacency.
  const r32List = [...r32ById.values()];
  const r16List = R16_FEEDERS.map(f => all.get(f.id)!);
  const qfList  = QF_FEEDERS.map(f => all.get(f.id)!);
  const sfList  = SF_FEEDERS.map(f => all.get(f.id)!);

  const r32Display = displayOrder(r32List, R16_FEEDERS);
  const r16Display = displayOrder(r16List, QF_FEEDERS);
  const qfDisplay  = displayOrder(qfList, SF_FEEDERS);

  return [
    ...r32Display,
    ...r16Display,
    ...qfDisplay,
    ...sfList,
    thirdMatch,
    finalMatch,
  ];
}

export function generateRandomKnockoutPredictions(
  groupPredictions: Record<string, MatchResult>,
  thirdPlaceTiebreaker?: string[],
): Record<string, KnockoutResult> {
  const predictions: Record<string, KnockoutResult> = {};
  const pick = (): KnockoutResult => Math.random() < 0.5 ? 'home' : 'away';

  const fillRound = (round: KnockoutRound) => {
    const bracket = generateBracket(groupPredictions, predictions, thirdPlaceTiebreaker);
    for (const m of bracket.filter(m => m.round === round)) {
      if (m.home && m.away && !isPlaceholder(m.home) && !isPlaceholder(m.away)) {
        predictions[m.id] = pick();
      }
    }
  };

  fillRound('R32');
  fillRound('R16');
  fillRound('QF');
  fillRound('SF');
  fillRound('3RD');
  fillRound('FIN');

  return predictions;
}

export function getChampion(
  groupPredictions: Record<string, MatchResult>,
  knockoutPredictions: Record<string, KnockoutResult>,
  thirdPlaceTiebreaker?: string[],
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
  thirdPlaceTiebreaker?: string[],
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
