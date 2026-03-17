'use client';

import { useState, useEffect } from 'react';
import { TabId, LeaderboardEntry } from '@/types';
import { teamsByCode } from '@/data/teams';

interface HomeViewProps {
  groupCount: number;
  knockoutCount: number;
  champion: string | null;
  teamFlagsByCode: Record<string, string>;
  onNavigate: (tab: TabId) => void;
  onClear?: () => void;
}

const TOURNAMENT_START = new Date('2026-06-11T00:00:00Z');

function getTimeRemaining() {
  const now = Date.now();
  const diff = TOURNAMENT_START.getTime() - now;
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function CountdownTile({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '56px' }}>
      <span style={{
        display: 'block',
        fontSize: '3rem',
        fontWeight: 900,
        color: '#f9d406',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.04em',
        lineHeight: 1,
        fontFamily: 'var(--font-display)',
      }}>
        {String(value).padStart(2, '0')}
      </span>
      <span style={{
        fontSize: '9px',
        fontWeight: 700,
        color: '#475569',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.18em',
      }}>
        {label}
      </span>
    </div>
  );
}

function ProgressRow({ label, current, total }: { label: string; current: number; total: number }) {
  const complete = current === total;
  const pct = (current / total) * 100;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.09em' }}>
          {label}
        </span>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '13px', fontWeight: 700, color: complete ? '#f9d406' : '#cbd5e1' }}>
          {current}
          <span style={{ fontSize: '11px', fontWeight: 500, color: '#334155' }}>/{total}</span>
        </span>
      </div>
      <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          borderRadius: '3px',
          width: `${pct}%`,
          background: complete
            ? 'linear-gradient(90deg, #15803d, #22c55e)'
            : 'linear-gradient(90deg, #c9a800, #f9d406)',
          transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: complete ? '0 0 10px rgba(34,197,94,0.5)' : '0 0 10px rgba(249,212,6,0.35)',
        }} />
      </div>
    </div>
  );
}

