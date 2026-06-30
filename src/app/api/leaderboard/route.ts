import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/services/supabase/server';
import { positionChangeFromRanks } from '@/lib/services/leaderboard-position';

export async function GET() {
  const supabase = createServiceClient();

  const { data: scores, error: scoresError } = await supabase
    .from('scores')
    .select('*')
    .order('total_points', { ascending: false })
    .limit(100);

  if (scoresError) {
    return NextResponse.json({ error: scoresError.message }, { status: 500 });
  }

  const leaderboard = (scores ?? []).map(row => ({
    ...row,
    position_change: positionChangeFromRanks(row.rank, row.previous_rank),
  }));

  return NextResponse.json({ leaderboard });
}
