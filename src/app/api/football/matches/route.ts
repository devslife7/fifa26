import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveMatches } from '@/lib/football-api';

export async function GET(request: NextRequest) {
  const force = request.nextUrl.searchParams.get('force') === 'true';
  const result = await fetchLiveMatches(force);

  if (!result) {
    return NextResponse.json(
      { matches: [], source: null, error: 'unavailable' },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
      },
    );
  }

  return NextResponse.json(
    { matches: result.matches, source: result.source },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    },
  );
}
