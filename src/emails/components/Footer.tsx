import * as React from 'react';

export function Footer() {
  return (
    <tr>
      <td style={{ padding: '16px 32px 20px', borderTop: '1px solid rgba(0,0,0,0.08)', textAlign: 'center' }}>
        <div
          style={{
            fontSize: '11px',
            color: 'rgba(0,0,0,0.4)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          fifa26.app
        </div>
        <div style={{ marginTop: '8px', fontSize: '11px', color: 'rgba(0,0,0,0.35)', lineHeight: 1.5 }}>
          You received this email because you submitted predictions on fifacup26.vercel.app.
        </div>
        <div style={{ marginTop: '4px', fontSize: '11px', color: 'rgba(0,0,0,0.35)' }}>
          FIFA 26 Predictions · A fan project, not affiliated with FIFA.
        </div>
      </td>
    </tr>
  );
}
