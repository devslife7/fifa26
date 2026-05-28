'use client';

import { useState, useEffect, useRef } from 'react';
import { MatchResult, KnockoutResult } from '@/types';
import { getChampion, getTopThree } from '@/lib/logic/bracket';
import { teamsByCode } from '@/data/teams';
import { loadPredictions, getEditingPredictionId, getEditingPredictionName } from '@/lib/client/storage';
import {
  createPredictionSnapshot,
  getSubmittedConfirmationForSnapshot,
  markSnapshotSubmitted,
  type SubmittedPredictionConfirmation,
} from '@/lib/logic/prediction-flow';
import { useAuth, type AppUser } from '@/components/providers/AuthProvider';
import Podium from '@/components/champion/Podium';

interface ChampionOverlayProps {
  groupPredictions: Record<string, MatchResult>;
  knockoutPredictions: Record<string, KnockoutResult>;
  thirdPlaceTiebreaker?: string[];
  user: AppUser | null;
  onDismiss: () => void;
  onSubmitted: (confirmation: SubmittedPredictionConfirmation) => void;
  onNavigateToRanking: () => void;
  onAuthenticated?: () => void;
  isSubmitted?: boolean;
  isPage?: boolean;
}

export default function ChampionOverlay({
  groupPredictions,
  knockoutPredictions,
  thirdPlaceTiebreaker,
  user,
  onDismiss,
  onSubmitted,
  onNavigateToRanking,
  onAuthenticated,
  isSubmitted,
  isPage,
}: ChampionOverlayProps) {
  const { signIn, verifyOtp } = useAuth();
  const predictionSnapshot = createPredictionSnapshot(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker);
  const [phase, setPhase] = useState<'form' | 'confirmation'>(() => isSubmitted ? 'confirmation' : 'form');
  const [name, setName] = useState(user?.display_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [validatingEmail, setValidatingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Inline OTP state
  const [signInEmail, setSignInEmail] = useState('');
  const [otpStep, setOtpStep] = useState<'idle' | 'sending' | 'sent' | 'verifying' | 'done'>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);

  // Confirmation email editing
  const [editingConfirmEmail, setEditingConfirmEmail] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  // Confirmation data
  const [predictionNumber, setPredictionNumber] = useState<number | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const championCode = getChampion(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker);
  const topThree = getTopThree(groupPredictions, knockoutPredictions, thirdPlaceTiebreaker);
  const champion = championCode ? teamsByCode[championCode] : null;

  useEffect(() => {
    if (!isSubmitted) {
      setPhase('form');
      return;
    }

    const confirmation = getSubmittedConfirmationForSnapshot(predictionSnapshot);
    if (confirmation) {
      setPredictionNumber(confirmation.predictionNumber);
      setShareToken(confirmation.shareToken);
      setCreatedAt(confirmation.createdAt);
      if (confirmation.email) setEmail(confirmation.email);
    }
    setPhase('confirmation');
  }, [isSubmitted, predictionSnapshot]);

  useEffect(() => {
    if (user?.display_name && !name) setName(user.display_name);
    if (user?.email && !email) setEmail(user.email);
  }, [user, name, email]);

  useEffect(() => {
    if (phase !== 'form' || isSubmitted) return;

    const frame = requestAnimationFrame(() => {
      nameInputRef.current?.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frame);
  }, [phase, isSubmitted]);

  // Lock body scroll (only in overlay/modal mode)
  useEffect(() => {
    if (isPage) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isPage]);

  const focusNameError = () => {
    const input = nameInputRef.current;
    if (!input) return;

    input.focus({ preventScroll: true });
    input.scrollIntoView({ block: 'center', behavior: 'smooth' });

    window.requestAnimationFrame(() => {
      nameInputRef.current?.focus({ preventScroll: true });
    });
  };

  const handleSubmit = async () => {
    setError(null);
    setNameError(null);
    setEmailError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setNameError('Please enter your prediction name');
      focusNameError();
      return;
    }

    if (!trimmedEmail) {
      setEmailError('Please enter your email');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Validate email via API for all users
    setValidatingEmail(true);
    try {
      const validateRes = await fetch('/api/validate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
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

    // Save predictions
    setSaving(true);
    try {
      const local = loadPredictions();
      const predictionId = getEditingPredictionId();
      const predictionName = getEditingPredictionName()?.trim();

      const body: Record<string, unknown> = {
        name: predictionName || trimmedName,
        groupMatches: local.groupMatches,
        knockoutMatches: local.knockoutMatches,
        thirdPlaceTiebreaker: local.thirdPlaceTiebreaker,
        championCode,
        isComplete: true,
        submitterName: trimmedName,
        submitterEmail: trimmedEmail,
      };

      if (user) {
        body.predictionId = predictionId || undefined;
      }

      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save');
        setSaving(false);
        return;
      }

      const confirmation: SubmittedPredictionConfirmation = {
        predictionNumber: data.predictions?.prediction_number ?? null,
        shareToken: data.predictions?.share_token ?? null,
        createdAt: data.predictions?.created_at ?? null,
        email: trimmedEmail,
      };

      setPredictionNumber(confirmation.predictionNumber);
      setShareToken(confirmation.shareToken);
      setCreatedAt(confirmation.createdAt);
      onSubmitted(confirmation);
      setPhase('confirmation');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const shareLink = shareToken ? `${window.location.origin}/shared/${shareToken}` : null;

  const handleCopyLink = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  if (!champion) return null;

  if (isPage) {
    return (
      <div className="w-full max-w-sm mx-auto p-4 pt-6">
        {phase === 'form' ? (
          <div className="flex flex-col items-center">
            {/* Podium */}
            <Podium
              championCode={championCode!}
              secondCode={topThree.second}
              thirdCode={topThree.third}
            />

            {/* Form */}
            <div className="w-full mt-6 space-y-3">
              {error && (
                <div className="p-3 bg-wc-red/15 border border-wc-red/30 rounded-lg text-wc-red text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block mb-1 ml-1">
                  <span className="text-xs font-semibold text-neutral-400">Name</span>
                  {nameError ? (
                    <span className="text-[10px] text-wc-red ml-1.5">({nameError})</span>
                  ) : (
                    <span className="text-[10px] text-neutral-500 ml-1.5">(this is how others see you on the leaderboard)</span>
                  )}
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(null); }}
                  placeholder="Prediction name"
                  className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/30 focus:outline-none transition-colors ${
                    nameError ? 'border-wc-red/50 focus:border-wc-red/70' : 'border-white/10 focus:border-primary/50'
                  }`}
                  autoFocus
                />
              </div>

              <div>
                <label className="block mb-1 ml-1">
                  <span className="text-xs font-semibold text-neutral-400">Email</span>
                  {emailError ? (
                    <span className="text-[10px] text-wc-red ml-1.5">({emailError})</span>
                  ) : (
                    <span className="text-[10px] text-neutral-500 ml-1.5">{"(we'll send a copy of your predictions)"}</span>
                  )}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                  placeholder="you@example.com"
                  className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/30 focus:outline-none transition-colors ${
                    emailError ? 'border-wc-red/50 focus:border-wc-red/70' : 'border-white/10 focus:border-primary/50'
                  }`}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={saving || validatingEmail}
                className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
              >
                {saving || validatingEmail ? (
                  validatingEmail ? 'Validating...' : 'Submitting...'
                ) : (
                  <>
                    <span className="material-symbols-outlined font-variation-fill">send</span>
                    Submit Prediction
                  </>
                )}
              </button>

              <button
                onClick={onDismiss}
                disabled={saving || validatingEmail}
                className="w-full py-3 bg-white/10 text-white/80 font-bold rounded-xl hover:bg-white/15 transition-colors flex items-center justify-center gap-2"
              >
                Back to Bracket
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Success icon */}
            <div className="w-16 h-16 rounded-full bg-wc-green/20 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-wc-green text-3xl font-variation-fill">check_circle</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Prediction Submitted!</h2>

            {/* Confirmation card */}
            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-4 space-y-3">
              {predictionNumber != null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Prediction</span>
                  <span className="text-sm font-bold text-primary">#{predictionNumber}</span>
                </div>
              )}

              {shareToken && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Share Token</span>
                  <span className="text-xs font-mono text-neutral-300">{shareToken}</span>
                </div>
              )}

              {shareLink && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-neutral-400">Share Link</span>
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span>
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-500 break-all font-mono">{shareLink}</p>
                </div>
              )}

              {formattedDate && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Created</span>
                  <span className="text-xs text-neutral-300">{formattedDate}</span>
                </div>
              )}

              <div>
                <span className="text-xs text-neutral-400">Confirmation sent to</span>
                {!editingConfirmEmail ? (
                  <div className="mt-1.5 flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2 border border-white/5">
                    <span className="text-sm text-white font-medium truncate">{email}</span>
                    <button
                      onClick={() => { setConfirmEmail(email); setEditingConfirmEmail(true); setResent(false); setResendError(null); }}
                      className="ml-2 shrink-0 text-[11px] text-primary font-semibold hover:text-primary/80 transition-colors"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="mt-1.5 flex gap-2">
                    <input
                      type="email"
                      value={confirmEmail}
                      onChange={(e) => { setConfirmEmail(e.target.value); setResent(false); }}
                      className="flex-1 px-3 py-2 bg-white/5 border border-primary/30 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
                      autoFocus
                    />
                    <button
                      onClick={async () => {
                        if (!confirmEmail.trim()) return;
                        setResending(true);
                        setResendError(null);
                        try {
                          const res = await fetch('/api/predictions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              resendEmail: confirmEmail.trim(),
                              shareToken,
                            }),
                          });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) {
                            setResendError(data.error ?? 'Unable to resend confirmation.');
                            return;
                          }
                          setResent(true);
                          setEmail(confirmEmail);
                          markSnapshotSubmitted(predictionSnapshot, {
                            predictionNumber,
                            shareToken,
                            createdAt,
                            email: confirmEmail.trim(),
                          });
                          setEditingConfirmEmail(false);
                        } catch {
                          setResendError('Network error. Please try again.');
                        } finally {
                          setResending(false);
                        }
                      }}
                      disabled={resending || !confirmEmail.trim()}
                      className="shrink-0 px-3 py-2 bg-primary text-black font-bold text-xs rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {resending ? '...' : 'Resend'}
                    </button>
                  </div>
                )}
                {resent && !editingConfirmEmail && (
                  <p className="text-[10px] text-wc-green mt-1">Confirmation resent!</p>
                )}
                {resendError && (
                  <p className="text-[10px] text-wc-red mt-1">{resendError}</p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="w-full mt-6 space-y-3">
              <button
                onClick={onNavigateToRanking}
                className="w-full py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">leaderboard</span>
                View Leaderboard
              </button>

              <button
                onClick={onDismiss}
                className="w-full py-3 bg-white/10 text-white/80 font-bold rounded-xl hover:bg-white/15 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
                Edit Bracket
              </button>

              {!user && otpStep !== 'done' && (
                <div className="space-y-2">
                  {otpStep === 'idle' || otpStep === 'sending' ? (
                    <>
                      {/* Benefits of signing in */}
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 mb-1 space-y-2">
                        <p className="text-[11px] font-semibold text-neutral-300 text-center uppercase tracking-wider">Why sign in?</p>
                        {[
                          { icon: 'cloud_done', text: 'Save predictions to your account' },
                          { icon: 'devices', text: 'Access from any device' },
                          { icon: 'edit', text: 'Change username and prediction name' },
                        ].map((b) => (
                          <div key={b.icon} className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary/70 text-[14px]">{b.icon}</span>
                            <span className="text-[11px] text-neutral-400">{b.text}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={async () => {
                          const targetEmail = signInEmail || email;
                          setOtpError(null);
                          setOtpStep('sending');
                          const { error } = await signIn(targetEmail);
                          if (error) {
                            setOtpError(error);
                            setOtpStep('idle');
                            return;
                          }
                          setOtpStep('sent');
                        }}
                        disabled={otpStep === 'sending'}
                        className="w-full py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/15 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-lg">login</span>
                        {otpStep === 'sending' ? 'Sending...' : 'Sign in with OTP'}
                      </button>
                      <p className="text-[10px] text-neutral-500 mt-1.5 text-center">
                        {"We'll send a 6 digit one time password to "}
                        <strong className="text-neutral-300">{signInEmail || email}</strong>
                      </p>
                      {otpError && (
                        <p className="text-[10px] text-wc-red text-center">{otpError}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-neutral-400 text-center">
                        Code sent to <strong className="text-neutral-300">{signInEmail || email}</strong>
                      </p>
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-primary/50 text-center text-2xl tracking-[0.3em] font-mono"
                        maxLength={6}
                        autoFocus
                      />
                      <button
                        onClick={async () => {
                          setOtpError(null);
                          setOtpStep('verifying');
                          const { error } = await verifyOtp(signInEmail || email, otpCode);
                          if (error) {
                            setOtpError(error);
                            setOtpStep('sent');
                            return;
                          }
                          setOtpStep('done');
                          onAuthenticated?.();
                        }}
                        disabled={otpStep === 'verifying' || otpCode.length < 6}
                        className="w-full py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/15 transition-colors disabled:opacity-50"
                      >
                        {otpStep === 'verifying' ? 'Verifying...' : 'Verify & Sign In'}
                      </button>
                      <button
                        onClick={() => { setOtpStep('idle'); setOtpCode(''); setOtpError(null); }}
                        className="w-full py-1 text-neutral-500 text-xs hover:text-neutral-300 transition-colors"
                      >
                        Use a different email
                      </button>
                      {otpError && (
                        <p className="text-[10px] text-wc-red text-center">{otpError}</p>
                      )}
                    </>
                  )}
                </div>
              )}

              {!user && otpStep === 'done' && (
                <div className="flex items-center gap-2 justify-center text-wc-green">
                  <span className="material-symbols-outlined text-lg font-variation-fill">check_circle</span>
                  <span className="text-sm font-bold">Signed in!</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" style={{ animation: 'overlay-enter 0.3s ease-out' }}>
      <div className="w-full max-w-sm mx-auto p-4 max-h-[100dvh] overflow-y-auto">
        {phase === 'form' ? (
          <div className="flex flex-col items-center" style={{ animation: 'overlay-enter 0.3s ease-out' }}>
            {/* Champion Flag */}
            <img
              src={`https://flagcdn.com/w640/${championCode!.toLowerCase()}.png`}
              alt={champion.name}
              className="w-56 h-32 object-cover rounded-md mb-4"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
            />
            <h2 className="text-2xl font-black mb-0.5 font-body">
              <span className="champion-shimmer">{champion.name}</span>
            </h2>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/25 font-semibold mb-4">
              Your Predicted Champion
            </p>

            {/* Podium */}
            <Podium
              championCode={championCode!}
              secondCode={topThree.second}
              thirdCode={topThree.third}
            />

            {/* Form */}
            <div className="w-full mt-6 space-y-3">
              {error && (
                <div className="p-3 bg-wc-red/15 border border-wc-red/30 rounded-lg text-wc-red text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block mb-1 ml-1">
                  <span className="text-xs font-semibold text-neutral-400">Name</span>
                  {nameError ? (
                    <span className="text-[10px] text-wc-red ml-1.5">({nameError})</span>
                  ) : (
                    <span className="text-[10px] text-neutral-500 ml-1.5">(this is how others see you on the leaderboard)</span>
                  )}
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(null); }}
                  placeholder="Prediction name"
                  className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/30 focus:outline-none transition-colors ${
                    nameError ? 'border-wc-red/50 focus:border-wc-red/70' : 'border-white/10 focus:border-primary/50'
                  }`}
                  autoFocus
                />
              </div>

              <div>
                <label className="block mb-1 ml-1">
                  <span className="text-xs font-semibold text-neutral-400">Email</span>
                  {emailError ? (
                    <span className="text-[10px] text-wc-red ml-1.5">({emailError})</span>
                  ) : (
                    <span className="text-[10px] text-neutral-500 ml-1.5">{"(we'll send a copy of your predictions)"}</span>
                  )}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                  placeholder="you@example.com"
                  className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/30 focus:outline-none transition-colors ${
                    emailError ? 'border-wc-red/50 focus:border-wc-red/70' : 'border-white/10 focus:border-primary/50'
                  }`}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={saving || validatingEmail}
                className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
              >
                {saving || validatingEmail ? (
                  validatingEmail ? 'Validating...' : 'Submitting...'
                ) : (
                  <>
                    <span className="material-symbols-outlined font-variation-fill">send</span>
                    Submit Prediction
                  </>
                )}
              </button>

              <button
                onClick={onDismiss}
                disabled={saving || validatingEmail}
                className="w-full py-3 bg-white/10 text-white/80 font-bold rounded-xl hover:bg-white/15 transition-colors flex items-center justify-center gap-2"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center" style={{ animation: 'overlay-enter 0.3s ease-out' }}>
            {/* Success icon */}
            <div className="w-16 h-16 rounded-full bg-wc-green/20 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-wc-green text-3xl font-variation-fill">check_circle</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Prediction Submitted!</h2>

            {/* Confirmation card */}
            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-4 space-y-3">
              {predictionNumber != null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Prediction</span>
                  <span className="text-sm font-bold text-primary">#{predictionNumber}</span>
                </div>
              )}

              {shareToken && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Share Token</span>
                  <span className="text-xs font-mono text-neutral-300">{shareToken}</span>
                </div>
              )}

              {shareLink && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-neutral-400">Share Link</span>
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span>
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-500 break-all font-mono">{shareLink}</p>
                </div>
              )}

              {formattedDate && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Created</span>
                  <span className="text-xs text-neutral-300">{formattedDate}</span>
                </div>
              )}

              <div>
                <span className="text-xs text-neutral-400">Confirmation sent to</span>
                {!editingConfirmEmail ? (
                  <div className="mt-1.5 flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2 border border-white/5">
                    <span className="text-sm text-white font-medium truncate">{email}</span>
                    <button
                      onClick={() => { setConfirmEmail(email); setEditingConfirmEmail(true); setResent(false); setResendError(null); }}
                      className="ml-2 shrink-0 text-[11px] text-primary font-semibold hover:text-primary/80 transition-colors"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="mt-1.5 flex gap-2">
                    <input
                      type="email"
                      value={confirmEmail}
                      onChange={(e) => { setConfirmEmail(e.target.value); setResent(false); }}
                      className="flex-1 px-3 py-2 bg-white/5 border border-primary/30 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
                      autoFocus
                    />
                    <button
                      onClick={async () => {
                        if (!confirmEmail.trim()) return;
                        setResending(true);
                        setResendError(null);
                        try {
                          const res = await fetch('/api/predictions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              resendEmail: confirmEmail.trim(),
                              shareToken,
                            }),
                          });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) {
                            setResendError(data.error ?? 'Unable to resend confirmation.');
                            return;
                          }
                          setResent(true);
                          setEmail(confirmEmail);
                          markSnapshotSubmitted(predictionSnapshot, {
                            predictionNumber,
                            shareToken,
                            createdAt,
                            email: confirmEmail.trim(),
                          });
                          setEditingConfirmEmail(false);
                        } catch {
                          setResendError('Network error. Please try again.');
                        } finally {
                          setResending(false);
                        }
                      }}
                      disabled={resending || !confirmEmail.trim()}
                      className="shrink-0 px-3 py-2 bg-primary text-black font-bold text-xs rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {resending ? '...' : 'Resend'}
                    </button>
                  </div>
                )}
                {resent && !editingConfirmEmail && (
                  <p className="text-[10px] text-wc-green mt-1">Confirmation resent!</p>
                )}
                {resendError && (
                  <p className="text-[10px] text-wc-red mt-1">{resendError}</p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="w-full mt-6 space-y-3">
              <button
                onClick={onNavigateToRanking}
                className="w-full py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">leaderboard</span>
                View Leaderboard
              </button>

              <button
                onClick={onDismiss}
                className="w-full py-3 bg-white/10 text-white/80 font-bold rounded-xl hover:bg-white/15 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
                Edit Bracket
              </button>

              {!user && otpStep !== 'done' && (
                <div className="space-y-2">
                  {otpStep === 'idle' || otpStep === 'sending' ? (
                    <>
                      {/* Benefits of signing in */}
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 mb-1 space-y-2">
                        <p className="text-[11px] font-semibold text-neutral-300 text-center uppercase tracking-wider">Why sign in?</p>
                        {[
                          { icon: 'cloud_done', text: 'Save predictions to your account' },
                          { icon: 'devices', text: 'Access from any device' },
                          { icon: 'edit', text: 'Change username and prediction name' },
                        ].map((b) => (
                          <div key={b.icon} className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary/70 text-[14px]">{b.icon}</span>
                            <span className="text-[11px] text-neutral-400">{b.text}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={async () => {
                          const targetEmail = signInEmail || email;
                          setOtpError(null);
                          setOtpStep('sending');
                          const { error } = await signIn(targetEmail);
                          if (error) {
                            setOtpError(error);
                            setOtpStep('idle');
                            return;
                          }
                          setOtpStep('sent');
                        }}
                        disabled={otpStep === 'sending'}
                        className="w-full py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/15 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-lg">login</span>
                        {otpStep === 'sending' ? 'Sending...' : 'Sign in with OTP'}
                      </button>
                      <p className="text-[10px] text-neutral-500 mt-1.5 text-center">
                        {"We'll send a 6 digit one time password to "}
                        <strong className="text-neutral-300">{signInEmail || email}</strong>
                      </p>
                      {otpError && (
                        <p className="text-[10px] text-wc-red text-center">{otpError}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-neutral-400 text-center">
                        Code sent to <strong className="text-neutral-300">{signInEmail || email}</strong>
                      </p>
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-primary/50 text-center text-2xl tracking-[0.3em] font-mono"
                        maxLength={6}
                        autoFocus
                      />
                      <button
                        onClick={async () => {
                          setOtpError(null);
                          setOtpStep('verifying');
                          const { error } = await verifyOtp(signInEmail || email, otpCode);
                          if (error) {
                            setOtpError(error);
                            setOtpStep('sent');
                            return;
                          }
                          setOtpStep('done');
                          onAuthenticated?.();
                        }}
                        disabled={otpStep === 'verifying' || otpCode.length < 6}
                        className="w-full py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/15 transition-colors disabled:opacity-50"
                      >
                        {otpStep === 'verifying' ? 'Verifying...' : 'Verify & Sign In'}
                      </button>
                      <button
                        onClick={() => { setOtpStep('idle'); setOtpCode(''); setOtpError(null); }}
                        className="w-full py-1 text-neutral-500 text-xs hover:text-neutral-300 transition-colors"
                      >
                        Use a different email
                      </button>
                      {otpError && (
                        <p className="text-[10px] text-wc-red text-center">{otpError}</p>
                      )}
                    </>
                  )}
                </div>
              )}

              {!user && otpStep === 'done' && (
                <div className="flex items-center gap-2 justify-center text-wc-green">
                  <span className="material-symbols-outlined text-lg font-variation-fill">check_circle</span>
                  <span className="text-sm font-bold">Signed in!</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
