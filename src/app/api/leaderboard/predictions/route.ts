import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('predictions')
    .select('prediction_number, user_id, name, submitter_name, group_matches, knockout_matches, third_place_tiebreaker, champion_code, completed_at, created_at, updated_at, is_approved, profiles!left(display_name)')
    .eq('is_complete', true)
    .order('completed_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const predictions = (data ?? []).map((row: Record<string, unknown>) => {
    const profile = row.profiles as { display_name: string } | null;
    return {
      prediction_number: row.prediction_number,
      user_id: row.user_id ?? `anon-${row.prediction_number}`,
      name: (row.name as string) ?? null,
      display_name: profile?.display_name ?? (row.submitter_name as string) ?? 'Unknown',
      champion_code: row.champion_code,
      group_matches: row.group_matches ?? {},
      knockout_matches: row.knockout_matches ?? {},
      third_place_tiebreaker: row.third_place_tiebreaker ?? null,
      is_approved: row.is_approved ?? false,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
    };
  });

  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  return NextResponse.json({ predictions, total_users: count ?? predictions.length });
}
