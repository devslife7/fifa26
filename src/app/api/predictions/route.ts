import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/services/supabase/server';
import { getAuthUser } from '@/lib/services/auth-server';
import { sendPredictionConfirmation } from '@/lib/services/prediction-confirmation';

const MAX_PREDICTIONS = 10;

export const runtime = 'nodejs';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Claim any unclaimed predictions that match the user's email
  await supabase
    .from('predictions')
    .update({ user_id: user.sub })
    .is('user_id', null)
    .eq('submitter_email', user.email);

  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', user.sub)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ predictions: data ?? [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    predictionId,
    name,
    groupMatches,
    knockoutMatches,
    groupTiebreakers,
    thirdPlaceTiebreaker,
    championCode,
    isComplete,
    submitterName,
    submitterEmail,
  } = body;

  // Anonymous submission (no predictionId, has submitterEmail)
  if (!predictionId && submitterEmail) {
    if (!submitterEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    const shareToken = isComplete
      ? Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
      : undefined;

    const { data, error } = await serviceClient
      .from('predictions')
      .insert({
        user_id: null,
        name: name || 'My Predictions',
        submitter_name: submitterName || submitterEmail.split('@')[0],
        submitter_email: submitterEmail,
        group_matches: groupMatches ?? {},
        knockout_matches: knockoutMatches ?? {},
        group_tiebreakers: groupTiebreakers ?? {},
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

    if (data?.share_token && championCode) {
      const origin = request.headers.get('origin') || 'https://fifa26.app';
      await sendPredictionConfirmation({
        supabase: serviceClient,
        prediction: data,
        to: submitterEmail,
        displayName: submitterName || name || 'Predictor',
        origin,
        groupMatches: groupMatches ?? {},
        knockoutMatches: knockoutMatches ?? {},
        groupTiebreakers: groupTiebreakers ?? {},
        thirdPlaceTiebreaker: thirdPlaceTiebreaker ?? null,
      });
    }

    return NextResponse.json({ predictions: data });
  }

  // Authenticated flow
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  if (predictionId) {
    // --- UPDATE existing prediction ---
    // Verify ownership
    const { data: existing } = await supabase
      .from('predictions')
      .select('id, share_token, is_complete, pdf_path, confirmation_email_sent_at')
      .eq('id', predictionId)
      .eq('user_id', user.sub)
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
        group_tiebreakers: groupTiebreakers ?? {},
        third_place_tiebreaker: thirdPlaceTiebreaker ?? null,
        champion_code: championCode,
        is_complete: isComplete ?? false,
        completed_at: isComplete ? new Date().toISOString() : null,
        share_token: shareToken,
        updated_at: new Date().toISOString(),
        ...(name ? { name } : {}),
      })
      .eq('id', predictionId)
      .eq('user_id', user.sub)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (
      isComplete &&
      data?.share_token &&
      championCode &&
      (!existing.is_complete || !data.pdf_path || !data.confirmation_email_sent_at)
    ) {
      const origin = request.headers.get('origin') || 'https://fifa26.app';
      await sendPredictionConfirmation({
        supabase,
        prediction: data,
        to: user.email,
        displayName: user.display_name || name || data.name || 'Predictor',
        origin,
        groupMatches: groupMatches ?? {},
        knockoutMatches: knockoutMatches ?? {},
        groupTiebreakers: groupTiebreakers ?? {},
        thirdPlaceTiebreaker: thirdPlaceTiebreaker ?? null,
      });
    }

    return NextResponse.json({ predictions: data });
  } else {
    // --- CREATE new prediction (authenticated) ---
    if (!name) {
      return NextResponse.json({ error: 'Name is required for new predictions' }, { status: 400 });
    }

    // Enforce max predictions limit
    const { count } = await supabase
      .from('predictions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.sub);

    if (count !== null && count >= MAX_PREDICTIONS) {
      return NextResponse.json({ error: `Maximum of ${MAX_PREDICTIONS} predictions reached` }, { status: 400 });
    }

    const shareToken = isComplete
      ? Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
      : undefined;

    const { data, error } = await supabase
      .from('predictions')
      .insert({
        user_id: user.sub,
        name,
        group_matches: groupMatches ?? {},
        knockout_matches: knockoutMatches ?? {},
        group_tiebreakers: groupTiebreakers ?? {},
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

    if (isComplete && data?.share_token && championCode) {
      const origin = request.headers.get('origin') || 'https://fifa26.app';
      await sendPredictionConfirmation({
        supabase,
        prediction: data,
        to: user.email,
        displayName: user.display_name || name || 'Predictor',
        origin,
        groupMatches: groupMatches ?? {},
        knockoutMatches: knockoutMatches ?? {},
        groupTiebreakers: groupTiebreakers ?? {},
        thirdPlaceTiebreaker: thirdPlaceTiebreaker ?? null,
      });
    }

    return NextResponse.json({ predictions: data });
  }
}
