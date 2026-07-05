import { NextRequest, NextResponse } from 'next/server';
import { getFixturesFromDb } from '@/lib/services/fixtures-db';
import { syncMatches, type SyncMatchesOptions } from '@/lib/services/sync-matches';
import { parseMatchSyncOptions } from '@/lib/services/match-sync-request';
import { getHotMatchApiIds } from '@/lib/utils/hot-matches';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(request: NextRequest) {
  const parsed = parseMatchSyncOptions(request.nextUrl.searchParams);
  if (parsed.error) {
    return NextResponse.json({ matches: [], error: parsed.error }, { status: 400, headers: NO_STORE });
  }

  let rateLimited = false;
  let syncStatus: string | null = null;
  let matches = await getFixturesFromDb();

  try {
    const hotIds = !parsed.explicitMode && !parsed.opts.force
      ? getHotMatchApiIds(matches)
      : [];
    const syncOpts: SyncMatchesOptions = hotIds.length > 0
      ? { mode: 'ids', ids: hotIds }
      : parsed.opts;
    const result = await syncMatches(syncOpts);
    syncStatus = result.status;
    if (result.status === 'rate_limited') rateLimited = true;
  } catch (e) {
    console.error('syncMatches failed', e);
  }

  matches = await getFixturesFromDb();

  if (rateLimited && matches.length === 0) {
    return NextResponse.json(
      { matches: [], error: 'rate_limited' },
      { status: 429, headers: NO_STORE },
    );
  }

  return NextResponse.json(
    { matches, source: 'db', rateLimited, syncStatus },
    { headers: NO_STORE },
  );
}
