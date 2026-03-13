import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership and check if active
  const { data: prediction } = await supabase
    .from('predictions')
    .select('id, is_active')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!prediction) {
    return NextResponse.json({ error: 'Prediction not found' }, { status: 404 });
  }

  const wasActive = prediction.is_active;

  // Delete the prediction
  const { error } = await supabase
    .from('predictions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If the deleted prediction was active, promote the most recent complete prediction
  if (wasActive) {
    const { data: nextActive } = await supabase
      .from('predictions')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_complete', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (nextActive) {
      await supabase
        .from('predictions')
        .update({ is_active: true })
        .eq('id', nextActive.id);
    }
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name } = await request.json();
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('predictions')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Prediction not found' }, { status: 404 });
  }

  return NextResponse.json({ prediction: data });
}
