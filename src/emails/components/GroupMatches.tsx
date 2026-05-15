import * as React from 'react';
import { groups } from '@/data/teams';
import { allGroupMatches } from '@/data/matches';
import type { GroupLetter, MatchResult } from '@/types';
import { tn, tf } from '@/lib/services/email-helpers';
import { emailTheme as t } from '../theme';

interface MatchRowProps {
  homeCode: string;
  awayCode: string;
  result?: MatchResult;
}

const COLOR_WINNER = '#000000';
const COLOR_DRAW = 'rgba(0,0,0,0.5)';
const COLOR_LOSS = 'rgba(0,0,0,0.28)';
const COLOR_VS = 'rgba(0,0,0,0.22)';

function MatchRow({ homeCode, awayCode, result }: MatchRowProps) {
  const hw = result === 'home';
  const aw = result === 'away';
  const dr = result === 'draw';

  const hColor = hw ? COLOR_WINNER : dr ? COLOR_DRAW : COLOR_LOSS;
  const aColor = aw ? COLOR_WINNER : dr ? COLOR_DRAW : COLOR_LOSS;
  const homeFlag = tf(homeCode);
  const awayFlag = tf(awayCode);
  const vsText = dr ? '= TIE =' : 'vs';
  const vsColor = dr ? '#b8860b' : COLOR_VS;
  const vsWeight = dr ? 700 : 400;
  const vsBg = dr ? t.tieTint : 'transparent';

  return (
    <tr>
      <td
        align="right"
        style={{
          padding: '1px 3px',
          fontSize: '10px',
          fontWeight: hw ? 700 : 400,
          color: hColor,
          whiteSpace: 'nowrap',
          backgroundColor: hw ? t.winTint : 'transparent',
          borderRadius: hw ? '3px' : '0',
        }}
      >
        {tn(homeCode)}
        {homeFlag ? <>&nbsp;{homeFlag}</> : null}
      </td>
      <td
        align="center"
        style={{
          padding: '1px 2px',
          fontSize: dr ? '8px' : '7px',
          color: vsColor,
          fontWeight: vsWeight,
          width: dr ? '34px' : '18px',
          backgroundColor: vsBg,
          borderRadius: dr ? '3px' : '0',
          letterSpacing: dr ? '0.05em' : '0',
        }}
      >
        {vsText}
      </td>
      <td
        align="left"
        style={{
          padding: '1px 3px',
          fontSize: '10px',
          fontWeight: aw ? 700 : 400,
          color: aColor,
          whiteSpace: 'nowrap',
          backgroundColor: aw ? t.winTint : 'transparent',
          borderRadius: aw ? '3px' : '0',
        }}
      >
        {awayFlag ? <>{awayFlag}&nbsp;</> : null}
        {tn(awayCode)}
      </td>
    </tr>
  );
}

function GroupCard({ group, predictions }: { group: GroupLetter; predictions: Record<string, MatchResult> }) {
  const matches = allGroupMatches.filter((m) => m.group === group);
  return (
    <table
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      role="presentation"
      style={{ backgroundColor: '#f0f0f5', borderRadius: '6px', overflow: 'hidden' }}
    >
      <tbody>
        <tr>
          <td style={{ padding: '4px 6px 2px' }}>
            <div
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: 'rgba(0,0,0,0.4)',
                letterSpacing: '0.1em',
                marginBottom: '2px',
              }}
            >
              GROUP&nbsp;{group}
            </div>
            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
              <tbody>
                {matches.map((m) => (
                  <MatchRow key={m.id} homeCode={m.home} awayCode={m.away} result={predictions[m.id]} />
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function GroupMatches({ predictions }: { predictions: Record<string, MatchResult> }) {
  const rows: React.ReactNode[] = [];
  for (let i = 0; i < groups.length; i += 3) {
    const g1 = groups[i];
    const g2 = groups[i + 1];
    const g3 = groups[i + 2];
    rows.push(
      <tr key={`${g1}-${g2}-${g3}`}>
        <td style={{ padding: '3px 16px' }}>
          <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
            <tbody>
              <tr>
                <td width="32%" valign="top">
                  {g1 ? <GroupCard group={g1} predictions={predictions} /> : null}
                </td>
                <td width="2%"></td>
                <td width="32%" valign="top">
                  {g2 ? <GroupCard group={g2} predictions={predictions} /> : null}
                </td>
                <td width="2%"></td>
                <td width="32%" valign="top">
                  {g3 ? <GroupCard group={g3} predictions={predictions} /> : null}
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>,
    );
  }

  return (
    <>
      <tr>
        <td style={{ padding: '12px 32px 6px' }}>
          <div
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: 'rgba(0,0,0,0.35)',
              fontWeight: 700,
            }}
          >
            Group Stage — 72 Matches
          </div>
        </td>
      </tr>
      {rows}
    </>
  );
}
