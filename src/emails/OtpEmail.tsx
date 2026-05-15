import * as React from 'react';
import { Body, Container, Head, Html, Preview } from '@react-email/components';
import { Footer } from './components/Footer';
import { emailTheme as t } from './theme';

export interface OtpEmailProps {
  code: string;
}

export function OtpEmail({ code }: OtpEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your FIFA 26 verification code: {code}</Preview>
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
                      <tr>
                        <td style={{ padding: '32px 32px 16px', textAlign: 'center' }}>
                          <div style={{ fontSize: '48px', marginBottom: '8px', lineHeight: 1 }}>🏆</div>
                          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: t.ink }}>
                            Your Verification Code
                          </h1>
                          <p style={{ margin: '8px 0 0', fontSize: '14px', color: t.inkMuted }}>
                            Enter this code to sign in to FIFA 26 Predictions
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '16px 32px 24px', textAlign: 'center' }}>
                          <table
                            width="100%"
                            cellPadding={0}
                            cellSpacing={0}
                            role="presentation"
                            style={{
                              background: 'linear-gradient(135deg, rgba(212,160,23,0.15), rgba(212,160,23,0.05))',
                              border: '1px solid rgba(212,160,23,0.2)',
                              borderRadius: '12px',
                            }}
                          >
                            <tbody>
                              <tr>
                                <td align="center" style={{ padding: '24px' }}>
                                  <div
                                    style={{
                                      fontSize: '36px',
                                      fontWeight: 800,
                                      letterSpacing: '0.3em',
                                      color: t.goldText,
                                      fontFamily: 'monospace',
                                    }}
                                  >
                                    {code}
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <p style={{ margin: '16px 0 0', fontSize: '13px', color: t.inkFaint }}>
                            This code expires in 10 minutes
                          </p>
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

export default OtpEmail;
