import { NextRequest, NextResponse } from 'next/server';
import { getFixturesFromDb } from '@/lib/services/fixtures-db';
import { syncMatches } from '@/lib/services/sync-matches';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(request: NextRequest) {
  const force = request.nextUrl.searchParams.get('force') === 'true';

  let rateLimited = false;
  let syncStatus: string | null = null;
  try {
    const result = await syncMatches({ force });
    syncStatus = result.status;
    if (result.status === 'rate_limited') rateLimited = true;
  } catch (e) {
    console.error('syncMatches failed', e);
  }

  const matches = await getFixturesFromDb();

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
