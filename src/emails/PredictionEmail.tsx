import * as React from 'react';
import { Body, Container, Head, Html, Img, Link, Preview } from '@react-email/components';
import type { KnockoutResult, MatchResult } from '@/types';
import { computeStats } from '@/lib/utils/prediction-stats';
import { Podium } from './components/Podium';
import { GroupMatches } from './components/GroupMatches';
import { KnockoutBracket } from './components/KnockoutBracket';
import { StatsStrip } from './components/StatsStrip';
import { Countdown } from './components/Countdown';
import { Footer } from './components/Footer';
import { emailTheme as t } from './theme';

export interface PredictionEmailProps {
  name: string;
  predictionNumber?: number;
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
  daysUntilKickoff: number;
}

const LOGO_URL = 'https://fifacup26.vercel.app/images/fifa_logov2_transparent.png';

export function PredictionEmail({
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
  daysUntilKickoff,
}: PredictionEmailProps) {
  const stats = computeStats(groupMatches);
  const hasPodium = !!(secondName && thirdName);
  const previewParts = [
    `${championFlag} ${championName} champion`,
    `${stats.totalPicked}/${stats.totalMatches} picks made`,
    'view & share →',
  ];

  return (
    <Html>
      <Head />
      <Preview>{previewParts.join(' · ')}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: t.bg, fontFamily: t.fontFamily }}>
        <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ backgroundColor: t.bg, padding: '40px 20px' }}>
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
                      {/* Header — logo on black background */}
                      <tr>
                        <td align="center" style={{ padding: '0' }}>
                          <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ backgroundColor: t.stadiumBlack }}>
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

                      <tr>
                        <td style={{ padding: '24px 32px 8px', textAlign: 'center' }}>
                          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: t.ink }}>
                            Your FIFA 26 Predictions
                          </h1>
                          <p style={{ margin: '8px 0 0', fontSize: '14px', color: t.inkMuted }}>Saved by {name}</p>
                          {predictionNumber ? (
                            <p style={{ margin: '8px 0 0', fontSize: '11px', fontFamily: 'monospace', color: 'rgba(0,0,0,0.55)' }}>
                              Prediction #{predictionNumber}
                            </p>
                          ) : null}
                        </td>
                      </tr>

                      {/* Countdown */}
                      <Countdown daysUntil={daysUntilKickoff} />

                      {/* Podium */}
                      {hasPodium ? (
                        <tr>
                          <td style={{ padding: '0 32px' }}>
                            <Podium
                              championName={championName}
                              championFlag={championFlag}
                              secondName={secondName!}
                              secondFlag={secondFlag ?? ''}
                              thirdName={thirdName!}
                              thirdFlag={thirdFlag ?? ''}
                            />
                          </td>
                        </tr>
                      ) : null}

                      {/* Stats */}
                      <StatsStrip stats={stats} />

                      {/* Group Stage */}
                      <GroupMatches predictions={groupMatches} />

                      {/* Knockout Bracket */}
                      <KnockoutBracket
                        groupPredictions={groupMatches}
                        knockoutPredictions={knockoutMatches}
                        thirdPlaceTiebreaker={thirdPlaceTiebreaker}
                      />

                      {/* Share */}
                      <tr>
                        <td style={{ padding: '20px 32px 28px' }}>
                          <p
                            style={{
                              fontSize: '13px',
                              color: t.inkMuted,
                              margin: '0 0 12px',
                              textAlign: 'center',
                            }}
                          >
                            Share your predictions with friends:
                          </p>
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
                            }}
                          >
                            View My Predictions
                          </Link>
                          <p
                            style={{
                              fontSize: '11px',
                              color: t.inkFaint,
                              margin: '12px 0 0',
                              textAlign: 'center',
                              wordBreak: 'break-all',
                            }}
                          >
                            {shareUrl}
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

export default PredictionEmail;
