import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const fwc2026 = localFont({
  src: [
    { path: '../fonts/FWC2026-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../fonts/FWC2026-Black.ttf', weight: '900', style: 'normal' },
  ],
  variable: '--font-fwc2026',
  display: 'swap',
});

const notoSans = localFont({
  src: '../fonts/NotoSans.ttf', variable: '--font-noto-sans', display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'FIFA World Cup 2026 Archive',
  description: 'Final results, archived predictions, and an interactive prediction workflow demo.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fwc2026.variable} ${notoSans.variable}`}>
      <head>
        <link rel="stylesheet" href="/fonts/material-symbols.css" />
        <meta name="theme-color" content="#05070d" />
      </head>
      <body className="bg-background-dark font-display text-neutral-200 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
