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
  const element = PredictionEmail({
    name: 'Marcos Velasco',
    predictionNumber: n,
    shareUrl: 'https://fifacup26.vercel.app/shared/sample-token',
    daysUntilKickoff: daysUntilKickoff(),
    pdfFilename: `prediction-${n}.pdf`,
  });

  const html = await render(element);
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
