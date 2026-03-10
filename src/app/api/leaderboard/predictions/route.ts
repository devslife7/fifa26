import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('predictions')
    .select('user_id, group_matches, knockout_matches, champion_code, completed_at, profiles(display_name)')
    .eq('is_complete', true)
    .order('completed_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const predictions = (data ?? []).map((row: Record<string, unknown>) => {
    const profile = row.profiles as { display_name: string } | null;
    return {
      user_id: row.user_id,
      display_name: profile?.display_name ?? 'Unknown',
      champion_code: row.champion_code,
      group_matches: row.group_matches ?? {},
      knockout_matches: row.knockout_matches ?? {},
    };
  });

  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  return NextResponse.json({ predictions, total_users: count ?? predictions.length });
}
