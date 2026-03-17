'use client';

import { useState } from 'react';
import { useNews } from '@/hooks/useNews';
import type { NewsArticle } from '@/types/news';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return '';
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function updatedAgo(ts: number | null): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Updated just now';
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `Updated ${hours}h ago`;
}

function HeroArticle({ article }: { article: NewsArticle }) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={() => window.open(article.url, '_blank')}
      className="w-full text-left rounded-2xl overflow-hidden border border-white/10 group animate-fade-in"
    >
      <div className="w-full aspect-[16/9]">
        {article.image_url && !imgError ? (
          <img
            src={article.image_url}
            alt={article.title}
            loading="eager"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-neutral-600">newspaper</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/15 px-2 py-0.5 rounded-full">
            {article.source}
          </span>
          <span className="text-[10px] text-neutral-400">{timeAgo(article.published_at)}</span>
        </div>
        <h2 className="text-base font-bold text-white leading-snug">
          {article.title}
        </h2>
        {article.description && (
          <p className="text-xs text-neutral-400 leading-relaxed mt-2">
            {article.description}
          </p>
        )}
      </div>
    </button>
  );
}

function ArticleCard({ article, index }: { article: NewsArticle; index: number }) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={() => window.open(article.url, '_blank')}
      className="w-full rounded-2xl border border-white/10 text-left group animate-fade-in overflow-hidden"
      style={{ animationDelay: `${(index + 1) * 80}ms`, animationFillMode: 'both' }}
    >
      {/* Image banner */}
      <div className="w-full aspect-[2/1] bg-neutral-800">
        {article.image_url && !imgError ? (
          <img
            src={article.image_url}
            alt={article.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
            <span className="material-symbols-outlined text-3xl text-neutral-600">newspaper</span>
          </div>
        )}
      </div>
      {/* Content */}
      <div className="p-3 flex flex-col gap-1.5">
        <h3 className="text-sm font-semibold text-white leading-snug line-clamp-none">
          {article.title}
        </h3>
        {article.description && (
          <p className="text-xs text-neutral-400 leading-relaxed line-clamp-none">
            {article.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">{article.source}</span>
          <span className="text-[10px] text-neutral-600">·</span>
          <span className="text-[10px] text-neutral-500">{timeAgo(article.published_at)}</span>
        </div>
      </div>
    </button>
  );
}

function SkeletonHero() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 animate-pulse">
      <div className="aspect-[16/9] bg-neutral-800" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/10 animate-pulse overflow-hidden">
      <div className="w-full aspect-[2/1] bg-neutral-800" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-3.5 bg-neutral-800 rounded w-full" />
        <div className="h-3.5 bg-neutral-800 rounded w-3/4" />
        <div className="h-2.5 bg-neutral-800 rounded w-1/3" />
      </div>
    </div>
  );
}

export default function NewsView() {
  const { articles, loading, error, lastUpdated, refetch } = useNews();

  const isEmpty = !loading && !error && articles.length === 0;
  const hero = articles[0];
  const rest = articles.slice(1);

  return (
    <div className="pt-3 pb-4">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background-dark/80 backdrop-blur-md -mx-3 sm:-mx-4 px-3 sm:px-4 py-3 mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">News</h1>
          {lastUpdated && (
            <span className="text-[10px] text-neutral-500">{updatedAgo(lastUpdated)}</span>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && articles.length === 0 && (
        <div className="space-y-3">
          <SkeletonHero />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Error state */}
      {error && articles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-4xl text-neutral-600 mb-3">cloud_off</span>
          <p className="text-sm text-neutral-400 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-4xl text-neutral-600 mb-3">newspaper</span>
          <p className="text-sm text-neutral-400">No news available</p>
        </div>
      )}

      {/* Articles */}
      {articles.length > 0 && (
        <div className="space-y-3">
          <HeroArticle article={hero} />
          {rest.map((article, i) => (
            <ArticleCard key={article.uuid} article={article} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
