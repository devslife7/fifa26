'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNews } from '@/hooks/useNews';
import type { NewsArticle } from '@/types/news';

type TopicId = 'all' | 'fifa2026' | 'teams' | 'hosts' | 'fixtures' | 'injuries' | 'transfers';

interface Topic {
  id: TopicId;
  label: string;
  terms: string[];
}

const TOPICS: Topic[] = [
  { id: 'all', label: 'All', terms: [] },
  { id: 'fifa2026', label: 'FIFA 2026', terms: ['fifa world cup 2026', 'world cup 2026', '2026 world cup', 'fifa 2026'] },
  { id: 'teams', label: 'Teams', terms: ['team', 'squad', 'roster', 'lineup', 'qualified', 'qualifying', 'coach', 'manager'] },
  { id: 'hosts', label: 'Hosts', terms: ['host', 'united states', 'usa', 'canada', 'mexico', 'city', 'stadium'] },
  { id: 'fixtures', label: 'Fixtures', terms: ['fixture', 'fixtures', 'schedule', 'match', 'draw', 'group'] },
  { id: 'injuries', label: 'Injuries', terms: ['injury', 'injured', 'fitness', 'return', 'medical'] },
  { id: 'transfers', label: 'Transfers', terms: ['transfer', 'signing', 'loan', 'contract', 'club'] },
];

const SOURCE_LINKS = [
  { label: 'FIFA', url: 'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026' },
  { label: 'ESPN FC', url: 'https://www.espn.com/soccer/' },
  { label: 'BBC Sport', url: 'https://www.bbc.com/sport/football' },
  { label: 'The Athletic', url: 'https://www.nytimes.com/athletic/football/' },
];

interface NewsRefreshEventDetail {
  done?: () => void;
}

function articleText(article: NewsArticle): string {
  return `${article.title} ${article.description} ${article.source}`.toLowerCase();
}

function matchesTopic(article: NewsArticle, topic: Topic): boolean {
  if (topic.id === 'all') return true;
  const text = articleText(article);
  return topic.terms.some(term => text.includes(term));
}

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
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}

function SourceMeta({ article, read }: { article: NewsArticle; read: boolean }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="max-w-[9rem] truncate text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/15 px-2 py-0.5 rounded-full">
        {article.source || 'News'}
      </span>
      <span className="text-[10px] text-neutral-500 flex-shrink-0">{timeAgo(article.published_at)}</span>
      {read && (
        <span className="flex items-center gap-1 text-[10px] text-neutral-500 flex-shrink-0">
          <span className="material-symbols-outlined text-[13px]">done</span>
          Read
        </span>
      )}
    </div>
  );
}

function HeroArticle({
  article,
  read,
  onOpen,
}: {
  article: NewsArticle;
  read: boolean;
  onOpen: (article: NewsArticle) => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noreferrer"
      onClick={() => onOpen(article)}
      className={`block w-full text-left rounded-2xl overflow-hidden border group animate-fade-in active:scale-[0.99] transition-all duration-150 ${
        read ? 'border-white/5 opacity-70' : 'border-white/10 hover:border-white/20'
      }`}
    >
      <div className="relative w-full aspect-[16/9] bg-neutral-800">
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
        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/55 backdrop-blur flex items-center justify-center">
          <span className="material-symbols-outlined text-[17px] text-white">open_in_new</span>
        </div>
      </div>
      <div className="p-4">
        <SourceMeta article={article} read={read} />
        <h2 className="text-base font-bold text-white leading-snug mt-2 group-hover:text-primary transition-colors">
          {article.title}
        </h2>
        {article.description && (
          <p className="text-xs text-neutral-400 leading-relaxed mt-2 max-h-12 overflow-hidden">
            {article.description}
          </p>
        )}
      </div>
    </a>
  );
}

