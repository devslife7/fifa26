import type { LiveMatch, MatchResult, KnockoutResult } from '@/types';
import { KNOCKOUT_VENUES, KNOCKOUT_R32_DATES } from '@/data/matches';
import { generateBracket, isPlaceholder } from './bracket';
import { detectThirdPlaceTie } from './standings';

// Drives the Round-of-32 display from our own bracket model instead of trusting
// football-data.org's slotting. The upstream feed gives knockout fixtures no
// venue, mostly-TBD teams, and unreliable dates, so its 16 R32 fixtures can't be
// mapped to FIFA slots by position. Our bracket (lib/logic/bracket.ts) is the
// source of truth for which slot is which matchup; the API is used only to overlay
// live score/status/kickoff, joined by team identity (the one reliable key).

const GROUP_MATCH_ID = /^[A-L]-\d$/;

/** Build the `{ "A-1": "home" | "draw" | "away", … }` map generateBracket expects
 *  from finished group fixtures in the live matches array. */
export function buildActualGroupResults(matches: LiveMatch[]): Record<string, MatchResult> {
  const out: Record<string, MatchResult> = {};
  for (const m of matches) {
    if (!m.localMatchId || !GROUP_MATCH_ID.test(m.localMatchId)) continue;
    if (m.status !== 'FINISHED') continue;
    const r = m.actualResult;
    if (r === 'home' || r === 'draw' || r === 'away') out[m.localMatchId] = r;
  }
  return out;
}

/** When 3rd-place teams are tied on points at the 8th/9th boundary, resolve
 *  using actual match scores (GD desc, then GF desc) so AnnexC can run. */
function computeActualThirdPlaceTiebreaker(
  matches: LiveMatch[],
  groupResults: Record<string, MatchResult>,
): string[] | undefined {
  const { tied, slotsToFill } = detectThirdPlaceTie(groupResults);
  if (slotsToFill === 0 || tied.length === 0) return undefined;

  const teamStats: Record<string, { gd: number; gf: number }> = {};
  for (const m of matches) {
    if (!m.localMatchId || !GROUP_MATCH_ID.test(m.localMatchId)) continue;
    if (m.status !== 'FINISHED' || !m.score || !m.homeCode || !m.awayCode) continue;
    const { home: sh, away: sa } = m.score;
    teamStats[m.homeCode] ??= { gd: 0, gf: 0 };
    teamStats[m.awayCode] ??= { gd: 0, gf: 0 };
    teamStats[m.homeCode].gd += sh - sa;
    teamStats[m.homeCode].gf += sh;
    teamStats[m.awayCode].gd += sa - sh;
    teamStats[m.awayCode].gf += sa;
  }

  const sortedTied = [...tied].sort((a, b) => {
    const sa = teamStats[a.team] ?? { gd: 0, gf: 0 };
    const sb = teamStats[b.team] ?? { gd: 0, gf: 0 };
    if (sb.gd !== sa.gd) return sb.gd - sa.gd;
    return sb.gf - sa.gf;
  });

  return sortedTied.slice(0, slotsToFill).map(e => e.team);
}

/** The 16 R32 slots resolved from current group results (codes or PH placeholders). */
function computeR32Slots(matches: LiveMatch[]) {
  const groupResults = buildActualGroupResults(matches);
  const tiebreaker = computeActualThirdPlaceTiebreaker(matches, groupResults);
  return generateBracket(groupResults, {}, tiebreaker).filter(m => m.round === 'R32');
}

/** `teamCode → R32-N`. Each qualified team appears in exactly one R32 slot, so this
 *  uniquely identifies a fixture's slot by either of its teams. Used server-side to
 *  bind live fixtures (and their finished results) to the correct slot. */
export function buildR32TeamSlotIndex(matches: LiveMatch[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const slot of computeR32Slots(matches)) {
    for (const code of [slot.home, slot.away]) {
      if (code && !isPlaceholder(code)) index.set(code, slot.id);
    }
  }
  return index;
}

// --- Display rows ---

// Midday UTC so the row lands on the correct North-American calendar day for
// date bucketing; the exact kickoff is unknown until the API joins (rows with a
// synthetic negative apiMatchId show their time as "TBD").
const R32_DEFAULT_TIME = 'T18:00:00.000Z';

function staticUtcDate(slotId: string): string {
  const date = KNOCKOUT_R32_DATES[slotId];
  return date ? `${date}${R32_DEFAULT_TIME}` : '';
}

