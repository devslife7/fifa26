import { createServiceClient } from '@/lib/services/supabase/server';
import { fetchMatches, type MatchFetchMode } from '@/lib/services/football-api';
import { getFixturesFromDb, upsertFixturesToDb } from '@/lib/services/fixtures-db';
import { recalculateScores } from '@/lib/services/recalculate-scores';
import { bindDeepKnockoutSlots } from '@/lib/logic/actual-bracket';
import type { LiveMatch } from '@/types';

const STALE_AFTER_BY_MODE_MS: Record<MatchFetchMode, number> = {
  // The free plan allows 10 calls/minute. Clients poll every 10 seconds, while
  // this guard prevents duplicate requests from overlapping clients.
  ids: 8_000,
  live: 20_000,
  today: 60_000,
  full: 6 * 60 * 60 * 1000,
};

export type SyncStatus =
  | 'synced'
  | 'skipped_fresh'
  | 'skipped_unchanged'
  | 'api_unavailable'
  | 'rate_limited'
  | 'upsert_failed'
  | 'result_bridge_failed'
  | 'score_recalculation_failed';

export type ScoringStatus = 'updated' | 'unchanged' | 'error';

export interface SyncResult {
  status: SyncStatus;
  upserted?: number;
  resultsBridged?: number;
  scoresUpdated?: number;
  scoringStatus?: ScoringStatus;
  error?: string;
}

export interface SyncMatchesOptions {
  mode?: MatchFetchMode;
  ids?: number[];
  date?: string;
  force?: boolean;
}

const syncInFlight = new Map<string, Promise<SyncResult>>();

export async function syncMatches(opts: SyncMatchesOptions = {}): Promise<SyncResult> {
  const key = syncKey(opts);
  const existing = syncInFlight.get(key);
  if (existing) return existing;

  const promise = doSync(opts).finally(() => {
    syncInFlight.delete(key);
  });
  syncInFlight.set(key, promise);
  return promise;
}

async function doSync(opts: SyncMatchesOptions): Promise<SyncResult> {
  const mode = opts.mode ?? 'full';
  const force = !!opts.force;

  if (!force) {
    if (await shouldSkipFreshSync(opts)) {
      return { status: 'skipped_fresh' };
    }
  }

  let fetched;
  try {
    fetched = await fetchMatches({ mode, date: opts.date, ids: opts.ids, force: true });
  } catch (e) {
    if (e instanceof Error && e.message === 'RATE_LIMITED') {
      return { status: 'rate_limited' };
    }
    return { status: 'api_unavailable' };
  }
  if (!fetched) return { status: 'api_unavailable' };

  const existing = await getFixturesFromDb();
  const fetchedMatches = preserveKnownFixtureIdentity(fetched.matches, existing);
  // Re-derive deep knockout bindings with full DB context. A partial fetch
  // (ids/today) has no group/R32 results of its own to propagate the bracket
  // from, so binding inside mapMatchesResponse comes up empty and the stored id
  // — which may be stale — would be trusted as-is. Binding against the union of
  // the response and the stored fixtures slots fresh fixtures correctly and also
  // heals stale stored bindings.
  bindDeepKnockoutSlots([
    ...existing.filter(e => !fetchedMatches.some(f => f.apiMatchId === e.apiMatchId)),
    ...fetchedMatches,
  ]);
  const relevantExisting = filterExistingToFetched(existing, fetchedMatches);
  if (matchesEqual(relevantExisting, fetchedMatches)) {
    if (force) {
      const bridge = await bridgeFinishedToActualResults(fetchedMatches);
      if (!bridge.ok) {
        return { status: 'result_bridge_failed', resultsBridged: 0, scoringStatus: 'error', error: bridge.error };
      }
      const recalc = await recalculateScores();
      if (!recalc.ok) {
        return {
          status: 'score_recalculation_failed',
          resultsBridged: bridge.count,
          scoresUpdated: 0,
          scoringStatus: 'error',
          error: recalc.error,
        };
      }
      return {
        status: 'skipped_unchanged',
        resultsBridged: bridge.count,
        scoresUpdated: recalc.updated,
        scoringStatus: 'updated',
      };
    }
    return { status: 'skipped_unchanged' };
  }

  const upserted = await upsertFixturesToDb(fetchedMatches);
  if (upserted === null) return { status: 'upsert_failed' };

  const bridge = await bridgeFinishedToActualResults(fetchedMatches);
  if (!bridge.ok) {
    return { status: 'result_bridge_failed', upserted, resultsBridged: 0, scoringStatus: 'error', error: bridge.error };
  }

  const recalc = await recalculateScores();
  if (!recalc.ok) {
    return {
      status: 'score_recalculation_failed',
      upserted,
      resultsBridged: bridge.count,
      scoresUpdated: 0,
      scoringStatus: 'error',
      error: recalc.error,
    };
  }

  return {
    status: 'synced',
    upserted,
    resultsBridged: bridge.count,
    scoresUpdated: recalc.updated,
    scoringStatus: 'updated',
  };
}

