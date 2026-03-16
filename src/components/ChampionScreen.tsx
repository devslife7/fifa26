'use client';

import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { MatchResult, KnockoutResult, KnockoutRound, GroupLetter } from '@/types';
import { generateBracket, getChampion, getTopThree } from '@/lib/bracket';
import { teamsByCode, groups } from '@/data/teams';
import { getGroupMatches } from '@/data/matches';
import { useAuth } from '@/components/providers/AuthProvider';
import { loadPredictions, getEditingPredictionId, getEditingPredictionName, resetAllPredictions } from '@/lib/storage';
import AuthModal from '@/components/AuthModal';

interface Props {
  groupPredictions: Record<string, MatchResult>;
  knockoutPredictions: Record<string, KnockoutResult>;
  thirdPlaceTiebreaker?: string[];
  onComplete?: () => void;
  onSaved?: () => void;
}

function FlagEmoji({ code, flagEmoji, size = 'normal' }: { code: string; flagEmoji: string; size?: 'small' | 'normal' }) {
  if (code.startsWith('TBD')) return null;
  const emojiClass = size === 'small' ? "text-lg leading-none" : "text-2xl leading-none";
  return <span className={emojiClass}>{flagEmoji}</span>;
}

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
            {/* Home side */}
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
            {/* Center indicator */}
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
            {/* Away side */}
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

