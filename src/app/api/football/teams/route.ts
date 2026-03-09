import { NextResponse } from 'next/server';
import { fetchLiveTeams } from '@/lib/football-api';

export async function GET() {
  const data = await fetchLiveTeams();

  if (!data) {
    return NextResponse.json(
      { teams: [], error: 'unavailable' },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
      },
    );
  }

  return NextResponse.json(
    { teams: data.teams },
    {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
    },
  );
}
