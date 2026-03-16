import { Resend } from 'resend';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

interface SendPredictionEmailParams {
  to: string;
  name: string;
  championName: string;
  championFlag: string;
  shareUrl: string;
  secondName?: string;
  secondFlag?: string;
  thirdName?: string;
  thirdFlag?: string;
}

export async function sendPredictionEmail({
  to,
  name,
  championName,
  championFlag,
  shareUrl,
  secondName,
  secondFlag,
  thirdName,
  thirdFlag,
}: SendPredictionEmailParams) {
  const podiumHtml = secondName && thirdName
    ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
        <tr>
          <td align="center" valign="bottom" width="33%" style="padding: 0 4px;">
            <div style="font-size: 28px;">${secondFlag}</div>
            <div style="font-size: 13px; font-weight: 600; color: #94a3b8; margin-top: 4px;">${secondName}</div>
            <div style="background: linear-gradient(180deg, rgba(192,192,192,0.3), rgba(192,192,192,0.1)); height: 60px; border-radius: 8px 8px 0 0; margin-top: 8px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px; font-weight: 800; color: rgba(192,192,192,0.6);">2</span>
            </div>
          </td>
          <td align="center" valign="bottom" width="33%" style="padding: 0 4px;">
            <div style="font-size: 34px;">${championFlag}</div>
            <div style="font-size: 13px; font-weight: 700; color: #d4a017; margin-top: 4px;">${championName}</div>
            <div style="background: linear-gradient(180deg, rgba(212,160,23,0.3), rgba(212,160,23,0.1)); height: 80px; border-radius: 8px 8px 0 0; margin-top: 8px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 28px; font-weight: 800; color: rgba(212,160,23,0.6);">1</span>
            </div>
          </td>
          <td align="center" valign="bottom" width="33%" style="padding: 0 4px;">
            <div style="font-size: 28px;">${thirdFlag}</div>
            <div style="font-size: 13px; font-weight: 600; color: #94a3b8; margin-top: 4px;">${thirdName}</div>
            <div style="background: linear-gradient(180deg, rgba(205,127,50,0.3), rgba(205,127,50,0.1)); height: 44px; border-radius: 8px 8px 0 0; margin-top: 8px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 20px; font-weight: 800; color: rgba(205,127,50,0.6);">3</span>
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
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #141414; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="padding: 32px 32px 16px; text-align: center;">
                  <div style="font-size: 48px; margin-bottom: 8px;">🏆</div>
                  <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff;">Your FIFA 26 Predictions</h1>
                  <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.5);">Saved by ${name}</p>
                </td>
              </tr>

              <!-- Champion -->
              <tr>
                <td style="padding: 16px 32px;">
                  <div style="background: linear-gradient(135deg, rgba(212,160,23,0.15), rgba(212,160,23,0.05)); border: 1px solid rgba(212,160,23,0.2); border-radius: 12px; padding: 20px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 8px;">${championFlag}</div>
                    <div style="font-size: 20px; font-weight: 800; color: #d4a017;">${championName}</div>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: rgba(255,255,255,0.3); margin-top: 4px;">Predicted Champion</div>
                  </div>
                </td>
              </tr>

              <!-- Podium -->
              ${podiumHtml ? `<tr><td style="padding: 0 32px;">${podiumHtml}</td></tr>` : ''}

              <!-- Share Link -->
              <tr>
                <td style="padding: 24px 32px 32px;">
                  <p style="font-size: 13px; color: rgba(255,255,255,0.5); margin: 0 0 12px; text-align: center;">Share your predictions with friends:</p>
                  <a href="${shareUrl}" style="display: block; background-color: #d4a017; color: #000000; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 24px; border-radius: 10px; text-align: center;">
                    View My Predictions
                  </a>
                  <p style="font-size: 11px; color: rgba(255,255,255,0.3); margin: 12px 0 0; text-align: center; word-break: break-all;">${shareUrl}</p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 16px 32px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
                  <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.25); letter-spacing: 0.15em; text-transform: uppercase; font-weight: 700;">fifa26.app</p>
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
