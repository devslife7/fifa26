import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/services/supabase/server';

export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .order('total_points', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leaderboard: data ?? [] });
}
