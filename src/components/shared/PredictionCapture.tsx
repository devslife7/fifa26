'use client';

import { forwardRef } from 'react';
import { MatchResult, KnockoutResult, KnockoutRound, GroupLetter, SavedPrediction } from '@/types';
import { generateBracket } from '@/lib/logic/bracket';
import { teamsByCode, groups } from '@/data/teams';
import { getGroupMatches } from '@/data/matches';

function CaptureGroupCard({ group, groupPredictions }: { group: GroupLetter; groupPredictions: Record<string, MatchResult> }) {
  const matches = getGroupMatches(group);
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ padding: '2px 10px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', lineHeight: 1.2 }}>Group {group}</span>
      </div>
      {matches.map((match, i) => {
        const result = groupPredictions[match.id];
        const home = teamsByCode[match.home];
        const away = teamsByCode[match.away];
        const homeWins = result === 'home';
        const awayWins = result === 'away';
        const isDraw = result === 'draw';
        const homeName = match.home.startsWith('TBD') ? 'TBD' : (home?.name ?? match.home);
        const awayName = match.away.startsWith('TBD') ? 'TBD' : (away?.name ?? match.away);
        return (
          <div
            key={match.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '3px 8px',
              fontSize: 11,
              borderBottom: i < matches.length - 1 ? '1px solid #f1f5f9' : 'none',
            }}
          >
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
              <span className="font-body" style={{
                whiteSpace: 'nowrap',
                lineHeight: 1,
                fontWeight: homeWins ? 700 : 400,
                color: homeWins ? '#1e293b' : isDraw ? '#475569' : '#cbd5e1',
                opacity: !homeWins && !isDraw ? 0.6 : 1,
              }}>
                {homeName}
              </span>
              {home && !match.home.startsWith('TBD') ? (
                <span style={{ fontSize: 13, lineHeight: 1, opacity: !homeWins && !isDraw ? 0.45 : 1 }}>{home.flag}</span>
              ) : (
                <span style={{ width: 16, display: 'inline-block' }}>&nbsp;</span>
              )}
            </div>
            <div style={{
              width: 28,
              textAlign: 'center',
              fontSize: 9,
              lineHeight: 1,
              fontWeight: isDraw ? 800 : 600,
              color: isDraw ? '#1e293b' : '#cbd5e1',
            }}>
              {isDraw ? 'TIE' : 'vs'}
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
              {away && !match.away.startsWith('TBD') ? (
                <span style={{ fontSize: 13, lineHeight: 1, opacity: !awayWins && !isDraw ? 0.45 : 1 }}>{away.flag}</span>
              ) : (
                <span style={{ width: 16, display: 'inline-block' }}>&nbsp;</span>
              )}
              <span className="font-body" style={{
                whiteSpace: 'nowrap',
                lineHeight: 1,
                fontWeight: awayWins ? 700 : 400,
                color: awayWins ? '#1e293b' : isDraw ? '#475569' : '#cbd5e1',
                opacity: !awayWins && !isDraw ? 0.6 : 1,
              }}>
                {awayName}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CaptureGroupsGrid({ groupPredictions }: { groupPredictions: Record<string, MatchResult> }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
      {groups.map(g => (
        <CaptureGroupCard key={g} group={g} groupPredictions={groupPredictions} />
      ))}
    </div>
  );
}

function CompactBracketView({ groupPredictions, knockoutPredictions, thirdPlaceTiebreaker }: {
  groupPredictions: Record<string, MatchResult>;
  knockoutPredictions: Record<string, KnockoutResult>;
  thirdPlaceTiebreaker?: string[] | null;
}) {
  const bracket = generateBracket(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker ?? undefined);
  const rounds: KnockoutRound[] = ['R32', 'R16', 'QF', 'SF', 'FIN'];

  const teamRow = (team: { name: string; flag: string } | null, code: string | undefined, isWinner: boolean, hasBorder: boolean) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        fontSize: 11,
        whiteSpace: 'nowrap',
        backgroundColor: isWinner ? '#f8fafc' : 'transparent',
        fontWeight: isWinner ? 700 : 400,
        color: isWinner ? '#1e293b' : '#64748b',
        borderBottom: hasBorder ? '1px solid #f1f5f9' : 'none',
      }}
    >
      {team && !code?.startsWith('TBD') ? (
        <span style={{ fontSize: 13, lineHeight: 1 }}>{team.flag}</span>
      ) : (
        <span style={{ width: 16 }}>&nbsp;</span>
      )}
      <span className="font-body" style={{ lineHeight: 1 }}>{team?.name || 'TBD'}</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 8, padding: 20, backgroundColor: '#f8fafc', width: '100%', height: 920, alignItems: 'center', justifyContent: 'center' }}>
      {rounds.map(round => {
        const matches = bracket.filter(m => m.round === round && m.round !== '3RD');
        return (
          <div key={round} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', height: '100%', flex: 1, gap: 4 }}>
            <h3 style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', marginBottom: 2 }}>
              {round === 'FIN' ? 'Final' : round}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', height: '100%' }}>
              {matches.map(match => {
                const home = match.home ? teamsByCode[match.home] : null;
                const away = match.away ? teamsByCode[match.away] : null;
                return (
                  <div key={match.id} style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', borderRadius: 6, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    {teamRow(home, match.home, match.result === 'home', true)}
                    {teamRow(away, match.away, match.result === 'away', false)}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  prediction: SavedPrediction;
}

const PredictionCapture = forwardRef<HTMLDivElement, Props>(function PredictionCapture({ prediction }, ref) {
  const groupPredictions = prediction.group_matches ?? {};
  const knockoutPredictions = prediction.knockout_matches ?? {};
  const champion = prediction.champion_code ? teamsByCode[prediction.champion_code] : null;

  return (
    <div style={{ position: 'fixed', left: -9999, top: 0, width: 1600, overflow: 'hidden', zIndex: -1 }}>
      <div ref={ref} style={{ backgroundColor: '#f8fafc', padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', width: 1600 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 32 }}>
          <div style={{ fontSize: 60 }}>🏆</div>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#1e293b', margin: 0 }}>{prediction.name}</h2>
            {champion ? (
              <p style={{ color: '#64748b', fontWeight: 500, fontSize: 18, marginTop: 4 }}>
                Champion: <span className="font-body" style={{ color: '#d4a017', fontWeight: 700 }}>{champion.flag} {champion.name}</span>
              </p>
            ) : (
              <p style={{ color: '#94a3b8', fontWeight: 500, fontSize: 18, marginTop: 4 }}>In Progress</p>
            )}
          </div>
        </div>

        {/* Group Stage */}
        <div style={{ width: '100%', marginBottom: 24 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 12 }}>Group Stage</h3>
          <CaptureGroupsGrid groupPredictions={groupPredictions} />
        </div>

        {/* Knockout Bracket */}
        <div style={{ width: '100%' }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 12 }}>Knockout Bracket</h3>
          <div style={{ backgroundColor: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <CompactBracketView
              groupPredictions={groupPredictions}
              knockoutPredictions={knockoutPredictions}
              thirdPlaceTiebreaker={prediction.third_place_tiebreaker}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: 14 }}>
          fifa26.app
        </div>
      </div>
    </div>
  );
});

export default PredictionCapture;
