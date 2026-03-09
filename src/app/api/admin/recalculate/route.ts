import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateScore } from '@/lib/scoring';

export async function POST(request: Request) {
  const adminSecret = request.headers.get('x-admin-secret');
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = await createClient();

  // Fetch all actual results
  const { data: actualResults, error: resultsError } = await supabase
    .from('actual_results')
    .select('*');

  if (resultsError) {
    return NextResponse.json({ error: resultsError.message }, { status: 500 });
  }

  // Determine actual champion (winner of final match)
  const finalResult = actualResults?.find(r => r.match_id.startsWith('F-'));
  const actualChampion = finalResult?.winning_team ?? null;

  // Fetch all complete predictions with profile data
  const { data: predictions, error: predError } = await supabase
    .from('predictions')
    .select('user_id, group_matches, knockout_matches, champion_code, profiles(display_name)')
    .eq('is_complete', true);

  if (predError) {
    return NextResponse.json({ error: predError.message }, { status: 500 });
  }

  if (!predictions || predictions.length === 0) {
    return NextResponse.json({ message: 'No predictions to score', updated: 0 });
  }

  // Calculate and upsert scores
  const scoreRows = predictions.map(pred => {
    const points = calculateScore(
      {
        user_id: pred.user_id,
        group_matches: pred.group_matches as Record<string, string>,
        knockout_matches: pred.knockout_matches as Record<string, string>,
        champion_code: pred.champion_code,
      },
      actualResults ?? [],
      actualChampion
    );

    const profile = pred.profiles as unknown as { display_name: string } | null;

    return {
      user_id: pred.user_id,
      total_points: points,
      champion_code: pred.champion_code,
      display_name: profile?.display_name ?? 'Unknown',
      calculated_at: new Date().toISOString(),
    };
  });

  const { error: upsertError } = await supabase
    .from('scores')
    .upsert(scoreRows, { onConflict: 'user_id' });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Scores recalculated', updated: scoreRows.length });
}
