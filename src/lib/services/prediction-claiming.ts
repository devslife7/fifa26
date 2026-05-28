import type { SupabaseClient } from '@supabase/supabase-js';

type ClaimablePrediction = {
  id: string;
  is_complete: boolean | null;
  completed_at: string | null;
  created_at: string | null;
  submitter_email: string | null;
};

export type PredictionClaimResult = {
  claimedCount: number;
  activatedPredictionId: string | null;
};

export async function claimPredictionsForUser(
  supabase: SupabaseClient,
  userId: string,
  email: string,
): Promise<PredictionClaimResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return { claimedCount: 0, activatedPredictionId: null };

  const { data: candidates, error: candidateError } = await supabase
    .from('predictions')
    .select('id, is_complete, completed_at, created_at, submitter_email')
    .is('user_id', null)
    .ilike('submitter_email', normalizedEmail);

  if (candidateError) {
    throw candidateError;
  }

  const claimable = ((candidates ?? []) as ClaimablePrediction[])
    .filter(prediction => prediction.submitter_email?.trim().toLowerCase() === normalizedEmail);

  if (claimable.length === 0) {
    return { claimedCount: 0, activatedPredictionId: null };
  }

  const claimableIds = claimable.map(prediction => prediction.id);
  const { error: claimError } = await supabase
    .from('predictions')
    .update({ user_id: userId, updated_at: new Date().toISOString() })
    .in('id', claimableIds)
    .is('user_id', null);

  if (claimError) {
    throw claimError;
  }

  const { data: activePredictions, error: activeError } = await supabase
    .from('predictions')
    .select('id, is_complete')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(10);

  if (activeError) {
    throw activeError;
  }

  if ((activePredictions ?? []).some(prediction => prediction.is_complete)) {
    return { claimedCount: claimable.length, activatedPredictionId: null };
  }

  const newestCompleted = claimable
    .filter(prediction => prediction.is_complete)
    .sort((a, b) => {
      const aTime = new Date(a.completed_at ?? a.created_at ?? 0).getTime();
      const bTime = new Date(b.completed_at ?? b.created_at ?? 0).getTime();
      return bTime - aTime;
    })[0];

  if (!newestCompleted) {
    return { claimedCount: claimable.length, activatedPredictionId: null };
  }

  if ((activePredictions ?? []).length > 0) {
    const { error: deactivateError } = await supabase
      .from('predictions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (deactivateError) {
      throw deactivateError;
    }
  }

  const { error: activateError } = await supabase
    .from('predictions')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', newestCompleted.id)
    .eq('user_id', userId)
    .eq('is_complete', true)
    .eq('is_active', false);

  if (activateError) {
    throw activateError;
  }

  return { claimedCount: claimable.length, activatedPredictionId: newestCompleted.id };
}
