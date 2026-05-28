import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/services/supabase/server';
import { forbiddenResponse, isAdminRequest } from '@/lib/services/admin-auth-server';

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return forbiddenResponse();

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('predictions')
    .select('id, prediction_number, user_id, submitter_name, submitter_email, champion_code, is_approved, is_complete, completed_at, created_at, profiles!left(display_name, email)')
    .eq('is_complete', true)
    .order('completed_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ predictions: data });
}
