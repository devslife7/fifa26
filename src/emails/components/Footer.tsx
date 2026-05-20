import * as React from 'react';
import { emailTheme as t } from '../theme';

export function Footer() {
  return (
    <>
      <tr>
        <td style={{ padding: '0 32px' }}>
          <div
            style={{
              height: '2px',
              backgroundColor: t.gold,
              opacity: 0.6,
              borderRadius: '1px',
            }}
          />
        </td>
      </tr>
      <tr>
        <td style={{ padding: '20px 32px 24px', textAlign: 'center' }}>
          <div
            style={{
              fontSize: '11px',
              color: 'rgba(0,0,0,0.4)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            fifa26.app
          </div>
          <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(0,0,0,0.35)', lineHeight: 1.5 }}>
            You received this email because you submitted predictions on fifacup26.vercel.app.
          </div>
          <div style={{ marginTop: '4px', fontSize: '11px', color: 'rgba(0,0,0,0.35)' }}>
            FIFA 26 Predictions · A fan project, not affiliated with FIFA.
          </div>
        </td>
      </tr>
    </>
  );
}