// The API fixture (if any) whose teams overlap this slot's resolved teams.
function findApiFixtureForSlot(
  apiR32: LiveMatch[],
  homeResolved: string | null,
  awayResolved: string | null,
): LiveMatch | undefined {
  const anchors = [homeResolved, awayResolved].filter((c): c is string => !!c);
  if (anchors.length === 0) return undefined;
  return apiR32.find(
    m =>
      (m.homeCode && anchors.includes(m.homeCode)) ||
      (m.awayCode && anchors.includes(m.awayCode)),
  );
}

// Orient the API fixture's two sides onto our slot's home/away (the home/away
// convention can differ between sources), carrying score/result/flags along.
function orientApiToSlot(api: LiveMatch, homeResolved: string | null, awayResolved: string | null) {
  const homeSide = { code: api.homeCode, name: api.homeName, short: api.homeShortName, flag: api.homeFlag };
  const awaySide = { code: api.awayCode, name: api.awayName, short: api.awayShortName, flag: api.awayFlag };

  const swap =
    (!!homeResolved && awaySide.code === homeResolved && homeSide.code !== homeResolved) ||
    (!!awayResolved && homeSide.code === awayResolved && awaySide.code !== awayResolved);

  const h = swap ? awaySide : homeSide;
  const a = swap ? homeSide : awaySide;
  const score = api.score ? (swap ? { home: api.score.away, away: api.score.home } : api.score) : null;
  const penalties = api.penalties ? (swap ? { home: api.penalties.away, away: api.penalties.home } : api.penalties) : null;
  let actualResult = api.actualResult;
  if (swap && actualResult === 'home') actualResult = 'away';
  else if (swap && actualResult === 'away') actualResult = 'home';

  return {
    homeCode: h.code, awayCode: a.code,
    homeName: h.name, awayName: a.name,
    homeShortName: h.short, awayShortName: a.short,
    homeFlag: h.flag, awayFlag: a.flag,
    score, penalties, actualResult,
  };
}

/** The 16 Round-of-32 rows for the Matches view, built from our bracket and
 *  overlaid with live API data by team identity. Sides without a resolved team are
 *  left null so `MatchRow`/`getSlotLabels` render the positional label (e.g.
 *  "Winner E", "3rd of A/B/C/D/F"). API-assigned teams are preferred over our
 *  computed teams (our third-place/runner-up tiebreakers differ from FIFA's).
 *
 * Also used internally by `buildKnockoutDisplayRows` to extract finished R32 results. */
export function buildR32DisplayRows(matches: LiveMatch[]): LiveMatch[] {
  const apiR32 = matches.filter(m => m.stage === 'R32');

  return computeR32Slots(matches).map((slot) => {
    const homeResolved = slot.home && !isPlaceholder(slot.home) ? slot.home : null;
    const awayResolved = slot.away && !isPlaceholder(slot.away) ? slot.away : null;
    const slotNum = Number(slot.id.split('-')[1]);
    const api = findApiFixtureForSlot(apiR32, homeResolved, awayResolved);

    if (!api) {
      return {
        apiMatchId: -(1000 + slotNum),
        localMatchId: slot.id,
        homeCode: homeResolved,
        awayCode: awayResolved,
        homeName: null,
        awayName: null,
        homeShortName: null,
        awayShortName: null,
        homeFlag: null,
        awayFlag: null,
        utcDate: staticUtcDate(slot.id),
        status: 'SCHEDULED',
        venue: KNOCKOUT_VENUES[slot.id] ?? null,
        score: null,
        penalties: null,
        actualResult: null,
        stage: 'R32',
        group: null,
      };
    }

    const o = orientApiToSlot(api, homeResolved, awayResolved);
    return {
      apiMatchId: api.apiMatchId,
      localMatchId: slot.id,
      homeCode: o.homeCode ?? homeResolved,
      awayCode: o.awayCode ?? awayResolved,
      homeName: o.homeName,
      awayName: o.awayName,
      homeShortName: o.homeShortName,
      awayShortName: o.awayShortName,
      homeFlag: o.homeFlag,
      awayFlag: o.awayFlag,
      utcDate: api.utcDate || staticUtcDate(slot.id),
      status: api.status,
      venue: api.venue ?? KNOCKOUT_VENUES[slot.id] ?? null,
      score: o.score,
      penalties: o.penalties,
      actualResult: o.actualResult,
      stage: 'R32',
      group: null,
    };
  });
}

