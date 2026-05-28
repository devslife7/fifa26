'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import type { SavedPrediction } from '@/types';

interface UseLatestPredictionResult {
  prediction: SavedPrediction | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLatestPrediction(): UseLatestPredictionResult {
  const { user } = useAuth();
  const [prediction, setPrediction] = useState<SavedPrediction | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(user));
  const [error, setError] = useState<string | null>(null);

  const fetchLatest = useCallback(async () => {
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
      const latest = predictions.find(p => p.is_complete) ?? predictions[0] ?? null;
      setPrediction(latest);
      setError(null);
    } catch {
      setError('Unable to load your prediction.');
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  return { prediction, loading, error, refetch: fetchLatest };
}
