import type { NewsArticle } from '@/types/news';

const BASE_URL = 'https://api.thenewsapi.com/v1/news/all';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// --- In-memory cache with TTL ---
interface CacheEntry {
  data: NewsArticle[];
  fetchedAt: number;
}

let cache: CacheEntry | null = null;

function getCached(): NewsArticle[] | null {
  if (!cache) return null;
  if (Date.now() - cache.fetchedAt > CACHE_TTL) return null;
  return cache.data;
}

function setCache(data: NewsArticle[]): void {
  cache = { data, fetchedAt: Date.now() };
}

// --- In-flight deduplication ---
let inflight: Promise<NewsArticle[]> | null = null;

function getApiKey(): string | undefined {
  return process.env.NEWS_API_KEY;
}

const STRONG_TERMS = [
  'fifa world cup 2026',
  'world cup 2026',
  '2026 world cup',
  'fifa 2026',
];

const RELEVANCE_TERMS = [
  'fifa',
  'world cup',
  '2026',
  'draw',
  'fixture',
  'fixtures',
  'qualifying',
  'qualified',
  'squad',
  'roster',
  'injury',
  'host city',
  'host cities',
  'united states',
  'canada',
  'mexico',
  'usa',
  'concacaf',
  'uefa',
  'conmebol',
  'afc',
  'caf',
];

const LOW_SIGNAL_TERMS = [
  'club world cup',
  'women',
  'fifae',
  'video game',
  'efootball',
];

function getArticleText(article: NewsArticle): string {
  return `${article.title} ${article.description} ${article.source}`.toLowerCase();
}

function scoreArticle(article: NewsArticle): number {
  const text = getArticleText(article);
  const publishedAt = new Date(article.published_at).getTime();
  const ageHours = Number.isFinite(publishedAt) ? Math.max(0, (Date.now() - publishedAt) / 36e5) : 168;
  const recencyScore = Math.max(0, 28 - ageHours / 6);

  const strongScore = STRONG_TERMS.reduce((score, term) => score + (text.includes(term) ? 20 : 0), 0);
  const relevanceScore = RELEVANCE_TERMS.reduce((score, term) => score + (text.includes(term) ? 4 : 0), 0);
  const lowSignalPenalty = LOW_SIGNAL_TERMS.reduce((score, term) => score + (text.includes(term) ? 14 : 0), 0);
  const imageScore = article.image_url ? 4 : 0;

  return strongScore + relevanceScore + recencyScore + imageScore - lowSignalPenalty;
}

function hasWorldCupSignal(article: NewsArticle): boolean {
  const text = getArticleText(article);
  const strongMatches = STRONG_TERMS.some(term => text.includes(term));
  const relevanceMatches = RELEVANCE_TERMS.filter(term => text.includes(term)).length;
  return strongMatches || relevanceMatches >= 2;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

function rankAndDedupeArticles(articles: NewsArticle[]): NewsArticle[] {
  const byUrl = new Map<string, NewsArticle>();

  for (const article of articles) {
    if (!article.title || !article.url) continue;
    const key = normalizeUrl(article.url);
    const existing = byUrl.get(key);
    if (!existing || scoreArticle(article) > scoreArticle(existing)) {
      byUrl.set(key, article);
    }
  }

  return Array.from(byUrl.values())
    .filter(article => hasWorldCupSignal(article) && scoreArticle(article) >= 8)
    .sort((a, b) => {
      const scoreDiff = scoreArticle(b) - scoreArticle(a);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    })
    .slice(0, 12);
}

function parseArticles(data: unknown[]): NewsArticle[] {
  return data.map(raw => {
    const item = raw as Record<string, unknown>;
    return {
      uuid: item.uuid as string,
      title: item.title as string,
      description: (item.description ?? '') as string,
      url: item.url as string,
      image_url: (item.image_url as string) ?? null,
      source: (item.source as string) ?? '',
      published_at: (item.published_at as string) ?? '',
    };
  }).filter(article => Boolean(article.uuid && article.title && article.url));
}

// Free tier caps at 3 results per request, so we fetch multiple pages in parallel
const TOTAL_PAGES = 4; // 4 pages × 3 articles = 12 articles before ranking

async function fetchPage(search: string, page: number): Promise<NewsArticle[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const params = new URLSearchParams({
    api_token: apiKey,
    search,
    categories: 'sports',
    language: 'en',
    sort: 'published_at',
    published_after: sevenDaysAgo,
    limit: '3',
    page: String(page),
  });

  const res = await fetch(`${BASE_URL}?${params}`, { cache: 'no-store' });
  if (!res.ok) return [];

  const json = await res.json();
  return parseArticles(json.data ?? []);
}

async function fetchFromApi(search: string): Promise<NewsArticle[]> {
  const pages = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);
  const results = await Promise.all(pages.map(p => fetchPage(search, p)));
  return results.flat();
}

export async function fetchNewsArticles(force = false): Promise<NewsArticle[]> {
  if (!force) {
    const cached = getCached();
    if (cached) return cached;
  }

  // Deduplicate in-flight requests
  if (inflight) return inflight;

  const promise = (async (): Promise<NewsArticle[]> => {
    try {
      let articles = await fetchFromApi('"FIFA World Cup 2026"');

      // Fallback query if primary returns no results
      if (articles.length === 0) {
        articles = await fetchFromApi('FIFA 2026 OR "World Cup 2026"');
      }

      articles = rankAndDedupeArticles(articles);
      setCache(articles);
      return articles;
    } catch {
      return [];
    } finally {
      inflight = null;
    }
  })();

  inflight = promise;
  return promise;
}
