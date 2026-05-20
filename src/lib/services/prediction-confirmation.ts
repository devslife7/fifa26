import type { SupabaseClient } from '@supabase/supabase-js';
import { sendPredictionEmail } from '@/lib/services/email';
import { generatePredictionPdf } from '@/lib/services/prediction-pdf';
import { uploadPredictionPdf } from '@/lib/services/prediction-pdf-storage';
import type { GroupTiebreakers, KnockoutResult, MatchResult } from '@/types';

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
  groupTiebreakers?: GroupTiebreakers | null;
  thirdPlaceTiebreaker?: string[] | null;
}

function errorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : 'Unknown error';
  return message.slice(0, 1000);
}

function buildPdfFilename(predictionNumber: number | null | undefined, fallbackId: string): string {
  if (predictionNumber != null) {
    return `FIFA-26-Prediction-${predictionNumber}.pdf`;
  }
  return `FIFA-26-Prediction-${fallbackId}.pdf`;
}

export async function sendPredictionConfirmation({
  supabase,
  prediction,
  to,
  displayName,
  origin,
  groupMatches,
  knockoutMatches,
  groupTiebreakers,
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
      groupTiebreakers,
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
    const fullName = displayName || prediction.name || 'Predictor';
    await sendPredictionEmail({
      to,
      name: fullName,
      predictionNumber: prediction.prediction_number ?? undefined,
      shareUrl,
      shareToken: prediction.share_token,
      issuedAt: prediction.completed_at,
      pdfAttachment: pdfBuffer
        ? {
            filename: buildPdfFilename(prediction.prediction_number, prediction.id),
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
