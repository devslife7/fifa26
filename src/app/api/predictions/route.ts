import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MAX_PREDICTIONS = 10;

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
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ predictions: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { predictionId, name, groupMatches, knockoutMatches, thirdPlaceTiebreaker, championCode, isComplete } = body;

  if (predictionId) {
    // --- UPDATE existing prediction ---
    // Verify ownership
    const { data: existing } = await supabase
      .from('predictions')
      .select('id, share_token')
      .eq('id', predictionId)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Prediction not found' }, { status: 404 });
    }

    // Only generate share token if completing for the first time
    const shareToken = (isComplete && !existing.share_token)
      ? Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
      : existing.share_token;

    const { data, error } = await supabase
      .from('predictions')
      .update({
        group_matches: groupMatches,
        knockout_matches: knockoutMatches,
        third_place_tiebreaker: thirdPlaceTiebreaker ?? null,
        champion_code: championCode,
        is_complete: isComplete ?? false,
        completed_at: isComplete ? new Date().toISOString() : null,
        share_token: shareToken,
        updated_at: new Date().toISOString(),
        ...(name ? { name } : {}),
      })
      .eq('id', predictionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ predictions: data });
  } else {
    // --- CREATE new prediction ---
    if (!name) {
      return NextResponse.json({ error: 'Name is required for new predictions' }, { status: 400 });
    }

    // Enforce max predictions limit
    const { count } = await supabase
      .from('predictions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (count !== null && count >= MAX_PREDICTIONS) {
      return NextResponse.json({ error: `Maximum of ${MAX_PREDICTIONS} predictions reached` }, { status: 400 });
    }

    const shareToken = isComplete
      ? Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
      : undefined;

    const { data, error } = await supabase
      .from('predictions')
      .insert({
        user_id: user.id,
        name,
        group_matches: groupMatches ?? {},
        knockout_matches: knockoutMatches ?? {},
        third_place_tiebreaker: thirdPlaceTiebreaker ?? null,
        champion_code: championCode,
        is_complete: isComplete ?? false,
        completed_at: isComplete ? new Date().toISOString() : null,
        share_token: shareToken,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ predictions: data });
  }
}
