'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import type { SavedPrediction } from '@/types';

interface UseActivePredictionResult {
  prediction: SavedPrediction | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches the signed-in user's saved predictions and exposes the one flagged
 * `is_active` (falls back to the most recent if none is explicitly active).
 * Returns `null` when not signed in.
 */
export function useActivePrediction(): UseActivePredictionResult {
  const { user } = useAuth();
  const [prediction, setPrediction] = useState<SavedPrediction | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(user));
  const [error, setError] = useState<string | null>(null);

  const fetchActive = useCallback(async () => {
    if (!user) {
      setPrediction(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/predictions');
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      const predictions: SavedPrediction[] = data.predictions ?? [];
      const active = predictions.find(p => p.is_active) ?? predictions[0] ?? null;
      setPrediction(active);
      setError(null);
    } catch {
      setError('Unable to load your prediction.');
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  return { prediction, loading, error, refetch: fetchActive };
}