function syncKey(opts: SyncMatchesOptions): string {
  const mode = opts.mode ?? 'full';
  const ids = Array.from(new Set(opts.ids ?? [])).sort((a, b) => a - b).join(',');
  return [
    mode,
    opts.date ?? '',
    ids,
    opts.force ? 'force' : 'cached',
  ].join('|');
}

async function shouldSkipFreshSync(opts: SyncMatchesOptions): Promise<boolean> {
  const supabase = createServiceClient();
  const mode = opts.mode ?? 'full';
  const ttl = STALE_AFTER_BY_MODE_MS[mode];

  if (mode === 'ids') {
    const ids = Array.from(new Set(opts.ids ?? [])).sort((a, b) => a - b);
    if (ids.length === 0) return false;

    const { data } = await supabase
      .from('fixtures')
      .select('api_match_id, refreshed_at')
      .in('api_match_id', ids);
    if (!data || data.length < ids.length) return false;

    const refreshedById = new Map(data.map(row => [row.api_match_id as number, row.refreshed_at as string | null]));
    return ids.every((id) => {
      const refreshedAt = refreshedById.get(id);
      return refreshedAt ? Date.now() - new Date(refreshedAt).getTime() < ttl : false;
    });
  }

  let query = supabase
    .from('fixtures')
    .select('refreshed_at')
    .order('refreshed_at', { ascending: true })
    .limit(1);

  if (mode === 'today') {
    const date = opts.date ?? new Date().toISOString().slice(0, 10);
    query = query.gte('utc_date', `${date}T00:00:00`).lt('utc_date', `${date}T23:59:59.999`);
  } else if (mode === 'live') {
    query = query.in('status', ['IN_PLAY', 'PAUSED']);
  }

  const { data } = await query.maybeSingle();
  if (!data?.refreshed_at) return false;
  return Date.now() - new Date(data.refreshed_at).getTime() < ttl;
}

function preserveKnownFixtureIdentity(fetched: LiveMatch[], existing: LiveMatch[]): LiveMatch[] {
  const existingByApiId = new Map(existing.map(match => [match.apiMatchId, match]));
  return fetched.map((match) => {
    const known = existingByApiId.get(match.apiMatchId);
    if (!known) return match;
    // Prefer a freshly-determined binding (e.g. a knockout fixture that now
    // resolves to its venue-based slot) and fall back to the stored id only when
    // this response couldn't determine one — partial syncs (ids/live) may lack
    // the context to re-derive it. This lets corrected bindings propagate.
    return {
      ...match,
      localMatchId: match.localMatchId ?? known.localMatchId,
    };
  });
}

function filterExistingToFetched(existing: LiveMatch[], fetched: LiveMatch[]): LiveMatch[] {
  const fetchedIds = new Set(fetched.map(m => m.apiMatchId));
  return existing.filter(m => fetchedIds.has(m.apiMatchId));
}

function fingerprint(m: LiveMatch): string {
  return [
    m.apiMatchId,
    m.status,
    m.score?.home ?? '',
    m.score?.away ?? '',
    m.actualResult ?? '',
    m.utcDate,
    m.localMatchId ?? '',
    m.homeCode ?? '',
    m.awayCode ?? '',
  ].join('|');
}

function matchesEqual(a: LiveMatch[], b: LiveMatch[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a.map(fingerprint));
  for (const m of b) {
    if (!setA.has(fingerprint(m))) return false;
  }
  return true;
}

async function bridgeFinishedToActualResults(
  matches: LiveMatch[],
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const allRows = finishedMatchesToActualResults(matches);

  // Two fixtures claiming the same slot means at least one binding is wrong —
  // writing either would corrupt actual_results (a stale slot collision once let
  // one R16 result overwrite another's winner). Skip the contested slot entirely
  // and let a later sync with corrected bindings bridge it.
  const idCounts = new Map<string, number>();
  for (const row of allRows) idCounts.set(row.match_id, (idCounts.get(row.match_id) ?? 0) + 1);
  const rows = allRows.filter(row => idCounts.get(row.match_id) === 1);
  const contested = [...idCounts].filter(([, n]) => n > 1).map(([id]) => id);
  if (contested.length > 0) {
    console.error('bridgeFinishedToActualResults: conflicting slot bindings, skipped', contested);
  }

  if (rows.length === 0) return { ok: true, count: 0 };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('actual_results')
    .upsert(rows, { onConflict: 'match_id' });
  if (error) return { ok: false, error: error.message };
  return { ok: true, count: rows.length };
}

/** Convert only settled fixtures into the authoritative scoring rows. */
export function finishedMatchesToActualResults(matches: LiveMatch[]) {
  return matches
    .filter(m => m.status === 'FINISHED' && m.localMatchId && m.actualResult)
    .map(m => {
      const match_type = m.stage === 'GROUP' ? 'group' : 'knockout';
      let winning_team: string | null = null;
      if (m.actualResult === 'home') winning_team = m.homeCode;
      else if (m.actualResult === 'away') winning_team = m.awayCode;
      return {
        match_id: m.localMatchId!,
        match_type,
        result: m.actualResult!,
        winning_team,
      };
    });
}
