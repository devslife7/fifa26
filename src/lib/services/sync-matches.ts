import { createServiceClient } from '@/lib/services/supabase/server';
import { fetchLiveMatches } from '@/lib/services/football-api';
import { getFixturesFromDb, upsertFixturesToDb } from '@/lib/services/fixtures-db';
import { recalculateScores } from '@/lib/services/recalculate-scores';
import type { LiveMatch } from '@/types';

const STALE_AFTER_MS = 30_000;

export type SyncStatus =
  | 'synced'
  | 'skipped_fresh'
  | 'skipped_unchanged'
  | 'api_unavailable'
  | 'rate_limited'
  | 'upsert_failed';

export interface SyncResult {
  status: SyncStatus;
  upserted?: number;
  resultsBridged?: number;
  scoresUpdated?: number;
}

let syncInFlight: Promise<SyncResult> | null = null;

export async function syncMatches(opts: { force?: boolean } = {}): Promise<SyncResult> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = doSync(opts).finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

async function doSync(opts: { force?: boolean }): Promise<SyncResult> {
  const force = !!opts.force;

  if (!force) {
    const supabase = createServiceClient();
    const { data: latest } = await supabase
      .from('fixtures')
      .select('refreshed_at')
      .order('refreshed_at', { ascending: false })
      .limit(1)
      .single();
    if (latest?.refreshed_at) {
      const ageMs = Date.now() - new Date(latest.refreshed_at).getTime();
      if (ageMs < STALE_AFTER_MS) {
        return { status: 'skipped_fresh' };
      }
    }
  }

  let fetched;
  try {
    fetched = await fetchLiveMatches(true);
  } catch (e) {
    if (e instanceof Error && e.message === 'RATE_LIMITED') {
      return { status: 'rate_limited' };
    }
    return { status: 'api_unavailable' };
  }
  if (!fetched) return { status: 'api_unavailable' };

  const existing = await getFixturesFromDb();
  if (matchesEqual(existing, fetched.matches)) {
    return { status: 'skipped_unchanged' };
  }

  const upserted = await upsertFixturesToDb(fetched.matches);
  if (upserted === null) return { status: 'upsert_failed' };

  const resultsBridged = await bridgeFinishedToActualResults(fetched.matches);

  const recalc = await recalculateScores();
  const scoresUpdated = recalc.ok ? recalc.updated : 0;

  return {
    status: 'synced',
    upserted,
    resultsBridged,
    scoresUpdated,
  };
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

async function bridgeFinishedToActualResults(matches: LiveMatch[]): Promise<number> {
  const rows = matches
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

  if (rows.length === 0) return 0;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('actual_results')
    .upsert(rows, { onConflict: 'match_id' });
  if (error) return 0;
  return rows.length;
}
