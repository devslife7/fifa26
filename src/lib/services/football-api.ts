import type {
  FDMatchesResponse,
  FDStandingsResponse,
  FDTeamsResponse,
  FDApiMatch,
} from '@/types/football-api';
import type { LiveMatch } from '@/types';

const BASE_URL = 'https://api.football-data.org/v4';
const COMPETITION = 'WC';

// --- In-memory cache (infinite TTL, only invalidated by force-refresh) ---
interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, fetchedAt: Date.now() });
}

function clearCache(key: string): void {
  cache.delete(key);
}

// --- API key ---
function getApiKey(): string | undefined {
  return process.env.FOOTBALL_DATA_API_KEY;
}

// --- In-flight deduplication (prevents thundering herd) ---
const inflight = new Map<string, Promise<unknown>>();

// --- Generic fetcher ---
async function apiFetch<T>(path: string, force = false): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  if (!force) {
    const cached = getCached<T>(path);
    if (cached) return cached;
  } else {
    clearCache(path);
  }

  // If a request for this path is already in-flight, reuse it
  const existing = inflight.get(path) as Promise<T | null> | undefined;
  if (existing) return existing;

  const promise = (async (): Promise<T | null> => {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        headers: { 'X-Auth-Token': apiKey },
        cache: 'no-store',
      });
      if (res.status === 429) throw new Error('RATE_LIMITED');
      if (!res.ok) return null;
      const data: T = await res.json();
      setCache(path, data);
      return data;
    } catch (e) {
      if (e instanceof Error && e.message === 'RATE_LIMITED') throw e;
      return null;
    } finally {
      inflight.delete(path);
    }
  })();

  inflight.set(path, promise);
  return promise;
}

// --- TLA → app code mapping ---
// football-data.org uses FIFA three-letter abbreviations; our app uses ISO-based codes
const TLA_TO_APP_CODE: Record<string, string> = {
  // Group A
  MEX: 'MX',
  RSA: 'ZA',
  KOR: 'KR',
  // Group B
  CAN: 'CA',
  QAT: 'QA',
  SUI: 'CH',
  // Group C
  BRA: 'BR',
  MAR: 'MA',
  HAI: 'HT',
  SCO: 'GB-SCT',
  // Group D
  USA: 'US',
  PAR: 'PY',
  AUS: 'AU',
  // Group E
  GER: 'DE',
  CUW: 'CW', // Curaçao (API TLA)
  CUR: 'CW', // legacy alias
  CIV: 'CI',
  ECU: 'EC',
  // Group F
  NED: 'NL',
  JPN: 'JP',
  TUN: 'TN',
  // Group G
  BEL: 'BE',
  EGY: 'EG',
  IRN: 'IR',
  NZL: 'NZ',
  // Group H
  ESP: 'ES',
  CPV: 'CV',
  KSA: 'SA',
  URY: 'UY', // Uruguay (API TLA)
  URU: 'UY', // legacy alias
  // Group I
  FRA: 'FR',
  SEN: 'SN',
  NOR: 'NO',
  // Group J
  ARG: 'AR',
  ALG: 'DZ',
  AUT: 'AT',
  JOR: 'JO',
  // Group K
  POR: 'PT',
  UZB: 'UZ',
  COL: 'CO',
  COD: 'CD', // Congo DR (TBD-K qualifier)
  // Group L
  ENG: 'GB-ENG',
  CRO: 'HR',
  GHA: 'GH',
  PAN: 'PA',
  // Playoff qualifiers
  CZE: 'CZ',  // Czechia (Group A)
  BIH: 'BA',  // Bosnia-Herzegovina (Group B)
  TUR: 'TR',  // Turkey (Group D)
  SWE: 'SE',  // Sweden (Group F)
  IRQ: 'IQ',  // Iraq (Group I)
};

function tlaToCode(tla: string): string | null {
  return TLA_TO_APP_CODE[tla] ?? null;
}

// --- Stage mapping ---
const STAGE_TO_ROUND: Record<string, string> = {
  GROUP_STAGE: 'GROUP',
  LAST_32: 'R32',
  LAST_16: 'R16',
  QUARTER_FINALS: 'QF',
  SEMI_FINALS: 'SF',
  THIRD_PLACE: '3RD',
  FINAL: 'FIN',
};

// --- Group letter extraction ---
function extractGroupLetter(apiGroup: string | null): string | null {
  if (!apiGroup) return null;
  // "GROUP_A" → "A"  or  "Group A" → "A"
  const match = apiGroup.match(/(?:GROUP_|Group\s+)([A-L])/i);
  return match ? match[1].toUpperCase() : null;
}

// --- Match ID mapping ---
// Group matches are identified by group + home/away codes (e.g. "A-1")
// We match by group + team codes since match numbers may differ
import { allGroupMatches } from '@/data/matches';

