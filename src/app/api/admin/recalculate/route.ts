import { NextResponse } from 'next/server';
import { recalculateScores } from '@/lib/services/recalculate-scores';

export async function POST(request: Request) {
  const adminSecret = request.headers.get('x-admin-secret');
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await recalculateScores();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ message: 'Scores recalculated', updated: result.updated });
}
