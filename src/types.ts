export type ArticleStatus =
  | 'DRAFT'
  | 'IMPORTED'
  | 'TRANSLATED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type Language = 'uk' | 'en';

export interface User {
  id: string;
  username: string;
  email: string;
  role_id: string;
  role_name?: string;
  must_change_password: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name_uk: string;
  name_en: string;
  slug_uk: string;
  slug_en: string;
  description_uk?: string;
  description_en?: string;
  sort_order: number;
  is_active: boolean;
}

export interface Tag {
  id: string;
  name?: string;
  name_uk: string;
  name_en: string;
  slug?: string;
  slug_uk: string;
  slug_en: string;
}

export interface Author {
  id: string;
  name: string;
  role: string;
  bio_uk?: string;
  bio_en?: string;
  avatar_url?: string;
  email?: string;
}

export interface Source {
  id: string;
  name: string;
  base_url: string;
  feed_url?: string;
  sitemap_url?: string;
  enabled: boolean;
  status: 'active' | 'paused' | 'error' | 'syncing';
  description?: string;
  language: string;
  parser_type: 'generic_rss' | 'rss' | 'sitemap' | 'generic_html' | 'html_scraper' | 'wylsa_custom' | 'custom' | string;
  parser_config?: string | Record<string, any>;
  article_url_patterns?: string;
  excluded_url_patterns?: string;
  allowed_categories?: string;
  category_mapping?: string | Record<string, string>;
  default_category_id?: string;
  max_pages_per_sync?: number;
  max_articles_per_sync?: number;
  request_delay_ms?: number;
  retry_count?: number;
  min_content_length?: number;
  max_content_length?: number;
  user_agent?: string;
  headers_json?: string;
  sync_enabled: boolean;
  sync_interval_minutes: number;
  last_sync_at?: string | null;
  next_sync_at?: string | null;
  last_success_at?: string | null;
  last_error_at?: string | null;
  created_at?: string;
  updated_at?: string;
  total_articles?: number;
  total_updates?: number;
  total_errors?: number;
}

export interface SyncLog {
  id: string;
  sync_job_id: string;
  source_id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  details?: string | null;
  created_at: string;
}

export interface DiagnosticResult {
  url: string;
  timestamp: string;
  security: {
    safe: boolean;
    reason?: string;
  };
  http: {
    reachable: boolean;
    status?: number;
    statusText?: string;
    responseTimeMs?: number;
    contentType?: string;
    server?: string;
    contentLength?: number;
  };
  robotsTxt: {
    found: boolean;
    url: string;
    allowedForBot: boolean;
    sitemaps: string[];
    rawExcerpt?: string;
  };
  feeds: {
    rssDetected: boolean;
    rssUrls: string[];
    sitemapsDetected: boolean;
    sitemapUrls: string[];
  };
  discoveredUrls: string[];
  sampleArticle?: {
    externalId: string;
    url: string;
    title: string;
    author: string;
    publishedAt: string;
    rawText: string;
    excerpt: string;
    featuredImageUrl?: string;
    categories: string[];
    blocks: Array<{
      type: string;
      level?: number;
      text?: string;
      url?: string;
      alt?: string;
      caption?: string;
      items?: string[];
      ordered?: boolean;
    }>;
  };
  blocksCount?: number;
  error?: string;
}

export interface EditorBlock {
  id: string;
  type:
    | 'paragraph'
    | 'heading_2'
    | 'heading_3'
    | 'quote'
    | 'image'
    | 'gallery'
    | 'video'
    | 'embed'
    | 'link'
    | 'list'
    | 'table'
    | 'code'
    | 'ad'
    | 'html';
  content: any;
  settings: Record<string, any>;
  order: number;
  visible: boolean;
}

export interface Article {
  id: string;
  source_id?: string;
  source_article_id?: string;
  source_url?: string;
  source_author?: string;
  source_published_at?: string;
  title: string;
  subtitle?: string;
  excerpt: string;
  content: string;
  category_id?: string;
  category_name_uk?: string;
  category_name_en?: string;
  author_id?: string;
  author_name?: string;
  featured_image_id?: string;
  featured_image_url?: string;
  status: ArticleStatus;
  rights_status: 'original' | 'fair_use_rewritten' | 'syndicated' | 'press_release' | 'raw_imported';
  article_type?: 'news' | 'review' | 'feature' | 'editorial';
  review_score?: number;
  slug_uk: string;
  slug_en: string;
  views_count: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  source_name?: string;
  translation_status?: string;
  structured_blocks_json?: string | null;
  meta_title_uk?: string;
  meta_title_en?: string;
  meta_desc_uk?: string;
  meta_desc_en?: string;
  tags_json?: string;
  tags?: string[];
}

export interface ArticleTranslation {
  id: string;
  article_id: string;
  language: Language;
  title: string;
  subtitle?: string;
  excerpt: string;
  content: string;
  meta_title?: string;
  meta_description?: string;
  slug: string;
  status?: string;
  translation_status: 'pending' | 'draft' | 'in_progress' | 'reviewed' | 'approved' | 'rejected' | 'published';
  auto_translated: boolean;
  reviewed_by?: string | null;
  translated_at?: string | null;
  reviewed_at?: string | null;
  structured_blocks_json?: string;
  updated_at: string;
}