export default function HomeView({ groupCount, knockoutCount, champion, teamFlagsByCode, onNavigate, onClear }: HomeViewProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [confirmingClear, setConfirmingClear] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeRemaining()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => setLeaderboard((data.leaderboard ?? []).slice(0, 3)))
      .catch(() => {})
      .finally(() => setLeaderboardLoading(false));
  }, []);

  const groupProgress = groupCount / 72;
  const bracketProgress = knockoutCount / 32;
  const isComplete = groupCount === 72 && knockoutCount === 32 && !!champion;

  return (
    <div style={{ paddingTop: '16px', paddingBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* ── Hero: Countdown ── */}
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '24px',
        background: 'linear-gradient(160deg, #0f1b2d 0%, #080e1a 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '28px 20px 24px',
        textAlign: 'center',
      }}>
        {/* Radial gold glow behind everything */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '260px',
          height: '220px',
          background: 'radial-gradient(ellipse at 50% 30%, rgba(249,212,6,0.07) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* Trophy */}
        <img
          src="/images/fifa_logo.svg"
          alt="FIFA World Cup 2026"
          className="animate-trophy-glow"
          style={{ width: '52px', height: '52px', margin: '0 auto 8px' }}
        />
        <p style={{ fontSize: '10px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: '18px' }}>
          Kickoff in
        </p>

        {timeLeft ? (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '4px' }}>
              <CountdownTile value={timeLeft.days} label="days" />
              <span style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b', lineHeight: 1, paddingTop: '6px', letterSpacing: '-0.02em' }}>:</span>
              <CountdownTile value={timeLeft.hours} label="hrs" />
              <span style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b', lineHeight: 1, paddingTop: '6px', letterSpacing: '-0.02em' }}>:</span>
              <CountdownTile value={timeLeft.minutes} label="min" />
              <span style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b', lineHeight: 1, paddingTop: '6px', letterSpacing: '-0.02em' }}>:</span>
              <CountdownTile value={timeLeft.seconds} label="sec" />
            </div>
            <p style={{ marginTop: '18px', fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <span style={{ display: 'inline-block', width: '24px', height: '1px', background: 'rgba(255,255,255,0.1)' }} />
              June 11, 2026 · Mexico City
              <span style={{ display: 'inline-block', width: '24px', height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            </p>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 0' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s ease-in-out infinite', display: 'inline-block' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>Tournament in progress</span>
          </div>
        )}
      </div>

      {/* ── Start / Continue CTA ── */}
      {!isComplete && (
        <button
          onClick={() => onNavigate(groupCount < 72 ? 'groups' : knockoutCount < 32 ? 'bracket' : 'submit')}
          style={{
            width: '100%',
            padding: '16px 20px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #f9d406 0%, #c9a800 100%)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'transform 0.12s ease',
            boxShadow: '0 4px 24px rgba(249,212,6,0.25)',
          }}
          onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
          onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span className="material-symbols-outlined" style={{ color: '#0a0a0a', fontSize: '22px' }}>
            {groupCount === 0 ? 'emoji_events' : 'arrow_forward'}
          </span>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#0a0a0a', letterSpacing: '-0.01em' }}>
            {groupCount === 0 ? 'Start My Picks' : 'Continue My Picks'}
          </span>
        </button>
      )}

      {/* ── Predictions + Champion (combined) ── */}
      <button
        onClick={() => onNavigate(groupCount < 72 ? 'groups' : 'bracket')}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'linear-gradient(135deg, #0f1b2d 0%, #080e1a 100%)',
          border: `1px solid ${isComplete ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: '20px',
          padding: '18px 20px',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'transform 0.12s ease',
        }}
        onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.985)')}
        onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {/* Left accent stripe */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: '18%',
          bottom: '18%',
          width: '3px',
          borderRadius: '0 2px 2px 0',
          background: isComplete ? 'linear-gradient(180deg, #15803d, #22c55e)' : 'linear-gradient(180deg, #c9a800, #f9d406)',
          boxShadow: isComplete ? '0 0 8px rgba(34,197,94,0.5)' : '0 0 8px rgba(249,212,6,0.4)',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '9px',
              background: 'rgba(249,212,6,0.08)',
              border: '1px solid rgba(249,212,6,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ color: '#f9d406', fontSize: '18px' }}>sports_soccer</span>
            </div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>Your Predictions</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isComplete && (
              <span style={{
                fontSize: '9px', fontWeight: 800, color: '#22c55e',
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                padding: '3px 9px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>
                Complete
              </span>
            )}
            <span className="material-symbols-outlined" style={{ color: '#334155', fontSize: '20px' }}>chevron_right</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <ProgressRow label="Groups" current={groupCount} total={72} />
          <ProgressRow label="Bracket" current={knockoutCount} total={32} />
        </div>

        {/* Champion section — inlined below progress bars */}
        {champion && (
          <div style={{
            marginTop: '18px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.16em', flexShrink: 0 }}>
              ★ Champion
            </p>
            <div style={{ width: '28px', height: '28px', flexShrink: 0, filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.4))' }}>
              {teamFlagsByCode[champion] ? (
                <img src={teamFlagsByCode[champion]} alt={champion} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{teamsByCode[champion]?.flag ?? '🏳️'}</span>
              )}
            </div>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#f0fdf4', letterSpacing: '-0.02em', flex: 1 }}>
              {teamsByCode[champion]?.name ?? champion}
            </span>
          </div>
        )}
      </button>

      {/* ── Clear Predictions ── */}
      {onClear && (groupCount > 0 || knockoutCount > 0) && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => {
              if (confirmingClear) {
                onClear();
                setConfirmingClear(false);
              } else {
                setConfirmingClear(true);
                setTimeout(() => setConfirmingClear(false), 3000);
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '8px',
              color: confirmingClear ? '#ef4444' : '#475569',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.02em',
              transition: 'color 0.15s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              {confirmingClear ? 'warning' : 'delete'}
            </span>
            {confirmingClear ? 'Tap again to confirm' : 'Clear predictions'}
          </button>
        </div>
      )}

      {/* ── Leaderboard Preview ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f1b2d 0%, #080e1a 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '20px',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '18px 20px 14px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '9px',
            background: 'rgba(249,212,6,0.08)',
            border: '1px solid rgba(249,212,6,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ color: '#f9d406', fontSize: '18px' }}>leaderboard</span>
          </div>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>Leaderboard</span>
        </div>

        {/* Entries */}
        <div style={{ padding: '0 20px' }}>
          {leaderboardLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0' }}>
              <img src="/images/fifa_logo.svg" alt="Loading" className="animate-trophy-glow" style={{ width: '28px', height: '28px' }} />
            </div>
          ) : leaderboard.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px 0', fontSize: '12px', color: '#334155' }}>
              No entries yet — be the first!
            </p>
          ) : (
            <div>
              {leaderboard.map((entry, i) => {
                const rankColor = ['#FFD700', '#C0C0C0', '#CD7F32'][i];
                const rankBg = ['rgba(255,215,0,0.07)', 'rgba(192,192,192,0.05)', 'rgba(205,127,50,0.05)'][i];
                return (
                  <div key={entry.user_id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '11px 0',
                    borderBottom: i < leaderboard.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
                      background: rankBg, border: `1px solid ${rankColor}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 800, color: rankColor,
                    }}>
                      {i + 1}
                    </div>
                    <span style={{ flex: 1, fontSize: '13px', color: '#cbd5e1', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.display_name}
                    </span>
                    {entry.champion_code && (
                      <span style={{ display: 'inline-flex', width: '22px', height: '22px', flexShrink: 0 }}>
                        {teamFlagsByCode[entry.champion_code] ? (
                          <img src={teamFlagsByCode[entry.champion_code]} alt={entry.champion_code} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: '17px' }}>{teamsByCode[entry.champion_code]?.flag ?? ''}</span>
                        )}
                      </span>
                    )}
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#f9d406', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                      {entry.total_points}
                      <span style={{ fontSize: '10px', fontWeight: 500, color: '#334155' }}> pts</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={() => onNavigate('ranking')}
          style={{
            width: '100%',
            display: 'block',
            textAlign: 'center',
            padding: '14px 20px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            fontSize: '12px',
            fontWeight: 700,
            color: '#f9d406',
            letterSpacing: '0.03em',
            cursor: 'pointer',
            background: 'transparent',
          }}
        >
          See full ranking →
        </button>
      </div>
    </div>
  );
}
