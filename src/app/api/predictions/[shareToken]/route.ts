import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const { shareToken } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('predictions')
    .select('*, profiles(display_name)')
    .eq('share_token', shareToken)
    .eq('is_complete', true)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ prediction: data });
}
