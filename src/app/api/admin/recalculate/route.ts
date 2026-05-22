import { NextResponse } from 'next/server';
import { recalculateScores } from '@/lib/services/recalculate-scores';
import { forbiddenResponse, isAdminRequest } from '@/lib/services/admin-auth-server';

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return forbiddenResponse();

  const result = await recalculateScores();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ message: 'Scores recalculated', updated: result.updated });
}
