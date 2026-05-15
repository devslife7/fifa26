import * as React from 'react';
import { emailTheme as t } from '../theme';

interface PodiumProps {
  championName: string;
  championFlag: string;
  secondName: string;
  secondFlag: string;
  thirdName: string;
  thirdFlag: string;
}

interface StepProps {
  name: string;
  flag: string;
  rank: 1 | 2 | 3;
}

const STEP_HEIGHT = { 1: 80, 2: 60, 3: 44 } as const;
const STEP_FLAG_SIZE = { 1: 34, 2: 28, 3: 28 } as const;
const STEP_RANK_FS = { 1: 28, 2: 24, 3: 20 } as const;

function stepBg(rank: 1 | 2 | 3): string {
  if (rank === 1) return 'rgba(212,160,23,0.18)';
  if (rank === 2) return 'rgba(192,192,192,0.25)';
  return 'rgba(205,127,50,0.2)';
}

function stepNameColor(rank: 1 | 2 | 3): string {
  if (rank === 1) return t.goldText;
  return '#64748b';
}

function stepRankColor(rank: 1 | 2 | 3): string {
  if (rank === 1) return 'rgba(184,134,11,0.55)';
  if (rank === 2) return 'rgba(120,120,120,0.55)';
  return 'rgba(160,100,40,0.55)';
}

function Step({ name, flag, rank }: StepProps) {
  return (
    <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
      <tbody>
        <tr>
          <td align="center" style={{ fontSize: `${STEP_FLAG_SIZE[rank]}px`, lineHeight: 1, paddingBottom: '4px' }}>
            {flag}
          </td>
        </tr>
        <tr>
          <td
            align="center"
            style={{
              fontSize: '13px',
              fontWeight: rank === 1 ? 700 : 600,
              color: stepNameColor(rank),
              padding: '4px 0 8px',
            }}
          >
            {name}
          </td>
        </tr>
        <tr>
          <td
            align="center"
            valign="middle"
            height={STEP_HEIGHT[rank]}
            style={{
              height: `${STEP_HEIGHT[rank]}px`,
              backgroundColor: stepBg(rank),
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
              fontSize: `${STEP_RANK_FS[rank]}px`,
              fontWeight: 800,
              color: stepRankColor(rank),
            }}
          >
            {rank}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function Podium({
  championName,
  championFlag,
  secondName,
  secondFlag,
  thirdName,
  thirdFlag,
}: PodiumProps) {
  return (
    <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ margin: '24px 0' }}>
      <tbody>
        <tr>
          <td valign="bottom" width="33%" style={{ padding: '0 4px' }}>
            <Step name={secondName} flag={secondFlag} rank={2} />
          </td>
          <td valign="bottom" width="33%" style={{ padding: '0 4px' }}>
            <Step name={championName} flag={championFlag} rank={1} />
          </td>
          <td valign="bottom" width="33%" style={{ padding: '0 4px' }}>
            <Step name={thirdName} flag={thirdFlag} rank={3} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
