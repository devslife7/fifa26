import { NextResponse } from 'next/server';
import { fetchLiveMatches } from '@/lib/services/football-api';
import { upsertFixturesToDb } from '@/lib/services/fixtures-db';
import { createServiceClient } from '@/lib/services/supabase/server';

export async function POST(request: Request) {
  if (request.headers.get('x-admin-secret') !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const force = new URL(request.url).searchParams.get('force') === 'true';
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

  const result = await fetchLiveMatches(true);
  if (!result) {
    return NextResponse.json({ error: 'API unavailable' }, { status: 502 });
  }

  const count = await upsertFixturesToDb(result.matches);
  if (count === null) {
    return NextResponse.json({ error: 'DB upsert failed' }, { status: 500 });
  }

  return NextResponse.json({
    message: 'Fixtures refreshed',
    count,
    fetchedAt: new Date().toISOString(),
  });
}
