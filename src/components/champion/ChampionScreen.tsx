'use client';

import { useState, useRef } from 'react';
import { MatchResult, KnockoutResult, KnockoutRound, GroupLetter, GroupTiebreakers } from '@/types';
import { generateBracket, getChampion, getTopThree } from '@/lib/logic/bracket';
import { teamsByCode, groups } from '@/data/teams';
import { getGroupMatches } from '@/data/matches';
import { loadPredictions, getEditingPredictionId, getEditingPredictionName } from '@/lib/client/storage';
import { copyImageToClipboard } from '@/lib/client/clipboard';
import type { AppUser } from '@/components/providers/AuthProvider';
import Podium from '@/components/champion/Podium';

interface Props {
  groupPredictions: Record<string, MatchResult>;
  knockoutPredictions: Record<string, KnockoutResult>;
  groupTiebreakers?: GroupTiebreakers;
  thirdPlaceTiebreaker?: string[];
  onComplete?: () => void;
  onSaved?: () => void;
  user?: AppUser | null;
  onSignIn?: () => void;
  onEdit?: () => void;
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

function CompactBracketView({ groupPredictions, knockoutPredictions, groupTiebreakers = {}, thirdPlaceTiebreaker }: Props) {
  const bracket = generateBracket(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker, groupTiebreakers);
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

export default function ChampionScreen({ groupPredictions, knockoutPredictions, groupTiebreakers = {}, thirdPlaceTiebreaker, onComplete, onSaved, user, onSignIn, onEdit }: Props) {
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyingImage, setCopyingImage] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [validatingEmail, setValidatingEmail] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [predictionNameInput, setPredictionNameInput] = useState('');
  const captureRef = useRef<HTMLDivElement>(null);

  const championCode = getChampion(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker, groupTiebreakers);
  const champion = championCode ? teamsByCode[championCode] : null;
  const topThree = getTopThree(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker, groupTiebreakers);
  const secondTeam = topThree.second ? teamsByCode[topThree.second] : null;
  const thirdTeam = topThree.third ? teamsByCode[topThree.third] : null;

  const handleSubmit = async () => {
    setError(null);
    setEmailError(null);

    if (!user) {
      if (!submitterEmail.trim()) {
        setEmailError('Please enter your email');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(submitterEmail)) {
        setEmailError('Please enter a valid email address');
        return;
      }
      setValidatingEmail(true);
      try {
        const validateRes = await fetch('/api/validate-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: submitterEmail }),
        });
        const validateData = await validateRes.json();
        if (!validateData.valid) {
          setEmailError(validateData.reason || 'Invalid email');
          setValidatingEmail(false);
          return;
        }
      } catch {
        // If validation endpoint fails, proceed anyway
      }
      setValidatingEmail(false);
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
          predictionId: user ? (predictionId || undefined) : undefined,
          name: predictionName || predictionNameInput.trim() || 'My Predictions',
          groupMatches: local.groupMatches,
          knockoutMatches: local.knockoutMatches,
          groupTiebreakers: local.groupTiebreakers,
          thirdPlaceTiebreaker: local.thirdPlaceTiebreaker,
          championCode,
          isComplete: true,
          ...(!user && {
            submitterEmail: submitterEmail.trim(),
          }),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save');
        return;
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

  const handleCopyImage = async () => {
    if (!captureRef.current) return;
    setCopyingImage(true);
    setCopySuccess(false);
    const result = await copyImageToClipboard(captureRef.current);
    setCopyingImage(false);
    if (result === 'copied') {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  if (!champion) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <img src="/images/fifa_logo.svg" alt="FIFA World Cup 2026" className="w-20 h-20 mb-6 mx-auto" />
        <h2 className="text-3xl font-bold mb-3">Your Champion</h2>
        <p className="text-neutral-400 max-w-md">
          Complete all match predictions to reveal your predicted FIFA World Cup 2026 champion
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center pt-4 pb-8 text-center">
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
                groupTiebreakers={groupTiebreakers}
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

      {/* Trophy Hero */}
      <div className="flex flex-col items-center">
        <div className="relative mb-2">
          <img src="/images/fifa_logo.svg" alt="FIFA World Cup 2026" className="w-24 h-24 mx-auto" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-32 h-6 bg-primary/20 blur-2xl rounded-full" />
        </div>
        <div className="mb-3">
          <span className="text-6xl">{champion.flag}</span>
        </div>
        <h2 className="text-3xl font-black mb-1 font-body">
          <span className="champion-shimmer">{champion.name}</span>
        </h2>
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/25 font-semibold">
          Your Predicted Champion
        </p>
      </div>

      {/* Podium — ceremony order: 3rd, 2nd, 1st */}
      {championCode && topThree.second && topThree.third && (
        <div className="mt-8">
          <Podium
            championCode={championCode}
            secondCode={topThree.second}
            thirdCode={topThree.third}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-10 w-full max-w-sm space-y-3">
        {shareUrl ? (
          <>
            <div className="bg-wc-green/15 border border-wc-green/30 rounded-xl p-4 text-center">
              <span className="material-symbols-outlined text-wc-green text-2xl font-variation-fill">check_circle</span>
              <p className="text-wc-green font-bold mt-1">Predictions Submitted!</p>
              <p className="text-xs text-neutral-400 mt-1">Check your email for a link to your predictions</p>
            </div>
            <button
              onClick={handleCopyLink}
              className="w-full py-3 bg-background-dark text-white font-bold rounded-xl hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">content_copy</span>
              Copy Share Link
            </button>
            <p className="text-xs text-neutral-400 break-all">{shareUrl}</p>
            {!user && onSignIn && (
              <div className="p-4 rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/[0.05] to-transparent">
                <p className="text-sm font-bold text-white mb-3 text-center">Sign in to unlock</p>
                <div className="space-y-2 mb-4">
                  {[
                    { icon: 'trending_up', text: 'Track your live score' },
                    { icon: 'leaderboard', text: 'Compete on the leaderboard' },
                    { icon: 'library_add', text: 'Create up to 10 predictions' },
                    { icon: 'edit', text: 'Edit anytime' },
                  ].map((benefit) => (
                    <div key={benefit.text} className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[16px]">{benefit.icon}</span>
                      <span className="text-xs text-neutral-300">{benefit.text}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={onSignIn}
                  className="w-full py-3 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors"
                >
                  Sign In
                </button>
              </div>
            )}
            {onComplete && (
              <button
                onClick={onComplete}
                className="w-full py-3 mt-2 bg-white/10 text-white font-bold rounded-xl hover:bg-white/15 transition-colors flex items-center justify-center gap-2"
              >
                Continue to Profile
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            )}
          </>
        ) : user ? (
          <>
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-lg"
            >
              <span className="material-symbols-outlined font-variation-fill">send</span>
              Submit Prediction
            </button>
            {onEdit && (
              <button
                onClick={onEdit}
                className="w-full py-3 bg-white/10 text-white/80 font-bold rounded-xl hover:bg-white/15 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Edit Predictions
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-lg"
            >
              <span className="material-symbols-outlined font-variation-fill">send</span>
              Submit Prediction
            </button>
            {onSignIn && (
              <button
                onClick={onSignIn}
                className="w-full py-3 bg-white/10 text-white/80 font-bold rounded-xl hover:bg-white/15 transition-colors"
              >
                Sign In
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                className="w-full py-3 bg-white/5 text-white/50 font-bold rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Edit Predictions
              </button>
            )}
          </>
        )}
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => !saving && !validatingEmail && setShowSubmitModal(false)}>
          <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">Submit Prediction</h3>
              <button onClick={() => !saving && !validatingEmail && setShowSubmitModal(false)} className="text-neutral-400 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-wc-red/15 border border-wc-red/30 rounded-lg text-wc-red text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3 mb-5">
              <input
                type="text"
                placeholder="Prediction name"
                value={predictionNameInput}
                onChange={(e) => setPredictionNameInput(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
              />
              {!user && (
                <div>
                  <input
                    type="email"
                    placeholder="Your email"
                    value={submitterEmail}
                    onChange={(e) => { setSubmitterEmail(e.target.value); setEmailError(null); }}
                    className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/30 focus:outline-none transition-colors ${
                      emailError ? 'border-wc-red/50 focus:border-wc-red/70' : 'border-white/10 focus:border-primary/50'
                    }`}
                  />
                  {emailError && (
                    <p className="text-xs text-wc-red mt-1.5 ml-1">{emailError}</p>
                  )}
                </div>
              )}
            </div>

            {!user && (
              <div className="mb-5 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl">
                <p className="text-[11px] text-neutral-400 text-center leading-relaxed">
                  Your predictions will be sent to your email. Your submission will be reviewed for approval.
                </p>
              </div>
            )}

            <button
              onClick={user ? () => savePredictions() : handleSubmit}
              disabled={saving || validatingEmail}
              className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
            >
              {saving || validatingEmail ? (
                validatingEmail ? 'Validating...' : 'Submitting...'
              ) : (
                <>
                  <span className="material-symbols-outlined font-variation-fill">send</span>
                  Submit
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
