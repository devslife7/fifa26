import { NextResponse } from 'next/server';
import { fetchLiveMatches } from '@/lib/services/football-api';
import { getFixturesFromDb } from '@/lib/services/fixtures-db';
import type { GroupLetter, LiveMatch } from '@/types';

const CACHE_HEADERS = { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' };

function buildGroupsResponse(matches: LiveMatch[], source: string) {
  const groupMatches = matches.filter(m => m.stage === 'GROUP' && m.group);
  const groups: Partial<Record<GroupLetter, LiveMatch[]>> = {};
  for (const match of groupMatches) {
    const g = match.group as GroupLetter;
    if (!groups[g]) groups[g] = [];
    groups[g]!.push(match);
  }
  for (const g of Object.keys(groups) as GroupLetter[]) {
    groups[g]!.sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  }
  return NextResponse.json({ groups, source }, { headers: CACHE_HEADERS });
}

export async function GET() {
  const dbMatches = await getFixturesFromDb();
  if (dbMatches.length > 0) {
    return buildGroupsResponse(dbMatches, 'db');
  }

  // Fallback: in-memory API cache
  const result = await fetchLiveMatches();
  if (!result) {
    return NextResponse.json(
      { groups: {}, source: null, error: 'unavailable' },
      { status: 200, headers: CACHE_HEADERS },
    );
  }

  return buildGroupsResponse(result.matches, result.source);
}