function mapGroupMatchToLocalId(
  homeCode: string | null,
  awayCode: string | null,
  group: string | null,
): string | null {
  if (!group) return null;
  if (homeCode && awayCode) {
    const match = allGroupMatches.find(
      m =>
        m.group === group &&
        ((m.home === homeCode && m.away === awayCode) ||
          (m.home === awayCode && m.away === homeCode)),
    );
    return match?.id ?? null;
  }
  // One team is TBD (null code) — match by the known code against a TBD slot in this group
  const known = homeCode ?? awayCode;
  if (!known) return null;
  const match = allGroupMatches.find(
    m =>
      m.group === group &&
      (m.home === known || m.away === known) &&
      (m.home.startsWith('TBD') || m.away.startsWith('TBD')),
  );
  return match?.id ?? null;
}

// --- Knockout slot binding ---
// football-data.org's knockout fixtures carry no venue, mostly-TBD teams, and
// unreliable dates, so they can't be slotted by position. R32 fixtures are bound
// by *team identity* against our bracket in mapMatchesResponse (see
// buildR32TeamSlotIndex) — the only reliable key. Deeper rounds keep response
// order for now (they need downstream knockout results to slot; documented
// follow-up). We never use response order for R32, which would fabricate matchups.
import { buildR32TeamSlotIndex } from '@/lib/logic/actual-bracket';

function mapKnockoutMatchToLocalId(stage: string, matchIndex: number): string | null {
  const round = STAGE_TO_ROUND[stage];
  if (!round || round === 'GROUP') return null;
  if (round === 'R32') return null; // bound by team identity in mapMatchesResponse
  return `${round}-${matchIndex + 1}`;
}

// --- Determine actual result ---
// The feed's `score.winner` is the authoritative source, but for shootout-decided
// matches it frequently arrives as null/DRAW (see mapScore note). When regulation
// is level and we have a derived shootout tally, the penalties decide the winner —
// otherwise knockout matches would settle with no winner at all.
function getActualResult(
  apiMatch: FDApiMatch,
  penalties: LiveMatch['penalties'],
): LiveMatch['actualResult'] {
  if (apiMatch.status !== 'FINISHED') return null;
  const winner = apiMatch.score.winner;
  if (winner === 'HOME_TEAM') return 'home';
  if (winner === 'AWAY_TEAM') return 'away';
  if (penalties && penalties.home !== penalties.away) {
    return penalties.home > penalties.away ? 'home' : 'away';
  }
  if (winner === 'DRAW') return 'draw';
  return null;
}

// --- Map a single API match to LiveMatch ---
function mapApiMatch(
  apiMatch: FDApiMatch,
  knockoutIndex: number,
): LiveMatch | null {
  const homeCode = tlaToCode(apiMatch.homeTeam.tla);
  const awayCode = tlaToCode(apiMatch.awayTeam.tla);
  const group = extractGroupLetter(apiMatch.group);
  const stage = STAGE_TO_ROUND[apiMatch.stage] ?? apiMatch.stage;

  let localMatchId: string | null = null;
  if (stage === 'GROUP') {
    localMatchId = mapGroupMatchToLocalId(homeCode, awayCode, group);
  } else {
    localMatchId = mapKnockoutMatchToLocalId(apiMatch.stage, knockoutIndex);
  }

  const { score, penalties } = mapScore(apiMatch.score);

  return {
    apiMatchId: apiMatch.id,
    localMatchId,
    homeCode,
    awayCode,
    homeName: apiMatch.homeTeam.name ?? null,
    awayName: apiMatch.awayTeam.name ?? null,
    homeShortName: apiMatch.homeTeam.shortName ?? null,
    awayShortName: apiMatch.awayTeam.shortName ?? null,
    homeFlag: apiMatch.homeTeam.crest ?? null,
    awayFlag: apiMatch.awayTeam.crest ?? null,
    utcDate: apiMatch.utcDate,
    status: apiMatch.status,
    venue: apiMatch.venue ?? null,
    score,
    penalties,
    actualResult: getActualResult(apiMatch, penalties),
    stage,
    group,
  };
}

