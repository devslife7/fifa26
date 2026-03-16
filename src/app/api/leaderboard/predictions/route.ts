import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('predictions')
    .select('prediction_number, user_id, group_matches, knockout_matches, third_place_tiebreaker, champion_code, completed_at, is_approved, profiles(display_name)')
    .eq('is_complete', true)
    .eq('is_active', true)
    .not('user_id', 'is', null)
    .order('completed_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const predictions = (data ?? []).map((row: Record<string, unknown>) => {
    const profile = row.profiles as { display_name: string } | null;
    return {
      prediction_number: row.prediction_number,
      user_id: row.user_id,
      display_name: profile?.display_name ?? 'Unknown',
      champion_code: row.champion_code,
      group_matches: row.group_matches ?? {},
      knockout_matches: row.knockout_matches ?? {},
      third_place_tiebreaker: row.third_place_tiebreaker ?? null,
      is_approved: row.is_approved ?? false,
    };
  });

  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  return NextResponse.json({ predictions, total_users: count ?? predictions.length });
}
