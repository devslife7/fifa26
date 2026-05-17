import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/services/auth-server';
import { createServiceClient } from '@/lib/services/supabase/server';
import { createPredictionPdfSignedUrl } from '@/lib/services/prediction-pdf-storage';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: prediction, error } = await supabase
    .from('predictions')
    .select('id, pdf_path')
    .eq('id', id)
    .eq('user_id', user.sub)
    .single();

  if (error || !prediction) {
    return NextResponse.json({ error: 'Prediction not found' }, { status: 404 });
  }

  if (!prediction.pdf_path) {
    return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
  }

  try {
    const signedUrl = await createPredictionPdfSignedUrl(supabase, prediction.pdf_path);
    return NextResponse.redirect(signedUrl);
  } catch (err) {
    console.error('Failed to create prediction PDF signed URL:', err);
    return NextResponse.json({ error: 'Failed to create PDF download link' }, { status: 500 });
  }
}
