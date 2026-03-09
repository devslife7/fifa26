import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <body className="min-h-screen bg-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}
