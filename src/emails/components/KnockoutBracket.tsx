import * as React from 'react';
import type { KnockoutMatch, KnockoutResult, KnockoutRound, MatchResult } from '@/types';
import { generateBracket } from '@/lib/logic/bracket';
import { tn, tf } from '@/lib/services/email-helpers';

type Variant = 'normal' | 'bronze' | 'gold';

interface KoMatchProps {
  homeCode?: string;
  awayCode?: string;
  result?: KnockoutResult;
  variant: Variant;
}

function KoMatch({ homeCode, awayCode, result, variant }: KoMatchProps) {
  const isHome = result === 'home';
  const isAway = result === 'away';

  const winBg =
    variant === 'gold'
      ? 'rgba(212,160,23,0.15)'
      : variant === 'bronze'
        ? 'rgba(205,127,50,0.1)'
        : 'rgba(34,197,94,0.08)';
  const winColor = variant === 'gold' ? '#b8860b' : '#1a1a1a';
  const loseColor = 'rgba(0,0,0,0.3)';
  const border =
    variant === 'gold'
      ? 'rgba(212,160,23,0.3)'
      : variant === 'bronze'
        ? 'rgba(205,127,50,0.2)'
        : 'rgba(0,0,0,0.1)';
  const fs = variant === 'gold' ? '13px' : '11px';
  const pad = variant === 'gold' ? '5px 10px' : '3px 8px';

  const homeFlag = tf(homeCode);
  const awayFlag = tf(awayCode);
  const homeLabel = homeCode ? tn(homeCode) : 'TBD';
  const awayLabel = awayCode ? tn(awayCode) : 'TBD';

  return (
    <table
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      role="presentation"
      style={{ borderRadius: '6px', overflow: 'hidden', border: `1px solid ${border}`, marginBottom: '4px' }}
    >
      <tbody>
        <tr>
          <td
            style={{
              padding: pad,
              fontSize: fs,
              backgroundColor: isHome ? winBg : 'transparent',
              fontWeight: isHome ? 700 : 400,
              color: isHome ? winColor : loseColor,
              borderBottom: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            {homeFlag ? <>{homeFlag}&nbsp;</> : null}
            {homeLabel}
          </td>
        </tr>
        <tr>
          <td
            style={{
              padding: pad,
              fontSize: fs,
              backgroundColor: isAway ? winBg : 'transparent',
              fontWeight: isAway ? 700 : 400,
              color: isAway ? winColor : loseColor,
            }}
          >
            {awayFlag ? <>{awayFlag}&nbsp;</> : null}
            {awayLabel}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

const ROUND_LABELS: Record<KnockoutRound, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  '3RD': 'Third Place',
  FIN: 'Final',
};

interface KnockoutBracketProps {
  groupPredictions: Record<string, MatchResult>;
  knockoutPredictions: Record<string, KnockoutResult>;
  thirdPlaceTiebreaker?: string[];
}

export function KnockoutBracket({ groupPredictions, knockoutPredictions, thirdPlaceTiebreaker }: KnockoutBracketProps) {
  const bracket = generateBracket(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker);
  const roundOrder: KnockoutRound[] = ['R32', 'R16', 'QF', 'SF', '3RD', 'FIN'];

  const sections: React.ReactNode[] = [];
  for (const round of roundOrder) {
    const matches = bracket.filter((m) => m.round === round);
    if (matches.length === 0) continue;

    const variant: Variant = round === 'FIN' ? 'gold' : round === '3RD' ? 'bronze' : 'normal';
    const labelColor = round === 'FIN' ? '#b8860b' : 'rgba(0,0,0,0.4)';

    sections.push(
      <tr key={`${round}-h`}>
        <td style={{ padding: '12px 32px 4px' }}>
          <div
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: labelColor,
              fontWeight: 700,
            }}
          >
            {ROUND_LABELS[round]} — {matches.length} {matches.length === 1 ? 'match' : 'matches'}
          </div>
        </td>
      </tr>,
    );

    sections.push(<RoundBody key={round} matches={matches} variant={variant} />);
  }

  return (
    <>
      <tr>
        <td style={{ padding: '24px 32px 8px' }}>
          <div
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: 'rgba(0,0,0,0.35)',
              fontWeight: 700,
            }}
          >
            Knockout Bracket — 31 Matches
          </div>
        </td>
      </tr>
      {sections}
    </>
  );
}

function RoundBody({
  matches,
  variant,
}: {
  matches: KnockoutMatch[];
  variant: Variant;
}) {
  if (matches.length > 2) {
    const half = Math.ceil(matches.length / 2);
    const left = matches.slice(0, half);
    const right = matches.slice(half);
    return (
      <tr>
        <td style={{ padding: '0 32px' }}>
          <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
            <tbody>
              <tr>
                <td width="49%" valign="top">
                  {left.map((m) => (
                    <KoMatch key={m.id} homeCode={m.home} awayCode={m.away} result={m.result} variant={variant} />
                  ))}
                </td>
                <td width="2%"></td>
                <td width="49%" valign="top">
                  {right.map((m) => (
                    <KoMatch key={m.id} homeCode={m.home} awayCode={m.away} result={m.result} variant={variant} />
                  ))}
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    );
  }

  if (matches.length === 2) {
    return (
      <tr>
        <td style={{ padding: '0 32px' }}>
          <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
            <tbody>
              <tr>
                <td width="49%" valign="top">
                  <KoMatch
                    homeCode={matches[0].home}
                    awayCode={matches[0].away}
                    result={matches[0].result}
                    variant={variant}
                  />
                </td>
                <td width="2%"></td>
                <td width="49%" valign="top">
                  <KoMatch
                    homeCode={matches[1].home}
                    awayCode={matches[1].away}
                    result={matches[1].result}
                    variant={variant}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td style={{ padding: '0 32px' }}>
        <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
          <tbody>
            <tr>
              <td width="49%">
                <KoMatch
                  homeCode={matches[0].home}
                  awayCode={matches[0].away}
                  result={matches[0].result}
                  variant={variant}
                />
              </td>
              <td width="51%"></td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}
