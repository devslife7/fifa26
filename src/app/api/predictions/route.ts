import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ predictions: data ?? null });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { groupMatches, knockoutMatches, championCode, isComplete } = body;

  // Generate share token if complete
  const shareToken = isComplete
    ? Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
    : undefined;

  const { data, error } = await supabase
    .from('predictions')
    .upsert({
      user_id: user.id,
      group_matches: groupMatches,
      knockout_matches: knockoutMatches,
      champion_code: championCode,
      is_complete: isComplete ?? false,
      completed_at: isComplete ? new Date().toISOString() : null,
      share_token: shareToken,
    }, {
      onConflict: 'user_id',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ predictions: data });
}
