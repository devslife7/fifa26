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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseArticles(data: any[]): NewsArticle[] {
  return data.map((item: Record<string, unknown>) => ({
    uuid: item.uuid as string,
    title: item.title as string,
    description: (item.description ?? '') as string,
    url: item.url as string,
    image_url: (item.image_url as string) ?? null,
    source: (item.source as string) ?? '',
    published_at: (item.published_at as string) ?? '',
  }));
}

async function fetchPage(search: string, page: number): Promise<{ articles: NewsArticle[]; nextPage: string | null }> {
  const apiKey = getApiKey();
  if (!apiKey) return { articles: [], nextPage: null };

  const params = new URLSearchParams({
    api_token: apiKey,
    search,
    categories: 'sports',
    language: 'en',
    limit: '3',
    page: String(page),
  });

  const res = await fetch(`${BASE_URL}?${params}`, { cache: 'no-store' });
  if (!res.ok) return { articles: [], nextPage: null };

  const json = await res.json();
  const articles = parseArticles(json.data ?? []);
  const nextPage: string | null = json.meta?.found > page * 3 ? String(page + 1) : null;
  return { articles, nextPage };
}

const TOTAL_PAGES = 3; // 3 pages × 3 articles = up to 9 articles per cache cycle

async function fetchFromApi(search: string): Promise<NewsArticle[]> {
  const all: NewsArticle[] = [];
  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const { articles, nextPage } = await fetchPage(search, page);
    all.push(...articles);
    if (!nextPage) break;
  }
  return all;
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
