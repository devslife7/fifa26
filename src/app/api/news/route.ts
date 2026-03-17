import { NextRequest, NextResponse } from 'next/server';
import { fetchNewsArticles } from '@/lib/services/news-api';

const CACHE_HEADERS = { 'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800' };

export async function GET(request: NextRequest) {
  const force = request.nextUrl.searchParams.get('force') === 'true';

  try {
    const articles = await fetchNewsArticles(force);
    return NextResponse.json(
      { articles, fetchedAt: Date.now() },
      { headers: CACHE_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { articles: [], fetchedAt: Date.now(), error: 'unavailable' },
      { status: 200, headers: CACHE_HEADERS },
    );
  }
}
