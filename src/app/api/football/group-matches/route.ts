import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveMatches } from '@/lib/services/football-api';
import { getFixturesFromDb } from '@/lib/services/fixtures-db';
import { syncMatches } from '@/lib/services/sync-matches';
import type { GroupLetter, LiveMatch } from '@/types';

const NO_STORE = { 'Cache-Control': 'no-store' };

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
  return NextResponse.json({ groups, source }, { headers: NO_STORE });
}

export async function GET(request: NextRequest) {
  const force = request.nextUrl.searchParams.get('force') === 'true';

  try {
    await syncMatches({ force });
  } catch (e) {
    console.error('syncMatches failed', e);
  }

  const dbMatches = await getFixturesFromDb();
  if (dbMatches.length > 0) {
    return buildGroupsResponse(dbMatches, 'db');
  }

  // Fallback: in-memory API cache
  const result = await fetchLiveMatches();
  if (!result) {
    return NextResponse.json(
      { groups: {}, source: null, error: 'unavailable' },
      { status: 200, headers: NO_STORE },
    );
  }

  return buildGroupsResponse(result.matches, result.source);
}
