export interface NewsArticle {
  uuid: string;
  title: string;
  description: string;
  url: string;
  image_url: string | null;
  source: string;
  published_at: string; // ISO 8601
}

export interface NewsResponse {
  articles: NewsArticle[];
  fetchedAt: number;
  error?: string;
}
