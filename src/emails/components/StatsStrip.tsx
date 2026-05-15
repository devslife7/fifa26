import * as React from 'react';
import type { PredictionStats } from '@/lib/utils/prediction-stats';

interface StatProps {
  label: string;
  value: number;
  color: string;
}

function Stat({ label, value, color }: StatProps) {
  return (
    <td align="center" width="33%" style={{ padding: '12px 4px' }}>
      <div style={{ fontSize: '22px', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div
        style={{
          marginTop: '4px',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'rgba(0,0,0,0.4)',
        }}
      >
        {label}
      </div>
    </td>
  );
}

export function StatsStrip({ stats }: { stats: PredictionStats }) {
  return (
    <tr>
      <td style={{ padding: '4px 32px 8px' }}>
        <table
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          role="presentation"
          style={{
            backgroundColor: '#f7f7fb',
            borderRadius: '10px',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <tbody>
            <tr>
              <Stat label="Home wins" value={stats.homeWins} color="#1a1a1a" />
              <Stat label="Draws" value={stats.draws} color="#64748b" />
              <Stat label="Away wins" value={stats.awayWins} color="#1a1a1a" />
            </tr>
            <tr>
              <td
                colSpan={3}
                align="center"
                style={{
                  padding: '0 8px 10px',
                  fontSize: '11px',
                  color: 'rgba(0,0,0,0.45)',
                }}
              >
                {stats.totalPicked} of {stats.totalMatches} group-stage picks made
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}
