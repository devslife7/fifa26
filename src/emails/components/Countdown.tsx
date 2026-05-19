import * as React from 'react';
import { TOURNAMENT_KICKOFF_DISPLAY } from '@/data/tournament';

interface CountdownProps {
  daysUntil: number;
}

export function Countdown({ daysUntil }: CountdownProps) {
  if (daysUntil <= 0) return null;

  const subtitle = daysUntil === 1 ? '1 day away' : `${daysUntil} days away`;

  return (
    <tr>
      <td style={{ padding: '4px 32px 12px' }}>
        <table
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          role="presentation"
          style={{
            backgroundColor: 'rgba(212,160,23,0.08)',
            border: '1px solid rgba(212,160,23,0.25)',
            borderRadius: '10px',
          }}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#b8860b', letterSpacing: '0.08em' }}>
                  ⏱ KICKS OFF {TOURNAMENT_KICKOFF_DISPLAY.toUpperCase()}
                </div>
                <div style={{ marginTop: '4px', fontSize: '11px', color: 'rgba(0,0,0,0.5)' }}>{subtitle}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}
