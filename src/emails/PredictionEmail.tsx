import * as React from 'react';
import { Body, Container, Head, Html, Img, Link, Preview } from '@react-email/components';
import { Countdown } from './components/Countdown';
import { Footer } from './components/Footer';
import { emailTheme as t } from './theme';

export interface PredictionEmailProps {
  name: string;
  predictionNumber?: number;
  shareUrl: string;
  daysUntilKickoff: number;
  pdfFilename?: string;
}

const LOGO_URL = 'https://fifacup26.vercel.app/images/fifa_logov2_transparent.png';

export function PredictionEmail({
  name,
  predictionNumber,
  shareUrl,
  daysUntilKickoff,
  pdfFilename,
}: PredictionEmailProps) {
  const previewText = predictionNumber
    ? `Prediction #${predictionNumber} confirmed · full bracket attached`
    : 'Your FIFA 26 predictions are confirmed · full bracket attached';

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: t.bg, fontFamily: t.fontFamily }}>
        <table
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          role="presentation"
          style={{ backgroundColor: t.bg, padding: '40px 20px' }}
        >
          <tbody>
            <tr>
              <td align="center">
                <Container style={{ maxWidth: '500px', width: '100%' }}>
                  <table
                    width="100%"
                    cellPadding={0}
                    cellSpacing={0}
                    role="presentation"
                    style={{
                      backgroundColor: t.card,
                      borderRadius: '16px',
                      border: '1px solid rgba(0,0,0,0.1)',
                      overflow: 'hidden',
                    }}
                  >
                    <tbody>
                      {/* Header — logo on black */}
                      <tr>
                        <td align="center" style={{ padding: 0 }}>
                          <table
                            width="100%"
                            cellPadding={0}
                            cellSpacing={0}
                            role="presentation"
                            style={{ backgroundColor: t.stadiumBlack }}
                          >
                            <tbody>
                              <tr>
                                <td align="center" style={{ padding: '24px 32px' }}>
                                  <Img
                                    src={LOGO_URL}
                                    alt="FIFA 26"
                                    width="56"
                                    height="56"
                                    style={{ display: 'block', margin: '0 auto' }}
                                  />
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>

                      {/* Title block */}
                      <tr>
                        <td style={{ padding: '32px 32px 4px', textAlign: 'center' }}>
                          <div
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              letterSpacing: '0.2em',
                              textTransform: 'uppercase',
                              color: t.goldText,
                            }}
                          >
                            Confirmation
                          </div>
                          <h1
                            style={{
                              margin: '12px 0 0',
                              fontSize: '24px',
                              lineHeight: 1.2,
                              fontWeight: 800,
                              color: t.ink,
                              letterSpacing: '-0.01em',
                            }}
                          >
                            Your predictions are locked in
                          </h1>
                          {predictionNumber ? (
                            <div
                              style={{
                                marginTop: '14px',
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: '999px',
                                backgroundColor: 'rgba(0,0,0,0.05)',
                                fontFamily: "'SF Mono', Menlo, Consolas, monospace",
                                fontSize: '11px',
                                fontWeight: 600,
                                color: t.inkMuted,
                                letterSpacing: '0.05em',
                              }}
                            >
                              PREDICTION #{String(predictionNumber).padStart(3, '0')}
                            </div>
                          ) : null}
                        </td>
                      </tr>

                      {/* Body copy */}
                      <tr>
                        <td style={{ padding: '20px 32px 4px' }}>
                          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.65, color: t.ink }}>
                            Hi {name},
                          </p>
                          <p
                            style={{
                              margin: '12px 0 0',
                              fontSize: '14px',
                              lineHeight: 1.65,
                              color: 'rgba(0,0,0,0.7)',
                            }}
                          >
                            We&apos;ve saved your FIFA 26 World Cup predictions. The complete
                            bracket — every group-stage pick and your full knockout path — is
                            attached to this email as a PDF for your records.
                          </p>
                        </td>
                      </tr>

                      {/* PDF attachment callout */}
                      <tr>
                        <td style={{ padding: '16px 32px 4px' }}>
                          <table
                            width="100%"
                            cellPadding={0}
                            cellSpacing={0}
                            role="presentation"
                            style={{
                              backgroundColor: 'rgba(0,0,0,0.03)',
                              border: '1px solid rgba(0,0,0,0.08)',
                              borderRadius: '10px',
                            }}
                          >
                            <tbody>
                              <tr>
                                <td
                                  style={{
                                    padding: '14px 16px',
                                    verticalAlign: 'middle',
                                    width: '44px',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '8px',
                                      backgroundColor: t.stadiumBlack,
                                      color: '#ffffff',
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      letterSpacing: '0.05em',
                                      textAlign: 'center',
                                      lineHeight: '36px',
                                    }}
                                  >
                                    PDF
                                  </div>
                                </td>
                                <td style={{ padding: '14px 16px 14px 0', verticalAlign: 'middle' }}>
                                  <div
                                    style={{
                                      fontSize: '13px',
                                      fontWeight: 700,
                                      color: t.ink,
                                      fontFamily: "'SF Mono', Menlo, Consolas, monospace",
                                    }}
                                  >
                                    {pdfFilename ?? 'prediction.pdf'}
                                  </div>
                                  <div
                                    style={{
                                      marginTop: '2px',
                                      fontSize: '12px',
                                      color: 'rgba(0,0,0,0.55)',
                                    }}
                                  >
                                    Attached · Full bracket and group-stage picks
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>

                      {/* Countdown */}
                      <Countdown daysUntil={daysUntilKickoff} />

                      {/* CTA */}
                      <tr>
                        <td style={{ padding: '8px 32px 28px' }}>
                          <Link
                            href={shareUrl}
                            style={{
                              display: 'block',
                              backgroundColor: t.gold,
                              color: '#000000',
                              textDecoration: 'none',
                              fontWeight: 700,
                              fontSize: '15px',
                              padding: '14px 24px',
                              borderRadius: '10px',
                              textAlign: 'center',
                              letterSpacing: '0.01em',
                            }}
                          >
                            View My Predictions
                          </Link>
                        </td>
                      </tr>

                      <Footer />
                    </tbody>
                  </table>
                </Container>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
}

export default PredictionEmail;
