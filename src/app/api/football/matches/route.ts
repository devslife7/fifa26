import { NextRequest, NextResponse } from 'next/server';
import { getFixturesFromDb } from '@/lib/services/fixtures-db';
import { syncMatches, type SyncMatchesOptions } from '@/lib/services/sync-matches';
import { parseMatchSyncOptions } from '@/lib/services/match-sync-request';
import { getHotMatchApiIds, isWinnerPending } from '@/lib/utils/hot-matches';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(request: NextRequest) {
  const parsed = parseMatchSyncOptions(request.nextUrl.searchParams);
  if (parsed.error) {
    return NextResponse.json({ matches: [], error: parsed.error }, { status: 400, headers: NO_STORE });
  }

  let rateLimited = false;
  let syncStatus: string | null = null;
  let syncResult: Awaited<ReturnType<typeof syncMatches>> | null = null;
  let matches = await getFixturesFromDb();

  try {
    const hotIds = !parsed.explicitMode && !parsed.opts.force
      ? getHotMatchApiIds(matches)
      : [];
    const syncOpts: SyncMatchesOptions = hotIds.length > 0
      ? { mode: 'ids', ids: hotIds }
      : parsed.opts;
    syncResult = await syncMatches(syncOpts);
    syncStatus = syncResult.status;
    if (syncResult.status === 'rate_limited') rateLimited = true;
  } catch (e) {
    console.error('syncMatches failed', e);
  }

  matches = await getFixturesFromDb();
  const winnerPendingIds = matches.filter(isWinnerPending).map(match => match.apiMatchId);

  const responseStatus = syncStatus === 'rate_limited'
    ? 429
    : syncStatus === 'api_unavailable'
      ? 502
      : syncStatus === 'result_bridge_failed' || syncStatus === 'score_recalculation_failed' || syncStatus === 'upsert_failed'
        ? 500
        : 200;

  return NextResponse.json(
    {
      matches,
      source: 'db',
      rateLimited,
      syncStatus,
      winnerPendingIds,
      resultsBridged: syncResult?.resultsBridged ?? 0,
      scoresUpdated: syncResult?.scoresUpdated ?? 0,
      scoringStatus: syncResult?.scoringStatus ?? 'unchanged',
      syncError: syncResult?.error
        ?? (syncStatus === 'api_unavailable' ? 'Football data API unavailable' : null),
    },
    {
      headers: NO_STORE,
      status: responseStatus,
    },
  );
}
