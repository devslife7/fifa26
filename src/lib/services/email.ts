import { Resend } from 'resend';
import { render } from '@react-email/components';
import { OtpEmail } from '@/emails/OtpEmail';
import { PredictionEmail } from '@/emails/PredictionEmail';
import { daysUntilKickoff } from '@/data/tournament';

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
  predictionNumber?: number;
  shareUrl: string;
  pdfAttachment?: {
    filename: string;
    content: string;
  };
}

export async function sendPredictionEmail({
  to,
  name,
  predictionNumber,
  shareUrl,
  pdfAttachment,
}: SendPredictionEmailParams) {
  const element = PredictionEmail({
    name,
    predictionNumber,
    shareUrl,
    daysUntilKickoff: daysUntilKickoff(),
    pdfFilename: pdfAttachment?.filename,
  });

  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);

  const subject = predictionNumber
    ? `Prediction #${predictionNumber} confirmed · FIFA 26 World Cup`
    : 'Your FIFA 26 predictions are confirmed';

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
