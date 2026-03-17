'use client';

import { useState, useEffect } from 'react';
import { TabId } from '@/types';
import { teamsByCode } from '@/data/teams';
import { useAuth } from '@/components/providers/AuthProvider';
import AuthModal from '@/components/auth/AuthModal';

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
  const { user, signOut } = useAuth();
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeRemaining()), 1000);
    return () => clearInterval(id);
  }, []);

  const groupProgress = groupCount / 72;
  const bracketProgress = knockoutCount / 32;
  const isComplete = groupCount === 72 && knockoutCount === 32 && !!champion;

  return (
    <div style={{ paddingTop: '16px', paddingBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* ── Hero: Title + Countdown ── */}
      <div style={{
        position: 'relative',
        overflow: 'visible',
        padding: '32px 20px 28px',
        textAlign: 'center',
      }}>
        {/* Radial gold glow */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(ellipse at 50% 40%, rgba(249,212,6,0.09) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Title */}
        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: '#f9d406', textTransform: 'uppercase', letterSpacing: '0.35em', margin: '0 0 8px' }}>
            FIFA™
          </p>
          <h1 style={{ fontSize: '34px', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.03em', margin: 0, lineHeight: 0.95, fontFamily: 'var(--font-display)' }}>
            World Cup <span style={{ color: '#f9d406' }}>2026</span>
          </h1>
        </div>

        {/* Trophy */}
        <img
          src="/images/fifa_logov2_transparent.png"
          alt="FIFA World Cup 2026"
          className="animate-trophy-glow"
          style={{ width: '400px', height: '440px', margin: '32px auto 40px' }}
        />

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '18px' }}>
          <span style={{ display: 'inline-block', width: '32px', height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          <p style={{ fontSize: '9px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.25em', margin: 0 }}>
            Kickoff in
          </p>
          <span style={{ display: 'inline-block', width: '32px', height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        </div>

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

      {/* ── Start New Predictions Hero CTA ── */}
      {onClear && (groupCount > 0 || knockoutCount > 0) && (
        <div style={{
          position: 'relative',
          borderRadius: '20px',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #0f1b2d 0%, #080e1a 100%)',
          border: `1px solid ${confirmingClear ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
          transition: 'border-color 0.25s ease',
        }}>
          {confirmingClear && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.07) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
          )}
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
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              textAlign: 'left',
              transition: 'transform 0.12s ease',
            }}
            onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.985)')}
            onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
              background: confirmingClear ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${confirmingClear ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.25s ease',
            }}>
              <span className="material-symbols-outlined" style={{
                fontSize: '22px',
                color: confirmingClear ? '#ef4444' : '#475569',
                transition: 'color 0.25s ease',
              }}>
                {confirmingClear ? 'warning' : 'restart_alt'}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: '14px', fontWeight: 700, margin: '0 0 3px',
                color: confirmingClear ? '#ef4444' : '#f1f5f9',
                transition: 'color 0.25s ease',
              }}>
                {confirmingClear ? 'Tap again to confirm' : 'Start New Predictions'}
              </p>
              <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
                {confirmingClear ? 'Your current picks will be cleared' : 'Clear your picks and begin fresh'}
              </p>
            </div>
            <span className="material-symbols-outlined" style={{
              fontSize: '20px',
              color: confirmingClear ? 'rgba(239,68,68,0.4)' : '#1e293b',
              transition: 'color 0.25s ease',
            }}>
              chevron_right
            </span>
          </button>
        </div>
      )}

      {/* ── Predictions + Champion (combined) ── */}
      <button
        onClick={() => onNavigate(groupCount < 72 ? 'groups' : 'bracket')}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
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
        {/* Divider line */}
        <div style={{
          height: '1px',
          background: 'rgba(255,255,255,0.06)',
          marginBottom: '18px',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
          <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '240px', height: '160px', borderRadius: '8px', overflow: 'hidden', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>
              {teamFlagsByCode[champion] ? (
                <img src={teamFlagsByCode[champion]} alt={champion} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '5rem', lineHeight: 1 }}>{teamsByCode[champion]?.flag ?? '🏳️'}</span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.09em' }}>
                Champion
              </span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#f9d406' }}>
                {teamsByCode[champion]?.name ?? champion}
              </span>
            </div>
          </div>
        )}
      </button>

      {/* ── Account Section ── */}
      {user ? (
        <div style={{ padding: '8px 20px 0' }}>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '24px' }} />

          <div style={{
            display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px',
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
              background: 'rgba(249,212,6,0.10)', border: '1px solid rgba(249,212,6,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ color: '#f9d406', fontSize: '24px' }}>person</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.display_name || 'Player'}
              </p>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </p>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: '20px' }}>logout</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>Sign Out</span>
          </button>
        </div>
      ) : (
        <div style={{ padding: '8px 20px 0' }}>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '24px' }} />

          <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '16px', textAlign: 'center' }}>
            Why sign in to your account using one time password?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            {[
              { icon: 'edit_calendar', text: 'Edit predictions anytime before kickoff' },
              { icon: 'cloud_done', text: 'Predictions saved securely to your account' },
              { icon: 'devices', text: 'Access your picks from any device' },
              { icon: 'leaderboard', text: 'Compete on the leaderboard with friends' },
            ].map((b) => (
              <div key={b.icon} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                  background: 'rgba(249,212,6,0.06)', border: '1px solid rgba(249,212,6,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ color: '#f9d406', fontSize: '16px' }}>{b.icon}</span>
                </div>
                <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>{b.text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowAuth(true)}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: '#f9d406', fontSize: '20px' }}>login</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>Sign In OTP</span>
          </button>

          <p style={{ fontSize: '11px', color: '#334155', textAlign: 'center', marginTop: '10px' }}>
            No password needed — we send a one-time code to your email
          </p>
        </div>
      )}

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuthenticated={() => setShowAuth(false)}
        />
      )}
    </div>
  );
}
