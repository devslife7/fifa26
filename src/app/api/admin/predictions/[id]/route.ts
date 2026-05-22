import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/services/supabase/server';
import { forbiddenResponse, isAdminRequest } from '@/lib/services/admin-auth-server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest(request))) return forbiddenResponse();

  const { id } = await params;
  const body = await request.json();
  const { is_approved } = body;

  if (typeof is_approved !== 'boolean') {
    return NextResponse.json({ error: 'is_approved must be a boolean' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('predictions')
    .update({ is_approved })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prediction: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest(request))) return forbiddenResponse();

  const { id } = await params;
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('predictions')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
