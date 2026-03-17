import { NextResponse } from 'next/server';
import { fetchLiveStandings } from '@/lib/services/football-api';

export async function GET() {
  const data = await fetchLiveStandings();

  if (!data) {
    return NextResponse.json(
      { standings: [], error: 'unavailable' },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
      },
    );
  }

  return NextResponse.json(
    { standings: data.standings },
    {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
    },
  );
}