function CompactBracketView({ groupPredictions, knockoutPredictions, thirdPlaceTiebreaker }: Props) {
  const bracket = generateBracket(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker);
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

export default function ChampionScreen({ groupPredictions, knockoutPredictions, thirdPlaceTiebreaker, onComplete, onSaved }: Props) {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [takingScreenshot, setTakingScreenshot] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const championCode = getChampion(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker);
  const champion = championCode ? teamsByCode[championCode] : null;
  const topThree = getTopThree(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker);
  const secondTeam = topThree.second ? teamsByCode[topThree.second] : null;
  const thirdTeam = topThree.third ? teamsByCode[topThree.third] : null;

  const handleSave = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    await savePredictions();
  };

  const savePredictions = async () => {
    setSaving(true);
    setError(null);

    try {
      const local = loadPredictions();
      const predictionId = getEditingPredictionId();
      const predictionName = getEditingPredictionName();

      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predictionId: predictionId || undefined,
          name: predictionName || 'My Predictions',
          groupMatches: local.groupMatches,
          knockoutMatches: local.knockoutMatches,
          thirdPlaceTiebreaker: local.thirdPlaceTiebreaker,
          championCode,
          isComplete: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save');
        return;
      }

      // Clear all local prediction data since prediction is now complete
      resetAllPredictions();

      // Auto-activate if this is the first complete prediction
      if (data.predictions?.id && !data.predictions?.is_active) {
        fetch('/api/predictions/active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ predictionId: data.predictions.id }),
        }).catch(() => {});
      }

      if (data.predictions?.share_token) {
        setShareUrl(`${window.location.origin}/shared/${data.predictions.share_token}`);
      }

      onSaved?.();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  const handleScreenshot = async () => {
    if (!captureRef.current) return;
    setTakingScreenshot(true);
    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: '#f8fafc',
        scale: 2, // higher res
        logging: false,
        useCORS: true,
        windowWidth: 1600,
        onclone: (clonedDoc) => {
          // html2canvas doesn't support oklch/lab colors yet, so we need to
          // convert any tailwind v4 oklch colors to hex/rgb in the cloned document
          // before rendering
          const elements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            const style = window.getComputedStyle(el);
            
            // Fix text color
            if (style.color && (style.color.includes('oklch') || style.color.includes('lab'))) {
              // Fallback to a safe dark slate color for text
              el.style.color = '#1e293b';
            }
            
            // Fix background color
            if (style.backgroundColor && (style.backgroundColor.includes('oklch') || style.backgroundColor.includes('lab'))) {
              // Fallback to white or transparent depending on context
              if (el.classList.contains('bg-white')) {
                el.style.backgroundColor = '#ffffff';
              } else if (el.classList.contains('bg-neutral-50')) {
                el.style.backgroundColor = '#f8fafc';
              } else {
                el.style.backgroundColor = 'transparent';
              }
            }
            
            // Fix border color
            if (style.borderColor && (style.borderColor.includes('oklch') || style.borderColor.includes('lab'))) {
              el.style.borderColor = '#e2e8f0'; // neutral-200
            }
          }
        }
      });
      
      const image = canvas.toDataURL('image/png', 1.0);
      
      // Try to use the native share API if available (works well on mobile)
      if (navigator.share && navigator.canShare) {
        try {
          const blob = await (await fetch(image)).blob();
          const file = new File([blob], `fifa26-predictions-${champion?.name.toLowerCase().replace(/\s+/g, '-')}.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'My FIFA 26 Predictions',
              files: [file]
            });
            return; // If share succeeds, we're done
          }
        } catch (shareErr) {
          console.log('Share API failed or was cancelled, falling back to download', shareErr);
        }
      }
      
      // Fallback to standard download
      const link = document.createElement('a');
      link.download = `fifa26-predictions-${champion?.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = image;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to take screenshot:', err);
    } finally {
      setTakingScreenshot(false);
    }
  };

  if (!champion) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-7xl mb-6 animate-trophy-glow">🏆</div>
        <h2 className="text-3xl font-bold mb-3">Your Champion</h2>
        <p className="text-neutral-400 max-w-md">
          Complete all match predictions to reveal your predicted FIFA World Cup 2026 champion
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {/* Hidden container for the full bracket screenshot */}
      <div className="overflow-hidden h-0 w-0 absolute left-[-9999px]">
        <div ref={captureRef} style={{ backgroundColor: '#f8fafc', padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', width: 1600 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 32 }}>
            <div style={{ fontSize: 60 }}>🏆</div>
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 900, color: '#1e293b', margin: 0 }}>My FIFA 26 Predictions</h2>
              <p style={{ color: '#64748b', fontWeight: 500, fontSize: 18, marginTop: 4 }}>Champion: <span className="font-body" style={{ color: '#d4a017', fontWeight: 700 }}>{champion.flag} {champion.name}</span></p>
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
                thirdPlaceTiebreaker={thirdPlaceTiebreaker}
              />
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 32, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: 14 }}>
            fifa26.app
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center w-full p-8">
        <div className="relative mb-8">
          <div className="text-8xl animate-trophy-glow">🏆</div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-3 bg-primary/20 rounded-full blur-xl" />
        </div>

        <div className="mb-6">
          <span className="text-7xl">{champion.flag}</span>
        </div>

        <h2 className="text-4xl font-black mb-2 text-primary font-body">
          {champion.name}
        </h2>

        <p className="text-neutral-400 text-sm uppercase tracking-[0.2em] font-medium mb-8">
          Your Predicted Champion
        </p>

        {/* Podium: 1st, 2nd, 3rd */}
        <div className="flex items-end justify-center gap-3 mb-8 w-full max-w-sm">
          {/* 2nd Place */}
          {secondTeam && (
            <div className="flex-1 flex flex-col items-center">
              <span className="text-3xl mb-2">{secondTeam.flag}</span>
              <div className="w-full rounded-t-xl bg-white/5 border border-white/10 border-b-0 pt-4 pb-3 flex flex-col items-center">
                <span className="text-medal-silver text-xs font-bold uppercase tracking-wider">2nd</span>
                <p className="text-white/70 text-xs font-bold mt-1 font-body">{secondTeam.name}</p>
              </div>
              <div className="w-full h-16 bg-white/5 border border-white/10 border-t-0 rounded-b-none" />
            </div>
          )}
          {/* 1st Place */}
          <div className="flex-1 flex flex-col items-center">
            <span className="text-4xl mb-2">{champion.flag}</span>
            <div className="w-full rounded-t-xl bg-primary/10 border border-primary/20 border-b-0 pt-4 pb-3 flex flex-col items-center">
              <span className="text-medal-gold text-xs font-bold uppercase tracking-wider">1st</span>
              <p className="text-primary text-xs font-bold mt-1 font-body">{champion.name}</p>
            </div>
            <div className="w-full h-24 bg-primary/10 border border-primary/20 border-t-0 rounded-b-none" />
          </div>
          {/* 3rd Place */}
          {thirdTeam && (
            <div className="flex-1 flex flex-col items-center">
              <span className="text-3xl mb-2">{thirdTeam.flag}</span>
              <div className="w-full rounded-t-xl bg-white/5 border border-white/10 border-b-0 pt-4 pb-3 flex flex-col items-center">
                <span className="text-medal-bronze text-xs font-bold uppercase tracking-wider">3rd</span>
                <p className="text-white/70 text-xs font-bold mt-1 font-body">{thirdTeam.name}</p>
              </div>
              <div className="w-full h-10 bg-white/5 border border-white/10 border-t-0 rounded-b-none" />
            </div>
          )}
        </div>
      </div>

      {/* Save & Share Section */}
      <div className="mt-8 w-full max-w-sm">
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleScreenshot}
            disabled={takingScreenshot}
            className="flex-1 py-3 bg-white/10 border border-white/10 text-white font-bold rounded-xl hover:bg-white/15 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">
              {takingScreenshot ? 'hourglass_empty' : 'photo_camera'}
            </span>
            {takingScreenshot ? 'Saving...' : 'Save Image'}
          </button>
        </div>

        {shareUrl ? (
          <div className="space-y-3">
            <div className="bg-wc-green/15 border border-wc-green/30 rounded-xl p-4 text-center">
              <span className="material-symbols-outlined text-wc-green text-2xl font-variation-fill">check_circle</span>
              <p className="text-wc-green font-bold mt-1">Predictions Saved!</p>
            </div>
            <button
              onClick={handleCopyLink}
              className="w-full py-3 bg-background-dark text-white font-bold rounded-xl hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">content_copy</span>
              Copy Share Link
            </button>
            <p className="text-xs text-neutral-400 break-all">{shareUrl}</p>
            {onComplete && (
              <button
                onClick={onComplete}
                className="w-full py-3 mt-2 bg-white/10 text-white font-bold rounded-xl hover:bg-white/15 transition-colors flex items-center justify-center gap-2"
              >
                Continue to Profile
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-wc-red/15 border border-wc-red/30 rounded-lg text-wc-red text-sm">
                {error}
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
            >
              {saving ? (
                'Saving...'
              ) : (
                <>
                  <span className="material-symbols-outlined font-variation-fill">share</span>
                  Save & Share
                </>
              )}
            </button>
            {!user && (
              <p className="text-xs text-neutral-400 mt-2">You&apos;ll need to sign in to save</p>
            )}
          </>
        )}
      </div>

      {/* Auth Modal */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuthenticated={() => {
            setShowAuth(false);
            savePredictions();
          }}
        />
      )}
    </div>
  );
}
