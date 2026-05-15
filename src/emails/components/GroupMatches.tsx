import * as React from 'react';
import { groups } from '@/data/teams';
import { allGroupMatches } from '@/data/matches';
import type { GroupLetter, MatchResult } from '@/types';
import { tn, tf } from '@/lib/services/email-helpers';

interface MatchRowProps {
  homeCode: string;
  awayCode: string;
  result?: MatchResult;
}

const COLOR_WIN = '#1a1a1a';
const COLOR_DRAW = 'rgba(0,0,0,0.5)';
const COLOR_LOSS = 'rgba(0,0,0,0.3)';
const COLOR_VS = 'rgba(0,0,0,0.2)';

function MatchRow({ homeCode, awayCode, result }: MatchRowProps) {
  const hw = result === 'home';
  const aw = result === 'away';
  const dr = result === 'draw';

  const hColor = hw ? COLOR_WIN : dr ? COLOR_DRAW : COLOR_LOSS;
  const aColor = aw ? COLOR_WIN : dr ? COLOR_DRAW : COLOR_LOSS;
  const homeFlag = tf(homeCode);
  const awayFlag = tf(awayCode);
  const vsText = dr ? 'TIE' : 'vs';
  const vsColor = dr ? COLOR_DRAW : COLOR_VS;

  return (
    <tr>
      <td
        align="right"
        style={{
          padding: '2px 0',
          fontSize: '11px',
          fontWeight: hw ? 700 : 400,
          color: hColor,
          whiteSpace: 'nowrap',
        }}
      >
        {tn(homeCode)}
        {homeFlag ? <>&nbsp;{homeFlag}</> : null}
      </td>
      <td
        align="center"
        style={{
          padding: '2px 4px',
          fontSize: '8px',
          color: vsColor,
          fontWeight: dr ? 700 : 400,
          width: '24px',
        }}
      >
        {vsText}
      </td>
      <td
        align="left"
        style={{
          padding: '2px 0',
          fontSize: '11px',
          fontWeight: aw ? 700 : 400,
          color: aColor,
          whiteSpace: 'nowrap',
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
          <td
            style={{
              padding: '4px 8px',
              fontSize: '9px',
              fontWeight: 700,
              color: 'rgba(0,0,0,0.4)',
              letterSpacing: '0.1em',
              borderBottom: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            GROUP&nbsp;{group}
          </td>
        </tr>
        <tr>
          <td style={{ padding: '3px 6px' }}>
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
  for (let i = 0; i < groups.length; i += 2) {
    const g1 = groups[i];
    const g2 = groups[i + 1];
    rows.push(
      <tr key={`${g1}-${g2}`}>
        <td style={{ padding: '3px 32px' }}>
          <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
            <tbody>
              <tr>
                <td width="49%" valign="top">
                  <GroupCard group={g1} predictions={predictions} />
                </td>
                <td width="2%"></td>
                <td width="49%" valign="top">
                  <GroupCard group={g2} predictions={predictions} />
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
        <td style={{ padding: '20px 32px 8px' }}>
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
