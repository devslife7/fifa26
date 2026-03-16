import { Resend } from 'resend';
import { buildGroupMatchesHtml, buildKnockoutHtml } from '@/lib/email-helpers';
import type { MatchResult, KnockoutResult } from '@/types';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendOtpEmail(to: string, code: string) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; border: 1px solid rgba(0,0,0,0.1); overflow: hidden;">
              <tr>
                <td style="padding: 32px 32px 16px; text-align: center;">
                  <div style="font-size: 48px; margin-bottom: 8px;">🏆</div>
                  <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #1a1a1a;">Your Verification Code</h1>
                  <p style="margin: 8px 0 0; font-size: 14px; color: rgba(0,0,0,0.5);">Enter this code to sign in to FIFA 26 Predictions</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 16px 32px 24px; text-align: center;">
                  <div style="background: linear-gradient(135deg, rgba(212,160,23,0.15), rgba(212,160,23,0.05)); border: 1px solid rgba(212,160,23,0.2); border-radius: 12px; padding: 24px;">
                    <div style="font-size: 36px; font-weight: 800; letter-spacing: 0.3em; color: #b8860b; font-family: monospace;">${code}</div>
                  </div>
                  <p style="margin: 16px 0 0; font-size: 13px; color: rgba(0,0,0,0.4);">This code expires in 10 minutes</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 16px 32px; border-top: 1px solid rgba(0,0,0,0.08); text-align: center;">
                  <p style="margin: 0; font-size: 11px; color: rgba(0,0,0,0.3); letter-spacing: 0.15em; text-transform: uppercase; font-weight: 700;">fifa26.app</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await getResend().emails.send({
    from: 'FIFA 26 Predictions <no-reply@contact.marcosvelasco.com>',
    to,
    subject: '🏆 Your FIFA 26 Verification Code',
    html,
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
}

export async function sendPredictionEmail({
  to,
  name,
  predictionId,
  predictionNumber,
  shareToken,
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
}: SendPredictionEmailParams) {
  const podiumHtml = secondName && thirdName
    ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
        <tr>
          <td align="center" valign="bottom" width="33%" style="padding: 0 4px;">
            <div style="font-size: 28px;">${secondFlag}</div>
            <div style="font-size: 13px; font-weight: 600; color: #64748b; margin-top: 4px;">${secondName}</div>
            <div style="background: linear-gradient(180deg, rgba(192,192,192,0.3), rgba(192,192,192,0.15)); height: 60px; border-radius: 8px 8px 0 0; margin-top: 8px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px; font-weight: 800; color: rgba(120,120,120,0.5);">2</span>
            </div>
          </td>
          <td align="center" valign="bottom" width="33%" style="padding: 0 4px;">
            <div style="font-size: 34px;">${championFlag}</div>
            <div style="font-size: 13px; font-weight: 700; color: #b8860b; margin-top: 4px;">${championName}</div>
            <div style="background: linear-gradient(180deg, rgba(212,160,23,0.25), rgba(212,160,23,0.1)); height: 80px; border-radius: 8px 8px 0 0; margin-top: 8px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 28px; font-weight: 800; color: rgba(184,134,11,0.5);">1</span>
            </div>
          </td>
          <td align="center" valign="bottom" width="33%" style="padding: 0 4px;">
            <div style="font-size: 28px;">${thirdFlag}</div>
            <div style="font-size: 13px; font-weight: 600; color: #64748b; margin-top: 4px;">${thirdName}</div>
            <div style="background: linear-gradient(180deg, rgba(205,127,50,0.25), rgba(205,127,50,0.1)); height: 44px; border-radius: 8px 8px 0 0; margin-top: 8px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 20px; font-weight: 800; color: rgba(160,100,40,0.5);">3</span>
            </div>
          </td>
        </tr>
      </table>
    `
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; border: 1px solid rgba(0,0,0,0.1); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="padding: 32px 32px 16px; text-align: center;">
                  <img src="data:image/png;base64,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" alt="FIFA 26" width="48" height="48" style="margin-bottom: 8px;" />
                  <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #1a1a1a;">Your FIFA 26 Predictions</h1>
                  <p style="margin: 8px 0 0; font-size: 14px; color: rgba(0,0,0,0.5);">Saved by ${name}</p>
                </td>
              </tr>

              <!-- Prediction IDs -->
              <tr>
                <td style="padding: 0 32px 8px; text-align: center;">
                  <p style="margin: 0; font-size: 11px; font-family: monospace; color: rgba(0,0,0,0.6);">${predictionNumber ? `Prediction #${predictionNumber} · ` : ''}ID: ${predictionId}</p>
                  <p style="margin: 4px 0 0; font-size: 11px; font-family: monospace; color: rgba(0,0,0,0.6);">Share Token: ${shareToken}</p>
                </td>
              </tr>


              <!-- Podium -->
              ${podiumHtml ? `<tr><td style="padding: 0 32px;">${podiumHtml}</td></tr>` : ''}

              <!-- Group Stage Predictions -->
              ${buildGroupMatchesHtml(groupMatches)}

              <!-- Knockout Bracket Predictions -->
              ${buildKnockoutHtml(groupMatches, knockoutMatches, thirdPlaceTiebreaker)}

              <!-- Share Link -->
              <tr>
                <td style="padding: 16px 32px 32px;">
                  <p style="font-size: 13px; color: rgba(0,0,0,0.5); margin: 0 0 12px; text-align: center;">Share your predictions with friends:</p>
                  <a href="${shareUrl}" style="display: block; background-color: #d4a017; color: #000000; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 24px; border-radius: 10px; text-align: center;">
                    View My Predictions
                  </a>
                  <p style="font-size: 11px; color: rgba(0,0,0,0.3); margin: 12px 0 0; text-align: center; word-break: break-all;">${shareUrl}</p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 16px 32px; border-top: 1px solid rgba(0,0,0,0.08); text-align: center;">
                  <p style="margin: 0; font-size: 11px; color: rgba(0,0,0,0.3); letter-spacing: 0.15em; text-transform: uppercase; font-weight: 700;">fifa26.app</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await getResend().emails.send({
    from: 'FIFA 26 Predictions <no-reply@contact.marcosvelasco.com>',
    to,
    subject: `🏆 Your FIFA 26 Predictions — ${championFlag} ${championName}`,
    html,
  });
}
