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
};

export async function claimPredictionsForUser(
  supabase: SupabaseClient,
  userId: string,
  email: string,
): Promise<PredictionClaimResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return { claimedCount: 0 };

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
    return { claimedCount: 0 };
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

  return { claimedCount: claimable.length };
}
