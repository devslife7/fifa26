import type { SupabaseClient } from '@supabase/supabase-js';
import { sendPredictionEmail } from '@/lib/services/email';
import { generatePredictionPdf } from '@/lib/services/prediction-pdf';
import { uploadPredictionPdf } from '@/lib/services/prediction-pdf-storage';
import type { KnockoutResult, MatchResult } from '@/types';

interface SendPredictionConfirmationParams {
  supabase: SupabaseClient;
  prediction: {
    id: string;
    prediction_number?: number | null;
    name?: string | null;
    submitter_name?: string | null;
    completed_at?: string | null;
    share_token: string | null;
  };
  to: string;
  displayName: string;
  origin: string;
  groupMatches: Record<string, MatchResult>;
  knockoutMatches: Record<string, KnockoutResult>;
  thirdPlaceTiebreaker?: string[] | null;
}

function errorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : 'Unknown error';
  return message.slice(0, 1000);
}

export async function sendPredictionConfirmation({
  supabase,
  prediction,
  to,
  displayName,
  origin,
  groupMatches,
  knockoutMatches,
  thirdPlaceTiebreaker,
}: SendPredictionConfirmationParams) {
  if (!prediction.share_token) return;

  const shareUrl = `${origin}/shared/${prediction.share_token}`;
  let pdfBuffer: Buffer | null = null;

  try {
    pdfBuffer = await generatePredictionPdf({
      predictionId: prediction.id,
      predictionNumber: prediction.prediction_number,
      name: displayName || prediction.name || 'Predictor',
      submittedAt: prediction.completed_at,
      groupMatches,
      knockoutMatches,
      thirdPlaceTiebreaker,
      shareUrl,
    });

    const uploaded = await uploadPredictionPdf(supabase, {
      predictionId: prediction.id,
      predictionNumber: prediction.prediction_number,
      pdfBuffer,
    });

    await supabase
      .from('predictions')
      .update({
        pdf_path: uploaded.path,
        pdf_generated_at: new Date().toISOString(),
        pdf_size_bytes: uploaded.sizeBytes,
        pdf_generation_error: null,
      })
      .eq('id', prediction.id);
  } catch (err) {
    console.error('Prediction PDF generation/upload failed:', err);
    await supabase
      .from('predictions')
      .update({
        pdf_generation_error: errorMessage(err),
      })
      .eq('id', prediction.id);
  }

  try {
    await sendPredictionEmail({
      to,
      name: displayName || prediction.name || 'Predictor',
      predictionNumber: prediction.prediction_number ?? undefined,
      shareUrl,
      pdfAttachment: pdfBuffer
        ? {
            filename: prediction.prediction_number
              ? `prediction-${prediction.prediction_number}.pdf`
              : `prediction-${prediction.id}.pdf`,
            content: pdfBuffer.toString('base64'),
          }
        : undefined,
    });

    await supabase
      .from('predictions')
      .update({
        confirmation_email_sent_at: new Date().toISOString(),
        confirmation_email_error: null,
      })
      .eq('id', prediction.id);
  } catch (err) {
    console.error('Failed to send prediction email:', err);
    await supabase
      .from('predictions')
      .update({
        confirmation_email_error: errorMessage(err),
      })
      .eq('id', prediction.id);
  }
}
