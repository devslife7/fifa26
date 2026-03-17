import { createServiceClient } from '@/lib/services/supabase/server';
import type { LiveMatch } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToMatch(row: any): LiveMatch {
  return {
    apiMatchId: row.api_match_id,
    localMatchId: row.local_match_id,
    homeCode: row.home_code,
    awayCode: row.away_code,
    homeName: row.home_name,
    awayName: row.away_name,
    homeShortName: row.home_short_name,
    awayShortName: row.away_short_name,
    homeFlag: row.home_flag,
    awayFlag: row.away_flag,
    utcDate: row.utc_date,
    status: row.status,
    venue: row.venue,
    score:
      row.score_home !== null && row.score_away !== null
        ? { home: row.score_home, away: row.score_away }
        : null,
    actualResult: row.actual_result ?? null,
    stage: row.stage,
    group: row.group,
  };
}

function matchToRow(m: LiveMatch) {
  return {
    api_match_id: m.apiMatchId,
    local_match_id: m.localMatchId,
    home_code: m.homeCode,
    away_code: m.awayCode,
    home_name: m.homeName,
    away_name: m.awayName,
    home_short_name: m.homeShortName,
    away_short_name: m.awayShortName,
    home_flag: m.homeFlag,
    away_flag: m.awayFlag,
    utc_date: m.utcDate,
    status: m.status,
    venue: m.venue,
    score_home: m.score?.home ?? null,
    score_away: m.score?.away ?? null,
    actual_result: m.actualResult,
    stage: m.stage,
    group: m.group,
    refreshed_at: new Date().toISOString(),
  };
}

export async function getFixturesFromDb(): Promise<LiveMatch[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('fixtures').select('*').order('utc_date');
  if (error || !data) return [];
  return data.map(rowToMatch);
}

export async function upsertFixturesToDb(matches: LiveMatch[]): Promise<number | null> {
  const supabase = createServiceClient();
  const rows = matches.map(matchToRow);
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase
      .from('fixtures')
      .upsert(rows.slice(i, i + CHUNK), { onConflict: 'api_match_id' });
    if (error) return null;
  }
  return rows.length;
}
