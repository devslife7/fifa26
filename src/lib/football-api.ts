import type {
  FDMatchesResponse,
  FDStandingsResponse,
  FDTeamsResponse,
  FDApiMatch,
  FDMatchStatus,
} from '@/types/football-api';
import type { LiveMatch } from '@/types';

const BASE_URL = 'https://api.football-data.org/v4';
const COMPETITION = 'WC';

// --- In-memory cache ---
interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string, ttlMs: number): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > ttlMs) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, fetchedAt: Date.now() });
}

// --- API key ---
function getApiKey(): string | undefined {
  return process.env.FOOTBALL_DATA_API_KEY;
}

// --- Generic fetcher ---
async function apiFetch<T>(path: string, ttlMs: number): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const cached = getCached<T>(path, ttlMs);
  if (cached) return cached;

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'X-Auth-Token': apiKey },
      next: { revalidate: Math.floor(ttlMs / 1000) },
    });
    if (!res.ok) return null;
    const data: T = await res.json();
    setCache(path, data);
    return data;
  } catch {
    return null;
  }
}

// --- TLA → app code mapping ---
// football-data.org uses FIFA three-letter abbreviations; our app uses ISO-based codes
const TLA_TO_APP_CODE: Record<string, string> = {
  USA: 'US',
  MAR: 'MA',
  SCO: 'GB-SCT',
  SVN: 'SI',
  POR: 'PT',
  ECU: 'EC',
  KSA: 'SA',
  BOL: 'BO',
  ARG: 'AR',
  MEX: 'MX',
  UZB: 'UZ',
  JAM: 'JM',
  FRA: 'FR',
  COL: 'CO',
  BHR: 'BH',
  NZL: 'NZ',
  ESP: 'ES',
  AUS: 'AU',
  HON: 'HN',
  SRB: 'RS',
  BRA: 'BR',
  ITA: 'IT',
  CIV: 'CI',
  PAR: 'PY',
  ENG: 'GB-ENG',
  SEN: 'SN',
  HAI: 'HT',
  QAT: 'QA',
  GER: 'DE',
  URU: 'UY',
  KOR: 'KR',
  TRI: 'TT',
  JPN: 'JP',
  IRN: 'IR',
  CAN: 'CA',
  CMR: 'CM',
  NED: 'NL',
  CRO: 'HR',
  PAN: 'PA',
  KEN: 'KE',
  BEL: 'BE',
  DEN: 'DK',
  CRC: 'CR',
  NGA: 'NG',
  SUI: 'CH',
  WAL: 'GB-WLS',
  EGY: 'EG',
  IDN: 'ID',
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
  FINAL: 'F',
};

// --- Group letter extraction ---
function extractGroupLetter(apiGroup: string | null): string | null {
  if (!apiGroup) return null;
  // "Group A" → "A"
  const match = apiGroup.match(/Group\s+([A-L])/i);
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
  if (!homeCode || !awayCode || !group) return null;
  const match = allGroupMatches.find(
    m =>
      m.group === group &&
      m.home === homeCode &&
      m.away === awayCode,
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
    utcDate: apiMatch.utcDate,
    status: apiMatch.status,
    venue: apiMatch.venue ?? null,
    score,
    actualResult: getActualResult(apiMatch),
    stage,
    group,
  };
}

// --- TTL logic ---
function hasLiveMatch(matches: FDApiMatch[]): boolean {
  const liveStatuses: FDMatchStatus[] = ['IN_PLAY', 'PAUSED'];
  return matches.some(m => liveStatuses.includes(m.status));
}

// --- Exported fetchers ---

export async function fetchLiveMatches(): Promise<{
  matches: LiveMatch[];
  source: 'api' | 'cache';
} | null> {
  const ttl = 60_000; // 60s default; cache layer handles staleness
  const data = await apiFetch<FDMatchesResponse>(
    `/competitions/${COMPETITION}/matches`,
    ttl,
  );
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

  // Determine dynamic TTL for the cache header hint
  const isLive = hasLiveMatch(data.matches);
  const source = getCached<FDMatchesResponse>(
    `/competitions/${COMPETITION}/matches`,
    0,
  )
    ? 'cache'
    : 'api';

  return { matches, source: isLive ? 'api' : source };
}

export async function fetchLiveTeams(): Promise<FDTeamsResponse | null> {
  return apiFetch<FDTeamsResponse>(
    `/competitions/${COMPETITION}/teams`,
    300_000, // 5 min
  );
}

export async function fetchLiveStandings(): Promise<FDStandingsResponse | null> {
  return apiFetch<FDStandingsResponse>(
    `/competitions/${COMPETITION}/standings`,
    300_000, // 5 min
  );
}
