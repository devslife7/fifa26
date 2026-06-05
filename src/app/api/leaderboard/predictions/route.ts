import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/services/supabase/server';
import { arePredictionDetailsPublic, isLateSubmission } from '@/data/tournament';

export async function GET() {
  try {
    const supabase = createServiceClient();
    const detailsAvailable = arePredictionDetailsPublic();

    const { data, error } = await supabase
      .from('predictions')
      .select('prediction_number, user_id, name, submitter_name, group_matches, knockout_matches, third_place_tiebreaker, champion_code, completed_at, created_at, updated_at, is_approved')
      .eq('is_complete', true)
      .order('completed_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userIds = Array.from(new Set(
      (data ?? [])
        .map((row: Record<string, unknown>) => row.user_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ));

    const profilesById = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);

      for (const profile of profiles ?? []) {
        if (profile.id && profile.display_name) {
          profilesById.set(profile.id, profile.display_name);
        }
      }
    }

    const predictions = (data ?? []).map((row: Record<string, unknown>) => {
      const userId = typeof row.user_id === 'string' ? row.user_id : null;
      return {
        prediction_number: row.prediction_number,
        user_id: `prediction-${row.prediction_number}`,
        name: (row.name as string) ?? null,
        display_name: (row.submitter_name as string | null) || (userId ? profilesById.get(userId) : null) || 'Unknown',
        champion_code: row.champion_code,
        ...(detailsAvailable
          ? {
              group_matches: row.group_matches ?? {},
              knockout_matches: row.knockout_matches ?? {},
              third_place_tiebreaker: row.third_place_tiebreaker ?? null,
            }
          : {}),
        is_approved: row.is_approved ?? false,
        details_available: detailsAvailable,
        is_late_submission: isLateSubmission(row.completed_at as string | null),
        completed_at: row.completed_at ?? null,
        created_at: row.created_at ?? null,
        updated_at: row.updated_at ?? null,
      };
    });

    return NextResponse.json({ predictions, total_users: predictions.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load leaderboard predictions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
