import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/services/supabase/server';
import { getAuthUser } from '@/lib/services/auth-server';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Verify ownership
  const { data: prediction } = await supabase
    .from('predictions')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.sub)
    .single();

  if (!prediction) {
    return NextResponse.json({ error: 'Prediction not found' }, { status: 404 });
  }

  // Delete the prediction
  const { error } = await supabase
    .from('predictions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.sub);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { name } = await request.json();
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const normalizedName = name.trim();
  if (!normalizedName) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('predictions')
    .update({ name: normalizedName, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.sub)
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
