import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/services/supabase/server';
import { parseMatchSyncOptions } from '@/lib/services/match-sync-request';
import { syncMatches } from '@/lib/services/sync-matches';
import { forbiddenResponse, isAdminRequest } from '@/lib/services/admin-auth-server';

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return forbiddenResponse();

  const url = new URL(request.url);
  const parsed = parseMatchSyncOptions(url.searchParams);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const force = !!parsed.opts.force;
  const cooldownHours = parseInt(process.env.REFRESH_COOLDOWN_HOURS ?? '1', 10);

  if (!force && cooldownHours > 0) {
    const supabase = createServiceClient();
    const { data: latest } = await supabase
      .from('fixtures')
      .select('refreshed_at')
      .order('refreshed_at', { ascending: false })
      .limit(1)
      .single();

    if (latest?.refreshed_at) {
      const ageMs = Date.now() - new Date(latest.refreshed_at).getTime();
      const cooldownMs = cooldownHours * 60 * 60 * 1000;
      if (ageMs < cooldownMs) {
        const retryAfterMinutes = Math.ceil((cooldownMs - ageMs) / 60000);
        return NextResponse.json(
          { error: 'Too soon', retryAfterMinutes },
          { status: 429 },
        );
      }
    }
  }

  const result = await syncMatches(parsed.opts);
  if (result.status === 'api_unavailable') {
    return NextResponse.json({ error: 'API unavailable' }, { status: 502 });
  }
  if (result.status === 'rate_limited') {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }
  if (result.status === 'upsert_failed') {
    return NextResponse.json({ error: 'DB upsert failed' }, { status: 500 });
  }
  if (result.status === 'result_bridge_failed' || result.status === 'score_recalculation_failed') {
    return NextResponse.json(
      { error: result.error ?? 'Scores could not be updated', syncStatus: result.status },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: 'Fixtures refreshed',
    syncStatus: result.status,
    count: result.upserted ?? 0,
    resultsBridged: result.resultsBridged ?? 0,
    scoresUpdated: result.scoresUpdated ?? 0,
    fetchedAt: new Date().toISOString(),
  });
}
