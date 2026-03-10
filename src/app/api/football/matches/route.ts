import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveMatches } from '@/lib/football-api';
import { getFixturesFromDb } from '@/lib/fixtures-db';

const CACHE_HEADERS = { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' };

export async function GET(request: NextRequest) {
  const force = request.nextUrl.searchParams.get('force') === 'true';

  if (!force) {
    const dbMatches = await getFixturesFromDb();
    if (dbMatches.length > 0) {
      return NextResponse.json({ matches: dbMatches, source: 'db' }, { headers: CACHE_HEADERS });
    }
  }

  // Fallback: in-memory API cache
  const result = await fetchLiveMatches(force);
  if (!result) {
    return NextResponse.json(
      { matches: [], source: null, error: 'unavailable' },
      { status: 200, headers: CACHE_HEADERS },
    );
  }

  return NextResponse.json(
    { matches: result.matches, source: result.source },
    { headers: CACHE_HEADERS },
  );
}
