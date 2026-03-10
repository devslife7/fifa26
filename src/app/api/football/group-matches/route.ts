import { NextResponse } from 'next/server';
import { fetchLiveMatches } from '@/lib/football-api';
import type { GroupLetter, LiveMatch } from '@/types';

export async function GET() {
  const result = await fetchLiveMatches();

  if (!result) {
    return NextResponse.json(
      { groups: {}, source: null, error: 'unavailable' },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
      },
    );
  }

  const groupMatches = result.matches.filter(m => m.stage === 'GROUP' && m.group);

  const groups: Partial<Record<GroupLetter, LiveMatch[]>> = {};
  for (const match of groupMatches) {
    const g = match.group as GroupLetter;
    if (!groups[g]) groups[g] = [];
    groups[g]!.push(match);
  }

  // Sort each group's matches by utcDate
  for (const g of Object.keys(groups) as GroupLetter[]) {
    groups[g]!.sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  }

  return NextResponse.json(
    { groups, source: result.source },
    {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
    },
  );
}
