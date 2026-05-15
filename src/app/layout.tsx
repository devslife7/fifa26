import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Noto_Sans } from 'next/font/google';
import { AuthProvider } from '@/components/providers/AuthProvider';
import './globals.css';

const fwc2026 = localFont({
  src: [
    { path: '../fonts/FWC2026-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../fonts/FWC2026-Black.ttf', weight: '900', style: 'normal' },
  ],
  variable: '--font-fwc2026',
  display: 'swap',
});

const notoSans = Noto_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'FIFA World Cup 2026 Predictor',
  description: 'Predict every match of the FIFA World Cup 2026',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fwc2026.variable} ${notoSans.variable}`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#05070d" />
      </head>
      <body className="bg-background-dark font-display text-neutral-200 min-h-screen antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
