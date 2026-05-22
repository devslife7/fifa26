'use client';

import { useState, useCallback } from 'react';
import FakeResultsSeeder from '@/components/admin/FakeResultsSeeder';

interface AdminPrediction {
  id: string;
  prediction_number: number | null;
  user_id: string;
  submitter_name: string | null;
  submitter_email: string | null;
  champion_code: string | null;
  is_approved: boolean;
  is_active: boolean;
  is_complete: boolean;
  completed_at: string | null;
  created_at: string;
  profiles: { display_name: string; email: string } | null;
}

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [predictions, setPredictions] = useState<AdminPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchPredictions = useCallback(async (adminSecret: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/predictions', {
        headers: { 'x-admin-secret': adminSecret },
      });
      if (!res.ok) throw new Error('Unauthorized');
      const data = await res.json();
      setPredictions(data.predictions ?? []);
    } catch {
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/predictions', {
        headers: { 'x-admin-secret': secret },
      });
      if (!res.ok) {
        setAuthError('Invalid admin secret');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setPredictions(data.predictions ?? []);
      setAuthenticated(true);
    } catch {
      setAuthError('Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  const toggleApproval = async (id: string, currentlyApproved: boolean) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/predictions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret,
        },
        body: JSON.stringify({ is_approved: !currentlyApproved }),
      });
      if (res.ok) {
        setPredictions(prev =>
          prev.map(p => p.id === id ? { ...p, is_approved: !currentlyApproved } : p)
        );
      }
    } finally {
      setActionLoading(null);
    }
  };

  const deletePrediction = async (id: string) => {
    setActionLoading(id);
    setDeleteConfirm(null);
    try {
      const res = await fetch(`/api/admin/predictions/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-secret': secret },
      });
      if (res.ok) {
        setPredictions(prev => prev.filter(p => p.id !== id));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const getName = (p: AdminPrediction) =>
    p.submitter_name || p.profiles?.display_name || 'Unknown';

  const getEmail = (p: AdminPrediction) =>
    p.submitter_email || p.profiles?.email || '—';

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Password gate
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <div className="text-center mb-6">
            <span className="material-symbols-outlined text-primary text-4xl font-variation-fill">admin_panel_settings</span>
            <h1 className="text-2xl font-bold text-white mt-2">Admin Access</h1>
            <p className="text-neutral-400 text-sm mt-1">Enter admin secret to continue</p>
          </div>

          <input
            type="password"
            value={secret}
            onChange={e => { setSecret(e.target.value); setAuthError(''); }}
            placeholder="Admin secret"
            className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-primary/50 transition-colors"
            autoFocus
          />

          {authError && (
            <p className="text-wc-red text-sm text-center">{authError}</p>
          )}

          <button
            type="submit"
            disabled={loading || !secret}
            className="w-full py-3 rounded-xl bg-primary text-black font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Enter'}
          </button>
        </form>
      </div>
    );
  }

  // Admin dashboard
  const approvedCount = predictions.filter(p => p.is_approved).length;
  const pendingCount = predictions.filter(p => !p.is_approved).length;

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background-dark/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="material-symbols-outlined text-primary text-xl sm:text-2xl font-variation-fill">admin_panel_settings</span>
              <h1 className="text-lg sm:text-xl font-bold text-white">Admin</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                <span className="text-wc-green font-bold">{approvedCount}</span>
                <span className="text-neutral-500">/</span>
                <span className="text-wc-amber font-bold">{pendingCount}</span>
                <span className="text-neutral-500">/</span>
                <span className="text-neutral-400">{predictions.length}</span>
              </div>
              <button
                onClick={() => fetchPredictions(secret)}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-white/5 transition-colors text-neutral-400 hover:text-white"
                title="Refresh"
              >
                <span className="material-symbols-outlined text-lg sm:text-xl">refresh</span>
              </button>
            </div>
          </div>
          {/* Legend visible only on mobile */}
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-neutral-500 sm:hidden">
            <span><span className="text-wc-green">Approved</span> / <span className="text-wc-amber">Pending</span> / Total</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <FakeResultsSeeder adminSecret={secret} />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <img src="/images/fifa_logo.svg" alt="FIFA World Cup 2026" className="w-12 h-12 animate-trophy-glow" />
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-center py-20 text-neutral-400">
            <span className="material-symbols-outlined text-5xl mb-3 block">inbox</span>
            <p>No complete predictions yet</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block space-y-2">
              <div className="grid grid-cols-[60px_1fr_1fr_120px_100px_100px_140px] gap-3 px-4 py-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                <div>#</div>
                <div>Name</div>
                <div>Email</div>
                <div>Champion</div>
                <div>Status</div>
                <div>Active</div>
                <div>Actions</div>
              </div>

              {predictions.map(p => (
                <div
                  key={p.id}
                  className="grid grid-cols-[60px_1fr_1fr_120px_100px_100px_140px] gap-3 px-4 py-3 rounded-xl border border-white/10 bg-neutral-900 items-center"
                >
                  <div className="text-neutral-400 font-mono">
                    {p.prediction_number ?? '—'}
                  </div>
                  <div className="font-semibold text-sm text-white truncate">
                    {getName(p)}
                  </div>
                  <div className="text-sm text-neutral-400 truncate">
                    {getEmail(p)}
                  </div>
                  <div className="text-sm text-neutral-300">
                    {p.champion_code ?? '—'}
                  </div>
                  <div>
                    {p.is_approved ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-wc-green/15 text-wc-green">
                        <span className="material-symbols-outlined text-[12px] font-variation-fill">check_circle</span>
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-wc-amber/15 text-wc-amber">
                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                        Pending
                      </span>
                    )}
                  </div>
                  <div>
                    {p.is_active ? (
                      <span className="text-[10px] font-bold text-wc-green">Active</span>
                    ) : (
                      <span className="text-[10px] font-bold text-neutral-500">Inactive</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleApproval(p.id, p.is_approved)}
                      disabled={actionLoading === p.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                        p.is_approved
                          ? 'bg-wc-amber/15 text-wc-amber hover:bg-wc-amber/25'
                          : 'bg-wc-green/15 text-wc-green hover:bg-wc-green/25'
                      }`}
                    >
                      {p.is_approved ? 'Reject' : 'Approve'}
                    </button>
                    {deleteConfirm === p.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deletePrediction(p.id)}
                          disabled={actionLoading === p.id}
                          className="px-2 py-1.5 rounded-lg text-xs font-bold bg-wc-red/15 text-wc-red hover:bg-wc-red/25 transition-colors disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1.5 rounded-lg text-xs font-bold text-neutral-400 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(p.id)}
                        disabled={actionLoading === p.id}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-wc-red hover:bg-wc-red/10 transition-colors disabled:opacity-50"
                        title="Delete prediction"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {predictions.map(p => (
                <div
                  key={p.id}
                  className="rounded-xl border border-white/10 bg-neutral-900 p-4"
                >
                  {/* Top row: number + name + badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-grow">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500 font-mono text-xs shrink-0">#{p.prediction_number ?? '—'}</span>
                        <span className="font-semibold text-sm text-white truncate">{getName(p)}</span>
                      </div>
                      <div className="text-xs text-neutral-400 truncate mt-0.5">{getEmail(p)}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {p.is_approved ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-wc-green/15 text-wc-green">
                          <span className="material-symbols-outlined text-[12px] font-variation-fill">check_circle</span>
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-wc-amber/15 text-wc-amber">
                          <span className="material-symbols-outlined text-[12px]">schedule</span>
                          Pending
                        </span>
                      )}
                      {!p.is_active && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-500">Inactive</span>
                      )}
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 mt-2.5 text-xs text-neutral-500">
                    {p.champion_code && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">emoji_events</span>
                        {p.champion_code}
                      </span>
                    )}
                    {p.completed_at && (
                      <span>{formatDate(p.completed_at)}</span>
                    )}
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                    <button
                      onClick={() => toggleApproval(p.id, p.is_approved)}
                      disabled={actionLoading === p.id}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                        p.is_approved
                          ? 'bg-wc-amber/15 text-wc-amber active:bg-wc-amber/25'
                          : 'bg-wc-green/15 text-wc-green active:bg-wc-green/25'
                      }`}
                    >
                      {p.is_approved ? 'Reject' : 'Approve'}
                    </button>

                    {deleteConfirm === p.id ? (
                      <>
                        <button
                          onClick={() => deletePrediction(p.id)}
                          disabled={actionLoading === p.id}
                          className="flex-1 py-2 rounded-lg text-xs font-bold bg-wc-red/15 text-wc-red active:bg-wc-red/25 transition-colors disabled:opacity-50"
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="py-2 px-3 rounded-lg text-xs font-bold text-neutral-400 active:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(p.id)}
                        disabled={actionLoading === p.id}
                        className="py-2 px-3 rounded-lg text-neutral-500 active:text-wc-red active:bg-wc-red/10 transition-colors disabled:opacity-50"
                        title="Delete prediction"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
