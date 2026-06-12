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
    } catch {
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

// For knockout matches, map by stage + position (harder without knowing bracket layout)
// We'll store knockout matches with a generated ID based on stage
function mapKnockoutMatchToLocalId(
  stage: string,
  matchIndex: number,
): string | null {
  const round = STAGE_TO_ROUND[stage];
  if (!round || round === 'GROUP') return null;
  return `${round}-${matchIndex + 1}`;
}

// --- Determine actual result ---
function getActualResult(apiMatch: FDApiMatch): LiveMatch['actualResult'] {
  if (apiMatch.status !== 'FINISHED') return null;
  const winner = apiMatch.score.winner;
  if (winner === 'HOME_TEAM') return 'home';
  if (winner === 'AWAY_TEAM') return 'away';
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

  const score =
    apiMatch.score.fullTime.home !== null && apiMatch.score.fullTime.away !== null
      ? { home: apiMatch.score.fullTime.home, away: apiMatch.score.fullTime.away }
      : null;

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
    actualResult: getActualResult(apiMatch),
    stage,
    group,
  };
}

// --- Exported fetchers ---

const MATCHES_PATH = `/competitions/${COMPETITION}/matches`;

export async function fetchLiveMatches(force = false): Promise<{
  matches: LiveMatch[];
  source: 'api' | 'cache';
} | null> {
  const data = await apiFetch<FDMatchesResponse>(MATCHES_PATH, force);
  if (!data) return null;

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

  return { matches, source: force ? 'api' : 'cache' };
}

export async function fetchLiveTeams(): Promise<FDTeamsResponse | null> {
  return apiFetch<FDTeamsResponse>(`/competitions/${COMPETITION}/teams`);
}

export async function fetchLiveStandings(): Promise<FDStandingsResponse | null> {
  return apiFetch<FDStandingsResponse>(`/competitions/${COMPETITION}/standings`);
}