function StoryRow({
  article,
  index,
  read,
  onOpen,
}: {
  article: NewsArticle;
  index: number;
  read: boolean;
  onOpen: (article: NewsArticle) => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noreferrer"
      onClick={() => onOpen(article)}
      className={`w-full flex items-center gap-3 rounded-2xl border text-left group animate-fade-in overflow-hidden p-3 active:scale-[0.99] transition-all duration-150 ${
        read ? 'border-white/5 opacity-65' : 'border-white/10 hover:border-white/20'
      }`}
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms`, animationFillMode: 'both' }}
    >
      <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-neutral-800">
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
            <span className="material-symbols-outlined text-2xl text-neutral-600">newspaper</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <SourceMeta article={article} read={read} />
        <h3 className="text-sm font-semibold text-white leading-snug mt-1.5 group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        {article.description && (
          <p className="text-xs text-neutral-500 leading-relaxed mt-1 max-h-8 overflow-hidden">
            {article.description}
          </p>
        )}
      </div>
      <span className="material-symbols-outlined text-[17px] text-neutral-600 group-hover:text-primary flex-shrink-0">
        open_in_new
      </span>
    </a>
  );
}

function TopicTabs({
  activeTopic,
  counts,
  onChange,
}: {
  activeTopic: TopicId;
  counts: Record<TopicId, number>;
  onChange: (topic: TopicId) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-3 px-3">
      {TOPICS.map(topic => {
        const active = activeTopic === topic.id;
        return (
          <button
            key={topic.id}
            onClick={() => onChange(topic.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold transition-colors ${
              active
                ? 'bg-primary text-black border-primary'
                : 'border-white/10 text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            {topic.label}
            {counts[topic.id] > 0 && (
              <span className={active ? 'text-black/60' : 'text-neutral-600'}>{counts[topic.id]}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SourceFallback() {
  return (
    <div className="rounded-2xl border border-white/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[18px] text-primary">travel_explore</span>
        <h2 className="text-sm font-bold text-white">Trusted sources</h2>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {SOURCE_LINKS.map(source => (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-neutral-300 hover:text-primary hover:border-white/20 transition-colors"
          >
            <span className="truncate">{source.label}</span>
            <span className="material-symbols-outlined text-[15px]">open_in_new</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function SkeletonHero() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 animate-pulse">
      <div className="aspect-[16/9] bg-neutral-800" />
      <div className="p-4 flex flex-col gap-2">
        <div className="h-3 bg-neutral-800 rounded w-1/3" />
        <div className="h-4 bg-neutral-800 rounded w-full" />
        <div className="h-4 bg-neutral-800 rounded w-3/4" />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="rounded-2xl border border-white/10 animate-pulse overflow-hidden p-3 flex gap-3">
      <div className="w-20 h-20 bg-neutral-800 rounded-xl" />
      <div className="flex-1 py-1 flex flex-col gap-2">
        <div className="h-2.5 bg-neutral-800 rounded w-1/3" />
        <div className="h-3.5 bg-neutral-800 rounded w-full" />
        <div className="h-3.5 bg-neutral-800 rounded w-2/3" />
      </div>
    </div>
  );
}

export default function NewsView() {
  const { articles, loading, error, lastUpdated, isStale, readUrls, markRead, refetch } = useNews();
  const [activeTopic, setActiveTopic] = useState<TopicId>('all');

  useEffect(() => {
    const onRefresh = (event: Event) => {
      const detail = (event as CustomEvent<NewsRefreshEventDetail>).detail;
      void refetch().finally(() => detail?.done?.());
    };
    window.addEventListener('news:refresh', onRefresh);
    return () => window.removeEventListener('news:refresh', onRefresh);
  }, [refetch]);

  const counts = useMemo(() => {
    return TOPICS.reduce((acc, topic) => {
      acc[topic.id] = articles.filter(article => matchesTopic(article, topic)).length;
      return acc;
    }, {} as Record<TopicId, number>);
  }, [articles]);

  const activeTopicConfig = TOPICS.find(topic => topic.id === activeTopic) ?? TOPICS[0];
  const filteredArticles = useMemo(() => {
    return articles.filter(article => matchesTopic(article, activeTopicConfig));
  }, [activeTopicConfig, articles]);

  const isBackgroundRefreshing = loading && articles.length > 0;
  const isEmpty = !loading && !error && articles.length === 0;
  const hero = filteredArticles[0];
  const storyRows = filteredArticles.slice(1);

  return (
    <div className="pt-3 pb-4">
      <div className="sticky top-0 z-20 bg-background-dark/85 backdrop-blur-md py-3 mb-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">News</h1>
            {lastUpdated && (
              <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider mt-0.5">
                {updatedAgo(lastUpdated)}
              </p>
            )}
          </div>
          <button
            onClick={refetch}
            disabled={isBackgroundRefreshing}
            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-neutral-400 hover:text-primary hover:border-white/20 disabled:opacity-50 active:scale-95 transition-all"
            aria-label="Refresh news"
          >
            <span className={`material-symbols-outlined text-[18px] ${isBackgroundRefreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>
        </div>
        {articles.length > 0 && (
          <div className="mt-3">
            <TopicTabs activeTopic={activeTopic} counts={counts} onChange={setActiveTopic} />
          </div>
        )}
      </div>

      {isStale && articles.length > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-wc-amber/25 bg-wc-amber/10 px-3 py-2">
          <span className="material-symbols-outlined text-[16px] text-wc-amber">schedule</span>
          <span className="text-[11px] font-semibold text-wc-amber">Showing saved news</span>
        </div>
      )}

      {loading && articles.length === 0 && (
        <div className="space-y-3">
          <SkeletonHero />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}

      {error && articles.length === 0 && (
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <span className="material-symbols-outlined text-4xl text-neutral-600 mb-3">cloud_off</span>
            <p className="text-sm text-neutral-400 mb-4">{error}</p>
            <button
              onClick={refetch}
              className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
            >
              Try again
            </button>
          </div>
          <SourceFallback />
        </div>
      )}

      {isEmpty && (
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <span className="material-symbols-outlined text-4xl text-neutral-600 mb-3">newspaper</span>
            <p className="text-sm text-neutral-400">No live stories available</p>
          </div>
          <SourceFallback />
        </div>
      )}

      {articles.length > 0 && filteredArticles.length === 0 && (
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <span className="material-symbols-outlined text-4xl text-neutral-600 mb-3">filter_alt_off</span>
            <p className="text-sm text-neutral-400">No {activeTopicConfig.label.toLowerCase()} stories right now</p>
          </div>
          <SourceFallback />
        </div>
      )}

      {filteredArticles.length > 0 && (
        <div className="space-y-3">
          <HeroArticle article={hero} read={readUrls.has(hero.url)} onOpen={markRead} />
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Latest</span>
            <span className="text-[10px] text-neutral-600">{filteredArticles.length} stories</span>
          </div>
          {storyRows.map((article, i) => (
            <StoryRow
              key={article.uuid}
              article={article}
              index={i + 1}
              read={readUrls.has(article.url)}
              onOpen={markRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}