// --- Derive the displayed score and shootout tally ---
// football-data.org folds the penalty shootout into `fullTime` for
// PENALTY_SHOOTOUT matches: `fullTime = regularTime + extraTime + shootout`
// (e.g. a 1-1 game won 4-3 on penalties reports fullTime as 5-4). We surface
// the on-field 120-minute score (regularTime + extraTime) as the main score
// and the shootout tally separately.
//
// NOTE: the standalone `penalties` and `winner` fields are NOT reliable in this
// feed (observed e.g. penalties 4-4 / winner null for a match decided 4-3). The
// only dependable source is `fullTime`, so we recover the shootout tally by
// subtraction rather than trusting `penalties`.
function mapScore(s: FDApiMatch['score']): {
  score: LiveMatch['score'];
  penalties: LiveMatch['penalties'];
} {
  if (s.duration === 'PENALTY_SHOOTOUT') {
    const reg = s.regularTime;
    const et = s.extraTime;
    const ft = s.fullTime;

    // On-field score = regulation + extra time (fall back to fullTime if the
    // breakdown is missing, though that would include the shootout).
    let score: LiveMatch['score'] = null;
    if (reg && reg.home !== null && reg.away !== null) {
      score = {
        home: reg.home + (et?.home ?? 0),
        away: reg.away + (et?.away ?? 0),
      };
    } else if (ft.home !== null && ft.away !== null) {
      score = { home: ft.home, away: ft.away };
    }

    // Shootout tally = fullTime - (regularTime + extraTime). Only derivable when
    // we have both the aggregate and the on-field breakdown.
    let penalties: LiveMatch['penalties'] = null;
    if (
      ft.home !== null &&
      ft.away !== null &&
      reg &&
      reg.home !== null &&
      reg.away !== null
    ) {
      const penHome = ft.home - reg.home - (et?.home ?? 0);
      const penAway = ft.away - reg.away - (et?.away ?? 0);
      // Guard against bad feed data producing negatives.
      if (penHome >= 0 && penAway >= 0) {
        penalties = { home: penHome, away: penAway };
      }
    }
    return { score, penalties };
  }

  const score =
    s.fullTime.home !== null && s.fullTime.away !== null
      ? { home: s.fullTime.home, away: s.fullTime.away }
      : null;
  return { score, penalties: null };
}

// --- Exported fetchers ---

const MATCHES_PATH = `/competitions/${COMPETITION}/matches`;

export type MatchFetchMode = 'full' | 'today' | 'live' | 'ids';

export interface MatchFetchOptions {
  mode?: MatchFetchMode;
  date?: string;
  ids?: number[];
  force?: boolean;
}

function mapMatchesResponse(data: FDMatchesResponse, force: boolean): {
  matches: LiveMatch[];
  source: 'api' | 'cache';
} {
  // Track knockout match indices per stage
  const knockoutCounters: Record<string, number> = {};

  const matches: LiveMatch[] = [];
  for (const apiMatch of data.matches) {
    const stage = apiMatch.stage;
    if (!knockoutCounters[stage]) knockoutCounters[stage] = 0;
    const idx = knockoutCounters[stage];
    knockoutCounters[stage]++;

    const mapped = mapApiMatch(apiMatch, idx);
    if (mapped) matches.push(mapped);
  }

  // Bind R32 fixtures to their FIFA slot by team identity (each qualified team
  // belongs to exactly one slot). Fixtures with no known team stay unbound rather
  // than falling back to response order, which previously fabricated matchups.
  const r32SlotByTeam = buildR32TeamSlotIndex(matches);
  for (const m of matches) {
    if (m.stage !== 'R32' || m.localMatchId) continue;
    const byHome = m.homeCode ? r32SlotByTeam.get(m.homeCode) : undefined;
    const byAway = m.awayCode ? r32SlotByTeam.get(m.awayCode) : undefined;
    m.localMatchId = byHome ?? byAway ?? null;
  }

  return { matches, source: force ? 'api' : 'cache' };
}

function buildMatchesPath(opts: MatchFetchOptions): string | null {
  const mode = opts.mode ?? 'full';
  const params = new URLSearchParams();

  if (mode === 'today') {
    params.set('date', opts.date ?? new Date().toISOString().slice(0, 10));
    return `${MATCHES_PATH}?${params.toString()}`;
  }

  if (mode === 'live') {
    params.set('status', 'LIVE');
    return `${MATCHES_PATH}?${params.toString()}`;
  }

  if (mode === 'ids') {
    const ids = Array.from(new Set(opts.ids ?? [])).filter(Number.isFinite);
    if (ids.length === 0) return null;
    params.set('ids', ids.join(','));
    return `/matches?${params.toString()}`;
  }

  return MATCHES_PATH;
}

export async function fetchLiveMatches(force = false): Promise<{
  matches: LiveMatch[];
  source: 'api' | 'cache';
} | null> {
  return fetchMatches({ mode: 'full', force });
}

export async function fetchMatches(opts: MatchFetchOptions = {}): Promise<{
  matches: LiveMatch[];
  source: 'api' | 'cache';
} | null> {
  const force = !!opts.force;
  const path = buildMatchesPath(opts);
  if (!path) return null;
  const data = await apiFetch<FDMatchesResponse>(path, force);
  if (!data) return null;

  return mapMatchesResponse(data, force);
}

export async function fetchLiveTeams(): Promise<FDTeamsResponse | null> {
  return apiFetch<FDTeamsResponse>(`/competitions/${COMPETITION}/teams`);
}

export async function fetchLiveStandings(): Promise<FDStandingsResponse | null> {
  return apiFetch<FDStandingsResponse>(`/competitions/${COMPETITION}/standings`);
}
