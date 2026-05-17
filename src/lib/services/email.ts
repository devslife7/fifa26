import { Resend } from 'resend';
import { render } from '@react-email/components';
import { OtpEmail } from '@/emails/OtpEmail';
import { PredictionEmail } from '@/emails/PredictionEmail';
import { daysUntilKickoff } from '@/data/tournament';
import type { MatchResult, KnockoutResult } from '@/types';

const FROM = 'FIFA 26 Predictions <no-reply@contact.marcosvelasco.com>';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendOtpEmail(to: string, code: string) {
  const element = OtpEmail({ code });
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);

  await getResend().emails.send({
    from: FROM,
    to,
    subject: '🏆 Your FIFA 26 Verification Code',
    html,
    text,
  });
}

interface SendPredictionEmailParams {
  to: string;
  name: string;
  predictionId: string;
  predictionNumber?: number;
  shareToken: string;
  championName: string;
  championFlag: string;
  shareUrl: string;
  secondName?: string;
  secondFlag?: string;
  thirdName?: string;
  thirdFlag?: string;
  groupMatches: Record<string, MatchResult>;
  knockoutMatches: Record<string, KnockoutResult>;
  thirdPlaceTiebreaker?: string[];
  pdfAttachment?: {
    filename: string;
    content: string;
  };
}

export async function sendPredictionEmail({
  to,
  name,
  predictionNumber,
  championName,
  championFlag,
  shareUrl,
  secondName,
  secondFlag,
  thirdName,
  thirdFlag,
  groupMatches,
  knockoutMatches,
  thirdPlaceTiebreaker,
  pdfAttachment,
}: SendPredictionEmailParams) {
  // React Email escapes text children automatically; we don't pre-escape here
  // (escapeHtml in lib/utils is available for future raw-HTML interpolation paths).
  const element = PredictionEmail({
    name,
    predictionNumber,
    championName,
    championFlag,
    shareUrl,
    secondName,
    secondFlag,
    thirdName,
    thirdFlag,
    groupMatches,
    knockoutMatches,
    thirdPlaceTiebreaker,
    daysUntilKickoff: daysUntilKickoff(),
  });

  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);

  const subject = predictionNumber
    ? `🏆 Prediction #${predictionNumber} locked in — ${championFlag} ${championName}`
    : `🏆 Your FIFA 26 Predictions — ${championFlag} ${championName}`;

  await getResend().emails.send({
    from: FROM,
    to,
    subject,
    html,
    text,
    attachments: pdfAttachment
      ? [
          {
            filename: pdfAttachment.filename,
            content: pdfAttachment.content,
          },
        ]
      : undefined,
  });
}
