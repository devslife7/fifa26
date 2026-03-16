'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export interface AppUser {
  id: string;
  email: string;
  display_name: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, displayName: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, displayName: string) => {
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Failed to send code' };
      return { error: null };
    } catch {
      return { error: 'Network error' };
    }
  }, []);

  const verifyOtp = useCallback(async (email: string, code: string) => {
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Verification failed' };
      setUser(data.user);
      return { error: null };
    } catch {
      return { error: 'Network error' };
    }
  }, []);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' });
    setUser(null);
  }, []);

  const updateDisplayName = useCallback(async (name: string) => {
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Failed to update' };
      setUser(data.user);
      return { error: null };
    } catch {
      return { error: 'Network error' };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, verifyOtp, signOut, updateDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
