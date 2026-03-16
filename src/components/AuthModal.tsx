'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';

interface Props {
  onClose: () => void;
  onAuthenticated: () => void;
}

export default function AuthModal({ onClose, onAuthenticated }: Props) {
  const { signIn, verifyOtp } = useAuth();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'otp') {
      otpInputRef.current?.focus();
    }
  }, [step]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    const { error } = await signIn(email);
    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    setStep('otp');
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) return;

    setLoading(true);
    setError(null);

    const { error } = await verifyOtp(email, otpCode);
    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    setLoading(false);
    onAuthenticated();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-background-dark p-6 text-center">
          <img src="/images/fifa_logo.svg" alt="FIFA World Cup 2026" className="w-12 h-12 mb-2 mx-auto" />
          <h2 className="text-white text-xl font-bold">
            {step === 'email' ? 'Sign In to Save' : 'Enter Code'}
          </h2>
          <p className="text-neutral-400 text-sm mt-1">
            {step === 'email'
              ? 'We\'ll send you a verification code'
              : `Code sent to ${email}`}
          </p>
        </div>

        {/* Form */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-wc-red/15 border border-wc-red/30 rounded-lg text-wc-red text-sm">
              {error}
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-white/15 bg-white/5 text-white placeholder-neutral-500 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-base"
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Verification Code</label>
                <input
                  ref={otpInputRef}
                  type="text"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 rounded-xl border border-white/15 bg-white/5 text-white placeholder-neutral-500 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-center text-2xl tracking-[0.3em] font-mono"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Save'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('email'); setOtpCode(''); setError(null); }}
                className="w-full py-2 text-neutral-500 text-sm hover:text-neutral-300 transition-colors"
              >
                Use a different email
              </button>
            </form>
          )}

          <button
            onClick={onClose}
            className="w-full mt-3 py-2 text-neutral-500 text-sm hover:text-neutral-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
