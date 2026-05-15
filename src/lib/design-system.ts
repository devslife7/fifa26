export const worldCupTheme = {
  color: {
    brand: {
      primary: '#f5c542',
      primaryDark: '#b98212',
      primaryLight: '#fff8da',
      accent: '#1ccad8',
      accentWarm: '#f45b9a',
    },
    worldCup: {
      cupGold: '#f5c542',
      cupGoldDark: '#b98212',
      cupGoldLight: '#fff3b0',
      stadiumBlack: '#05070d',
      stadiumInk: '#0b1020',
      stadiumSteel: '#162033',
      pitchGreen: '#00a859',
      mapleRed: '#d71920',
      hostBlue: '#0057b8',
      fiestaCyan: '#1ccad8',
      confettiPink: '#f45b9a',
      cream: '#fff9e8',
    },
    semantic: {
      success: '#00a859',
      danger: '#d71920',
      info: '#0057b8',
      warning: '#f59e0b',
    },
    surface: {
      backgroundDark: '#05070d',
      backgroundLight: '#f8f6ef',
      surface: '#0f1727',
      raised: '#151f32',
      muted: '#202b42',
      light: '#ffffff',
    },
    neutral: {
      50: '#f8fafc',
      100: '#eef2f6',
      200: '#dce4ee',
      300: '#bdc8d8',
      400: '#91a0b7',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
  },
  typography: {
    display: 'var(--font-fwc2026), sans-serif',
    body: 'var(--font-noto-sans), system-ui, -apple-system, sans-serif',
  },
  radius: {
    control: '12px',
    panel: '22px',
    modal: '28px',
  },
} as const;

export type WorldCupTheme = typeof worldCupTheme;
