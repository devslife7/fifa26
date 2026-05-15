import * as React from 'react';
import type { KnockoutMatch, KnockoutResult, KnockoutRound, MatchResult } from '@/types';
import { generateBracket } from '@/lib/logic/bracket';
import { tn, tf } from '@/lib/services/email-helpers';
import { emailTheme as t } from '../theme';

type Variant = 'normal' | 'bronze' | 'gold';

interface KoMatchProps {
  homeCode?: string;
  awayCode?: string;
  result?: KnockoutResult;
  variant: Variant;
}

function variantWinColor(variant: Variant): string {
  if (variant === 'gold') return '#b8860b';
  if (variant === 'bronze') return '#8a4a1a';
  return '#000000';
}

function variantArrowColor(variant: Variant): string {
  if (variant === 'gold') return '#b8860b';
  if (variant === 'bronze') return t.bronze;
  return t.winGreen;
}

function variantBorder(variant: Variant): string {
  if (variant === 'gold') return 'rgba(212,160,23,0.3)';
  if (variant === 'bronze') return 'rgba(205,127,50,0.25)';
  return 'rgba(0,0,0,0.1)';
}

function variantBg(variant: Variant): string {
  if (variant === 'gold') return 'rgba(212,160,23,0.08)';
  if (variant === 'bronze') return 'rgba(205,127,50,0.06)';
  return 'transparent';
}

function variantFontSize(variant: Variant): string {
  if (variant === 'gold') return '15px';
  return '11px';
}

function variantPad(variant: Variant): string {
  if (variant === 'gold') return '7px 12px';
  return '4px 10px';
}

function KoMatch({ homeCode, awayCode, result, variant }: KoMatchProps) {
  const isHome = result === 'home';
  const isAway = result === 'away';
  const winColor = variantWinColor(variant);
  const loseColor = 'rgba(0,0,0,0.3)';
  const arrowColor = variantArrowColor(variant);
  const fs = variantFontSize(variant);
  const pad = variantPad(variant);

  const homeFlag = tf(homeCode);
  const awayFlag = tf(awayCode);
  const homeLabel = homeCode ? tn(homeCode) : 'TBD';
  const awayLabel = awayCode ? tn(awayCode) : 'TBD';

  const arrow = isHome ? '▶' : isAway ? '◀' : '·';

  return (
    <table
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      role="presentation"
      style={{
        borderRadius: '6px',
        overflow: 'hidden',
        border: `1px solid ${variantBorder(variant)}`,
        backgroundColor: variantBg(variant),
        marginBottom: '2px',
      }}
    >
      <tbody>
        <tr>
          <td
            align="right"
            style={{
              padding: pad,
              fontSize: fs,
              fontWeight: isHome ? 700 : 400,
              color: isHome ? winColor : loseColor,
              whiteSpace: 'nowrap',
              width: '45%',
            }}
          >
            {homeLabel}
            {homeFlag ? <>&nbsp;{homeFlag}</> : null}
          </td>
          <td
            align="center"
            style={{
              padding: pad,
              fontSize: variant === 'gold' ? '13px' : '10px',
              fontWeight: 700,
              color: arrowColor,
              width: '10%',
            }}
          >
            {arrow}
          </td>
          <td
            align="left"
            style={{
              padding: pad,
              fontSize: fs,
              fontWeight: isAway ? 700 : 400,
              color: isAway ? winColor : loseColor,
              whiteSpace: 'nowrap',
              width: '45%',
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
        <td style={{ padding: '8px 32px 4px' }}>
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
        <td style={{ padding: '16px 32px 6px' }}>
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

function RoundBody({ matches, variant }: { matches: KnockoutMatch[]; variant: Variant }) {
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
              <td>
                <KoMatch
                  homeCode={matches[0].home}
                  awayCode={matches[0].away}
                  result={matches[0].result}
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
