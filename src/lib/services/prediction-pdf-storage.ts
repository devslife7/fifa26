import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'prediction-pdfs';

export function getPredictionPdfPath(predictionId: string, predictionNumber?: number | null) {
  const filename = predictionNumber ? `prediction-${predictionNumber}.pdf` : `prediction-${predictionId}.pdf`;
  return `predictions/${predictionId}/${filename}`;
}

export async function uploadPredictionPdf(
  supabase: SupabaseClient,
  params: {
    predictionId: string;
    predictionNumber?: number | null;
    pdfBuffer: Buffer;
  }
) {
  const path = getPredictionPdfPath(params.predictionId, params.predictionNumber);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, params.pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) {
    throw error;
  }

  return {
    path,
    sizeBytes: params.pdfBuffer.byteLength,
  };
}

export async function createPredictionPdfSignedUrl(
  supabase: SupabaseClient,
  path: string
) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}
