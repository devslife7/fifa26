import { NextResponse } from 'next/server';
import { render } from '@react-email/components';
import { PredictionEmail } from '@/emails/PredictionEmail';
import { daysUntilKickoff } from '@/data/tournament';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  const url = new URL(req.url);
  const predictionNumber = Number(url.searchParams.get('n') ?? '42');

  const n = Number.isFinite(predictionNumber) ? predictionNumber : 42;
  const displayName = 'Marcos Velasco';
  const headerImageUrl = new URL('/images/email-header.png', req.url).toString();
  const element = PredictionEmail({
    name: displayName,
    predictionNumber: n,
    shareUrl: 'https://fifacup26.vercel.app/shared/a7k2p9m4q3xh8t1n',
    issuedAt: new Date(),
    daysUntilKickoff: daysUntilKickoff(),
    pdfFilename: `FIFA-26-Prediction-${n}.pdf`,
    headerImageUrl,
  });

  const html = await render(element);
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
