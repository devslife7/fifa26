'use client';

import { useState, useEffect, useCallback } from 'react';
import type { NewsArticle } from '@/types/news';

interface UseNewsResult {
  articles: NewsArticle[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  refetch: () => void;
}

const LS_KEY = 'fifa26_news_cache';
const STALE_MS = 15 * 60 * 1000; // 15 minutes

interface CachedNews {
  articles: NewsArticle[];
  fetchedAt: number;
}

function readLocalCache(): CachedNews | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedNews;
  } catch {
    return null;
  }
}

function writeLocalCache(articles: NewsArticle[]): void {
  try {
    const data: CachedNews = { articles, fetchedAt: Date.now() };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
  }
}

export function useNews(): UseNewsResult {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const fetchData = useCallback(async (force: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const url = force ? '/api/news?force=true' : '/api/news';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const fetched: NewsArticle[] = data.articles ?? [];
      setArticles(fetched);
      setLastUpdated(Date.now());
      writeLocalCache(fetched);
    } catch {
      setError('News unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = readLocalCache();
    if (cached && cached.articles.length > 0) {
      setArticles(cached.articles);
      setLastUpdated(cached.fetchedAt);
      setLoading(false);

      // Always fetch in background to pick up fresh data
      fetchData(false);
    } else {
      fetchData(false);
    }
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return { articles, loading, error, lastUpdated, refetch };
}