export type ChangeEventType =
  | 'NEW_ARTICLE'
  | 'TITLE_CHANGED'
  | 'CONTENT_CHANGED'
  | 'IMAGE_CHANGED'
  | 'CATEGORY_CHANGED'
  | 'AUTHOR_CHANGED'
  | 'LINK_CHANGED'
  | 'ARTICLE_DELETED'
  | 'MULTIPLE_CHANGES'
  | 'content_updated'
  | 'deleted'
  | 'title_changed'
  | 'new_article';

export type ChangeEventStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PARTIALLY_APPROVED'
  | 'pending_review'
  | 'merged'
  | 'dismissed'
  | 'detected';

export type ChangeSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface FieldDiff<T = any> {
  oldValue: T;
  newValue: T;
  changed: boolean;
}

export interface BlockDiff {
  index: number;
  type: string;
  status: 'added' | 'removed' | 'changed' | 'unchanged';
  oldBlock?: any;
  newBlock?: any;
}

export interface StructuredDiff {
  title?: FieldDiff<string>;
  subtitle?: FieldDiff<string>;
  excerpt?: FieldDiff<string>;
  content?: FieldDiff<string>;
  author?: FieldDiff<string>;
  category?: FieldDiff<string>;
  featured_image_url?: FieldDiff<string>;
  tags?: FieldDiff<string[]>;
  links?: FieldDiff<string[]>;
  blocks?: BlockDiff[];
  stats?: {
    addedBlocks: number;
    removedBlocks: number;
    changedBlocks: number;
    unchangedBlocks: number;
  };
}

export interface ArticleVersion {
  id: string;
  article_id: string;
  version_number: number;
  title: string;
  subtitle?: string;
  excerpt: string;
  content: string;
  changed_by?: string;
  changed_by_username?: string;
  author_name?: string;
  change_reason?: string;
  created_at: string;
}

export interface ChangeEvent {
  id: string;
  source_id?: string | null;
  source_article_id: string;
  article_id?: string | null;
  old_version_id?: string | null;
  new_snapshot_id?: string | null;
  change_type: ChangeEventType;
  severity: ChangeSeverity;
  summary: string;
  diff: StructuredDiff | string;
  status: ChangeEventStatus;
  detected_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  review_comment?: string | null;
  // Joined fields for display
  article_title?: string;
  source_title?: string;
  source_name?: string;
  source_url?: string;
  // Backward compatibility fields
  event_type?: string;
  diff_summary?: string;
  previous_hash?: string;
  new_hash?: string;
  previous_value?: string;
  new_value?: string;
}

export interface MediaItem {
  id: string;
  filename: string;
  original_name?: string;
  mime_type: string;
  file_size?: number;
  url: string;
  alt_text?: string;
  alt_text_uk?: string;
  alt_text_en?: string;
  created_at: string;
}

export interface AdSlot {
  id: string;
  slot_key: string;
  name: string;
  position: 'header_leaderboard' | 'sidebar' | 'in_article' | 'footer_banner';
  code_snippet?: string;
  fallback_image_url?: string;
  fallback_link?: string;
  is_active: boolean;
}

export interface SocialLink {
  id: string;
  platform: 'telegram' | 'youtube' | 'instagram' | 'facebook' | 'x' | 'tiktok' | 'discord' | string;
  url: string;
  title?: string;
  icon?: string;
  icon_name?: string;
  sort_order?: number;
  is_active: boolean;
}

export interface SiteElement {
  id: string;
  element_key: string;
  name: string;
  type: string;
  section?: string;
  content_uk?: string;
  content_en?: string;
  enabled: boolean;
  is_active: boolean;
  desktop: boolean;
  tablet: boolean;
  mobile: boolean;
  order: number;
  sort_order?: number;
  settings: Record<string, any> | string;
  updated_at?: string;
}

export type HomepageLayout =
  | 'hero'
  | 'grid'
  | 'list'
  | 'two-column'
  | 'three-column'
  | 'horizontal'
  | 'compact';

export type HomepageSortBy = 'latest' | 'popular' | 'trending' | 'title';

export interface HomepageSection {
  id: string;
  title_uk: string;
  title_en: string;
  section_type: string;
  category_id?: string | null;
  layout: HomepageLayout;
  article_count: number;
  sort_by: HomepageSortBy;
  desktop_visible: boolean;
  mobile_visible: boolean;
  config_json?: string;
  sort_order: number;
  is_active: boolean;
  updated_at?: string;
}

export interface SeoSetting {
  id: string;
  page_type: 'homepage' | 'article' | 'category' | 'author';
  meta_title_uk: string;
  meta_title_en: string;
  meta_desc_uk: string;
  meta_desc_en: string;
  og_image_url?: string;
  canonical_domain?: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  username?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: string;
  created_at: string;
}

export interface SyncJob {
  id: string;
  source_id: string;
  source_name?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  items_discovered: number;
  items_imported: number;
  items_updated: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}
