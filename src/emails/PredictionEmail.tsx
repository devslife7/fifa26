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
  issuedAt?: Date | string;
}

function formatIssuedDate(value?: Date | string): string {
  const d = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}

const LOGO_URL = 'https://fifacup26.vercel.app/images/email-logo-mark.png';

export function PredictionEmail({
  name,
  predictionNumber,
  shareUrl,
  daysUntilKickoff,
  pdfFilename,
  issuedAt,
}: PredictionEmailProps) {
  const previewText = predictionNumber
    ? `Prediction #${predictionNumber} confirmed · full bracket attached`
    : 'Your FIFA 26 predictions are confirmed · full bracket attached';
  const issuedDate = formatIssuedDate(issuedAt);

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
                                <td align="center" style={{ padding: '48px 32px 44px' }}>
                                  <Img
                                    src={LOGO_URL}
                                    alt="FIFA 26"
                                    width="128"
                                    height="128"
                                    style={{ display: 'block', margin: '0 auto', borderRadius: '24px' }}
                                  />
                                  <div
                                    style={{
                                      marginTop: '14px',
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      letterSpacing: '0.3em',
                                      textTransform: 'uppercase',
                                      color: 'rgba(255,255,255,0.5)',
                                    }}
                                  >
                                    FIFA 26 Predictions
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>

                      {/* Title block */}
                      <tr>
                        <td style={{ padding: '36px 32px 4px', textAlign: 'center' }}>
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
                              fontSize: '26px',
                              lineHeight: 1.2,
                              fontWeight: 800,
                              color: t.ink,
                              letterSpacing: '-0.015em',
                            }}
                          >
                            Your predictions are locked in
                          </h1>
                          {/* Gold accent */}
                          <div
                            style={{
                              width: '44px',
                              height: '3px',
                              backgroundColor: t.gold,
                              margin: '16px auto 0',
                              borderRadius: '2px',
                            }}
                          />
                          <div
                            style={{
                              marginTop: '14px',
                              fontSize: '12px',
                              color: t.inkMuted,
                            }}
                          >
                            Saved by <span style={{ color: t.ink, fontWeight: 600 }}>{name}</span>
                            <span style={{ margin: '0 6px', color: t.inkFaint }}>·</span>
                            {issuedDate}
                          </div>
                        </td>
                      </tr>

                      {/* Prediction number badge */}
                      {predictionNumber ? (
                        <tr>
                          <td style={{ padding: '24px 32px 8px', textAlign: 'center' }}>
                            <div
                              style={{
                                display: 'inline-block',
                                padding: '8px 16px',
                                borderRadius: '999px',
                                backgroundColor: 'rgba(0,0,0,0.04)',
                                border: '1px solid rgba(0,0,0,0.08)',
                                fontFamily: "'SF Mono', Menlo, Consolas, monospace",
                                fontSize: '12px',
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                color: t.ink,
                              }}
                            >
                              <span style={{ color: t.inkMuted, marginRight: '8px' }}>
                                PREDICTION
                              </span>
                              #{String(predictionNumber).padStart(3, '0')}
                            </div>
                          </td>
                        </tr>
                      ) : null}

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
