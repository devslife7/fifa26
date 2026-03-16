import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth-server';

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { predictionId } = await request.json();
  if (!predictionId) {
    return NextResponse.json({ error: 'predictionId is required' }, { status: 400 });
  }

  // Verify ownership and that the prediction is complete
  const { data: prediction } = await supabase
    .from('predictions')
    .select('id, is_complete')
    .eq('id', predictionId)
    .eq('user_id', user.sub)
    .single();

  if (!prediction) {
    return NextResponse.json({ error: 'Prediction not found' }, { status: 404 });
  }

  if (!prediction.is_complete) {
    return NextResponse.json({ error: 'Only complete predictions can be set as active' }, { status: 400 });
  }

  // Deactivate all user predictions
  await supabase
    .from('predictions')
    .update({ is_active: false })
    .eq('user_id', user.sub)
    .eq('is_active', true);

  // Activate the specified prediction
  const { data, error } = await supabase
    .from('predictions')
    .update({ is_active: true })
    .eq('id', predictionId)
    .eq('user_id', user.sub)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prediction: data });
}
