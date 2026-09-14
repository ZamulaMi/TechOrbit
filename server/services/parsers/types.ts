export type ContentBlockType =
  | 'paragraph'
  | 'heading'
  | 'image'
  | 'gallery'
  | 'quote'
  | 'list'
  | 'code'
  | 'embed'
  | 'video'
  | 'table';

export interface ContentBlock {
  type: ContentBlockType;
  level?: number; // 2, 3, 4 for headings
  text?: string;
  url?: string;
  alt?: string;
  caption?: string;
  items?: string[];
  ordered?: boolean;
  author?: string;
  images?: Array<{ url: string; alt?: string; caption?: string }>;
  code?: string;
  language?: string;
  provider?: string;
  headers?: string[];
  rows?: string[][];
}

export interface ParsedArticle {
  externalId: string;
  url: string;
  title: string;
  subtitle?: string;
  author: string;
  publishedAt: string;
  rawHtml: string;
  rawText: string;
  excerpt: string;
  featuredImageUrl?: string;
  categories: string[];
  tags: string[];
  blocks: ContentBlock[];
}

export interface ParserDiscoveryResult {
  sourceUrl: string;
  feedTitle?: string;
  feedDescription?: string;
  articleUrls: string[];
  sampleArticles?: ParsedArticle[];
}

export interface BaseParser {
  type: string;
  discover(body: string, baseUrl: string, config?: any): Promise<ParserDiscoveryResult>;
  parseArticle(body: string, url: string, config?: any): Promise<ParsedArticle>;
}
