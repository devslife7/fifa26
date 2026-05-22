import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/services/supabase/server';
import { recalculateScores } from '@/lib/services/recalculate-scores';

type AdminResultPayload = {
  matchId: string;
  matchType: 'group' | 'knockout';
  result: 'home' | 'draw' | 'away';
  winningTeam?: string | null;
};

function normalizeResults(body: unknown): AdminResultPayload[] {
  if (!body || typeof body !== 'object') return [];
  const record = body as Record<string, unknown>;
  if (Array.isArray(record.results)) {
    return record.results as AdminResultPayload[];
  }
  return [record as AdminResultPayload];
}

function validateResult(row: AdminResultPayload): string | null {
  if (!row.matchId || !row.matchType || !row.result) return 'Missing required fields';
  if (row.matchType !== 'group' && row.matchType !== 'knockout') return 'Invalid match type';
  if (row.result !== 'home' && row.result !== 'draw' && row.result !== 'away') return 'Invalid result';
  if (row.matchType === 'knockout' && row.result === 'draw') return 'Knockout matches cannot be draws';
  return null;
}

export async function POST(request: Request) {
  const adminSecret = request.headers.get('x-admin-secret');
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const results = normalizeResults(body);
  const deleteMatchIds = Array.isArray(body?.deleteMatchIds)
    ? body.deleteMatchIds.filter((id: unknown): id is string => typeof id === 'string' && !!id)
    : [];

  for (const row of results) {
    const error = validateResult(row);
    if (error) return NextResponse.json({ error }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (deleteMatchIds.length > 0) {
    const { error } = await supabase
      .from('actual_results')
      .delete()
      .in('match_id', deleteMatchIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let data = null;
  if (results.length > 0) {
    const { data: upserted, error } = await supabase
      .from('actual_results')
      .upsert(
        results.map((row) => ({
          match_id: row.matchId,
          match_type: row.matchType,
          result: row.result,
          winning_team: row.winningTeam ?? null,
        })),
        { onConflict: 'match_id' },
      )
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    data = upserted;
  }

  const recalc = await recalculateScores();
  if (!recalc.ok) {
    return NextResponse.json({ error: recalc.error }, { status: 500 });
  }

  return NextResponse.json({
    results: data ?? [],
    deleted: deleteMatchIds.length,
    scoresUpdated: recalc.updated,
  });
}

export async function DELETE(request: Request) {
  const adminSecret = request.headers.get('x-admin-secret');
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const matchIds = Array.isArray(body?.matchIds)
    ? body.matchIds.filter((id: unknown): id is string => typeof id === 'string' && !!id)
    : [];

  if (matchIds.length === 0) {
    return NextResponse.json({ error: 'Missing matchIds' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('actual_results')
    .delete()
    .in('match_id', matchIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const recalc = await recalculateScores();
  if (!recalc.ok) {
    return NextResponse.json({ error: recalc.error }, { status: 500 });
  }

  return NextResponse.json({ deleted: matchIds.length, scoresUpdated: recalc.updated });
}
