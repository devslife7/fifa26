import { ImageResponse } from 'next/og';
import { createServiceClient } from '@/lib/services/supabase/server';
import { teamsByCode } from '@/data/teams';
import { getGroupMatches } from '@/data/matches';
import { generateBracket, getTopThree } from '@/lib/logic/bracket';
import type { MatchResult, KnockoutResult, KnockoutRound, GroupLetter, GroupTiebreakers } from '@/types';

const GROUPS: GroupLetter[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const ROUNDS: KnockoutRound[] = ['R32', 'R16', 'QF', 'SF', 'FIN'];

const SHORT: Record<string, string> = {
  'United States': 'USA',
  'South Africa': 'S. Africa',
  'South Korea': 'S. Korea',
  'New Zealand': 'N. Zealand',
  'Saudi Arabia': 'S. Arabia',
  'SCE/DEN/IRL/MKD': 'TBD',
  'BIH/ITA/NIR/WAL': 'TBD',
  'KOS/ROU/SVK/TUR': 'TBD',
  'ALB/POL/SWE/UKR': 'TBD',
};

function tn(code?: string): string {
  if (!code || code.startsWith('TBD')) return 'TBD';
  const t = teamsByCode[code];
  if (!t) return code;
  return SHORT[t.name] || t.name;
}

function tf(code?: string): string {
  if (!code || code.startsWith('TBD')) return '';
  return teamsByCode[code]?.flag ?? '';
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const { shareToken } = await params;
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('predictions')
    .select('*')
    .eq('share_token', shareToken)
    .eq('is_complete', true)
    .single();

  if (!data) {
    return new Response('Not found', { status: 404 });
  }

  const gp = data.group_matches as Record<string, MatchResult>;
  const kp = data.knockout_matches as Record<string, KnockoutResult>;
  const gt = (data.group_tiebreakers as GroupTiebreakers | null) ?? {};
  const tp = (data.third_place_tiebreaker as string[] | null) ?? undefined;
  const displayName = data.submitter_name || 'Someone';

  const topThree = getTopThree(gp, kp, tp, gt);
  const champ = topThree.first ? teamsByCode[topThree.first] : null;
  const bracket = generateBracket(gp, kp, tp, gt);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#f8fafc',
          padding: 36,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 48, display: 'flex' }}>🏆</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1e293b', display: 'flex' }}>
              FIFA 26 Predictions
            </div>
            <div style={{ display: 'flex', fontSize: 14, color: '#64748b', marginTop: 2 }}>
              by {displayName} — Champion:
              <div style={{ display: 'flex', color: '#d4a017', fontWeight: 700, marginLeft: 6 }}>
                {champ?.flag} {champ?.name}
              </div>
            </div>
          </div>
        </div>

        {/* GROUP STAGE label */}
        <div style={{ display: 'flex', fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: 2, marginBottom: 8 }}>
          GROUP STAGE
        </div>

        {/* Groups - 2 rows of 6 */}
        {[GROUPS.slice(0, 6), GROUPS.slice(6)].map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: 6, marginBottom: ri === 0 ? 6 : 20 }}>
            {row.map(group => {
              const matches = getGroupMatches(group);
              return (
                <div key={group} style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#fff', borderRadius: 6, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', padding: '2px 6px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontSize: 9, fontWeight: 700, color: '#64748b', letterSpacing: 1 }}>
                    GROUP {group}
                  </div>
                  {matches.map((m, i) => {
                    const r = gp[m.id];
                    const hw = r === 'home';
                    const aw = r === 'away';
                    const dr = r === 'draw';
                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', padding: '1px 4px', fontSize: 9, borderBottom: i < matches.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <div style={{ display: 'flex', flex: 1, justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                          <div style={{ display: 'flex', fontWeight: hw ? 700 : 400, color: hw ? '#1e293b' : dr ? '#475569' : '#cbd5e1' }}>
                            {tn(m.home)}
                          </div>
                          <div style={{ fontSize: 11, display: 'flex' }}>{tf(m.home)}</div>
                        </div>
                        <div style={{ display: 'flex', width: 20, justifyContent: 'center', fontSize: 7, fontWeight: dr ? 800 : 500, color: dr ? '#475569' : '#d1d5db' }}>
                          {dr ? 'TIE' : 'vs'}
                        </div>
                        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 2 }}>
                          <div style={{ fontSize: 11, display: 'flex' }}>{tf(m.away)}</div>
                          <div style={{ display: 'flex', fontWeight: aw ? 700 : 400, color: aw ? '#1e293b' : dr ? '#475569' : '#cbd5e1' }}>
                            {tn(m.away)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}

        {/* KNOCKOUT BRACKET label */}
        <div style={{ display: 'flex', fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: 2, marginBottom: 8 }}>
          KNOCKOUT BRACKET
        </div>

        {/* Bracket */}
        <div style={{ display: 'flex', flex: 1, gap: 6, backgroundColor: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 10 }}>
          {ROUNDS.map(round => {
            const rm = bracket.filter(m => m.round === round && m.round !== '3RD');
            return (
              <div key={round} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4, fontSize: 8, fontWeight: 700, color: '#94a3b8', letterSpacing: 1 }}>
                  {round === 'FIN' ? 'FINAL' : round}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', flex: 1 }}>
                  {rm.map(match => (
                    <div key={match.id} style={{ display: 'flex', flexDirection: 'column', borderRadius: 4, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 2, padding: '1px 4px', fontSize: 8,
                        fontWeight: match.result === 'home' ? 700 : 400,
                        color: match.result === 'home' ? '#1e293b' : '#94a3b8',
                        backgroundColor: match.result === 'home' ? '#f0fdf4' : 'transparent',
                        borderBottom: '1px solid #f1f5f9',
                      }}>
                        <div style={{ fontSize: 9, display: 'flex' }}>{tf(match.home)}</div>
                        <div style={{ display: 'flex' }}>{tn(match.home)}</div>
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 2, padding: '1px 4px', fontSize: 8,
                        fontWeight: match.result === 'away' ? 700 : 400,
                        color: match.result === 'away' ? '#1e293b' : '#94a3b8',
                        backgroundColor: match.result === 'away' ? '#f0fdf4' : 'transparent',
                      }}>
                        <div style={{ fontSize: 9, display: 'flex' }}>{tf(match.away)}</div>
                        <div style={{ display: 'flex' }}>{tn(match.away)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <div style={{ color: '#94a3b8', fontWeight: 700, letterSpacing: 2, fontSize: 11, display: 'flex' }}>
            FIFA26.APP
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 1400,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  );
}
