'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { NewsArticle } from '@/types/news';

interface UseNewsResult {
  articles: NewsArticle[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  isStale: boolean;
  readUrls: Set<string>;
  markRead: (article: NewsArticle) => void;
  refetch: () => Promise<void>;
}

const LS_KEY = 'fifa26_news_cache';
const READ_KEY = 'fifa26_news_read_urls';
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

function readReadUrls(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const urls = JSON.parse(raw);
    return Array.isArray(urls) ? new Set(urls.filter((url): url is string => typeof url === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function writeReadUrls(urls: Set<string>): void {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(Array.from(urls).slice(-200)));
  } catch {
    // localStorage full or unavailable
  }
}

export function useNews(): UseNewsResult {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [readUrls, setReadUrls] = useState<Set<string>>(() => new Set());
  const articlesRef = useRef<NewsArticle[]>([]);

  const fetchData = useCallback(async (force: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const url = force ? '/api/news?force=true' : '/api/news';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const fetched: NewsArticle[] = data.articles ?? [];
      if (fetched.length === 0 && articlesRef.current.length > 0) {
        setIsStale(true);
        return;
      }
      setArticles(fetched);
      articlesRef.current = fetched;
      setLastUpdated(Date.now());
      setIsStale(false);
      writeLocalCache(fetched);
    } catch {
      setError('News unavailable');
      setIsStale(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = readLocalCache();
    setReadUrls(readReadUrls());
    if (cached && cached.articles.length > 0) {
      setArticles(cached.articles);
      articlesRef.current = cached.articles;
      setLastUpdated(cached.fetchedAt);
      setIsStale(Date.now() - cached.fetchedAt > STALE_MS);
      setLoading(false);

      // Always fetch in background to pick up fresh data
      fetchData(false);
    } else {
      fetchData(false);
    }
  }, [fetchData]);

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const markRead = useCallback((article: NewsArticle) => {
    setReadUrls(prev => {
      const next = new Set(prev);
      next.add(article.url);
      writeReadUrls(next);
      return next;
    });
  }, []);

  return { articles, loading, error, lastUpdated, isStale, readUrls, markRead, refetch };
}
