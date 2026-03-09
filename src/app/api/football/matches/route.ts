import { NextResponse } from 'next/server';
import { fetchLiveMatches } from '@/lib/football-api';

export async function GET() {
  const result = await fetchLiveMatches();

  if (!result) {
    return NextResponse.json(
      { matches: [], source: null, error: 'unavailable' },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
      },
    );
  }

  const hasLive = result.matches.some(
    m => m.status === 'IN_PLAY' || m.status === 'PAUSED',
  );

  return NextResponse.json(
    { matches: result.matches, source: result.source },
    {
      headers: {
        'Cache-Control': hasLive
          ? 'public, max-age=30, stale-while-revalidate=60'
          : 'public, max-age=60, stale-while-revalidate=300',
      },
    },
  );
}
