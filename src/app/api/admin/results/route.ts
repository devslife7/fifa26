import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const adminSecret = request.headers.get('x-admin-secret');
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { matchId, matchType, result, winningTeam } = body;

  if (!matchId || !matchType || !result) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('actual_results')
    .upsert({
      match_id: matchId,
      match_type: matchType,
      result,
      winning_team: winningTeam ?? null,
    }, {
      onConflict: 'match_id',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ result: data });
}