// Negative apiMatchId offsets per round for synthetic (no-API-fixture) rows.
const SYNTHETIC_ID_OFFSETS: Record<string, number> = {
  R16: 2000, QF: 3000, SF: 4000, '3RD': 5000, FIN: 6000,
};

/** The 16 Round-of-16-through-Final rows for the Matches view, built from our
 *  bracket model and overlaid with live API data by team identity.
 *
 *  Teams are propagated round by round: R32 results → R16 teams → R16 results →
 *  QF teams → … → FIN teams. Sides without a resolved team are left null so
 *  `MatchRow`/`getSlotLabels` render "Winner of previous round". API-assigned
 *  team codes are preferred; bracket codes are fallback only. */
export function buildKnockoutDisplayRows(matches: LiveMatch[]): LiveMatch[] {
  const groupResults = buildActualGroupResults(matches);
  const tiebreaker = computeActualThirdPlaceTiebreaker(matches, groupResults);

  // R32 display rows already re-orient home/away to bracket orientation.
  const r32Rows = buildR32DisplayRows(matches);
  const knockoutResults: Record<string, KnockoutResult> = {};
  for (const row of r32Rows) {
    if (
      row.localMatchId &&
      row.status === 'FINISHED' &&
      (row.actualResult === 'home' || row.actualResult === 'away')
    ) {
      knockoutResults[row.localMatchId] = row.actualResult;
    }
  }

  // Index API fixtures by stage. LiveMatch.stage is already mapped ('R16', 'QF', …).
  const apiByStage: Record<string, LiveMatch[]> = {};
  for (const m of matches) {
    if (['R16', 'QF', 'SF', '3RD', 'FIN'].includes(m.stage)) {
      (apiByStage[m.stage] ??= []).push(m);
    }
  }

  const rounds = ['R16', 'QF', 'SF', '3RD', 'FIN'] as const;
  const allRows: LiveMatch[] = [];

  for (const round of rounds) {
    // Regenerate bracket with all results accumulated so far to get teams for this round.
    const bracket = generateBracket(groupResults, knockoutResults, tiebreaker);
    const apiFixtures = apiByStage[round] ?? [];

    for (const slot of bracket.filter(m => m.round === round)) {
      const homeResolved = slot.home && !isPlaceholder(slot.home) ? slot.home : null;
      const awayResolved = slot.away && !isPlaceholder(slot.away) ? slot.away : null;
      const slotNum = Number(slot.id.split('-')[1]) || 1;
      const api = findApiFixtureForSlot(apiFixtures, homeResolved, awayResolved)
        ?? apiFixtures.find(m => m.localMatchId === slot.id);

      if (!api) {
        allRows.push({
          apiMatchId: -(SYNTHETIC_ID_OFFSETS[round] + slotNum),
          localMatchId: slot.id,
          homeCode: homeResolved,
          awayCode: awayResolved,
          homeName: null,
          awayName: null,
          homeShortName: null,
          awayShortName: null,
          homeFlag: null,
          awayFlag: null,
          utcDate: '',
          status: 'SCHEDULED',
          venue: KNOCKOUT_VENUES[slot.id] ?? null,
          score: null,
          penalties: null,
          actualResult: null,
          stage: round,
          group: null,
        });
      } else {
        const o = orientApiToSlot(api, homeResolved, awayResolved);
        if (api.status === 'FINISHED' && (o.actualResult === 'home' || o.actualResult === 'away')) {
          knockoutResults[slot.id] = o.actualResult;
        }
        allRows.push({
          apiMatchId: api.apiMatchId,
          localMatchId: slot.id,
          homeCode: o.homeCode ?? homeResolved,
          awayCode: o.awayCode ?? awayResolved,
          homeName: o.homeName,
          awayName: o.awayName,
          homeShortName: o.homeShortName,
          awayShortName: o.awayShortName,
          homeFlag: o.homeFlag,
          awayFlag: o.awayFlag,
          utcDate: api.utcDate || '',
          status: api.status,
          venue: api.venue ?? KNOCKOUT_VENUES[slot.id] ?? null,
          score: o.score,
          penalties: o.penalties,
          actualResult: o.actualResult,
          stage: round,
          group: null,
        });
      }
    }
  }

  return allRows;
}
