import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/services/supabase/server';
import { getAuthUser } from '@/lib/services/auth-server';
import { sendPredictionConfirmation } from '@/lib/services/prediction-confirmation';
import { claimPredictionsForUser } from '@/lib/services/prediction-claiming';

const MAX_PREDICTIONS = 10;

export const runtime = 'nodejs';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  try {
    await claimPredictionsForUser(supabase, user.sub, user.email);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to claim predictions';
    return NextResponse.json({ error: message }, { status: 500 });
  }

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
    resendEmail,
    name,
    groupMatches,
    knockoutMatches,
    thirdPlaceTiebreaker,
    championCode,
    isComplete,
    submitterName,
    submitterEmail,
    shareToken: resendShareToken,
  } = body;
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedSubmitterName = typeof submitterName === 'string' ? submitterName.trim() : '';
  const normalizedSubmitterEmail = typeof submitterEmail === 'string' ? submitterEmail.trim().toLowerCase() : '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (resendEmail || resendShareToken) {
    if (!resendEmail || typeof resendEmail !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!resendShareToken || typeof resendShareToken !== 'string') {
      return NextResponse.json({ error: 'Share token is required' }, { status: 400 });
    }
    if (!emailRegex.test(resendEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const { data: prediction, error } = await serviceClient
      .from('predictions')
      .select('id, prediction_number, name, submitter_name, completed_at, share_token, group_matches, knockout_matches, third_place_tiebreaker')
      .eq('share_token', resendShareToken)
      .eq('is_complete', true)
      .single();

    if (error || !prediction) {
      return NextResponse.json({ error: 'Prediction not found' }, { status: 404 });
    }

    const origin = request.headers.get('origin') || 'https://fifa26.app';
    const confirmation = await sendPredictionConfirmation({
      supabase: serviceClient,
      prediction,
      to: resendEmail.trim(),
      displayName: prediction.submitter_name || prediction.name || 'Predictor',
      origin,
      groupMatches: prediction.group_matches ?? {},
      knockoutMatches: prediction.knockout_matches ?? {},
      thirdPlaceTiebreaker: prediction.third_place_tiebreaker ?? null,
    });

    if (!confirmation.emailSent) {
      return NextResponse.json(
        { error: 'Unable to send confirmation email. Please try again later.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  }

  const user = await getAuthUser();

  // Anonymous submission
  if (!user) {
    if (predictionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isComplete && !normalizedName) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!normalizedSubmitterEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!emailRegex.test(normalizedSubmitterEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }
    if (isComplete && !normalizedSubmitterName) {
      return NextResponse.json({ error: 'Submitter name is required' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    const shareToken = isComplete
      ? Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
      : undefined;

    const { data, error } = await serviceClient
      .from('predictions')
      .insert({
        user_id: null,
        name: normalizedName || 'My Predictions',
        submitter_name: normalizedSubmitterName || null,
        submitter_email: normalizedSubmitterEmail,
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

    if (data?.share_token && championCode) {
      const origin = request.headers.get('origin') || 'https://fifa26.app';
      await sendPredictionConfirmation({
        supabase: serviceClient,
        prediction: data,
        to: normalizedSubmitterEmail,
        displayName: normalizedSubmitterName,
        origin,
        groupMatches: groupMatches ?? {},
        knockoutMatches: knockoutMatches ?? {},
        thirdPlaceTiebreaker: thirdPlaceTiebreaker ?? null,
      });
    }

    return NextResponse.json({ predictions: data });
  }

  // Authenticated flow
  if (isComplete && !normalizedName) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
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
        third_place_tiebreaker: thirdPlaceTiebreaker ?? null,
        champion_code: championCode,
        is_complete: isComplete ?? false,
        completed_at: isComplete ? new Date().toISOString() : null,
        share_token: shareToken,
        updated_at: new Date().toISOString(),
        ...(normalizedName ? { name: normalizedName } : {}),
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
        displayName: user.display_name || normalizedName || data.name || 'Predictor',
        origin,
        groupMatches: groupMatches ?? {},
        knockoutMatches: knockoutMatches ?? {},
        thirdPlaceTiebreaker: thirdPlaceTiebreaker ?? null,
      });
    }

    return NextResponse.json({ predictions: data });
  } else {
    // --- CREATE new prediction (authenticated) ---
    if (!normalizedName) {
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
        name: normalizedName,
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

    if (isComplete && data?.share_token && championCode) {
      const origin = request.headers.get('origin') || 'https://fifa26.app';
      await sendPredictionConfirmation({
        supabase,
        prediction: data,
        to: user.email,
        displayName: user.display_name || normalizedName || 'Predictor',
        origin,
        groupMatches: groupMatches ?? {},
        knockoutMatches: knockoutMatches ?? {},
        thirdPlaceTiebreaker: thirdPlaceTiebreaker ?? null,
      });
    }

    return NextResponse.json({ predictions: data });
  }
}
