export type ArticleStatus =
  | 'IMPORTED'
  | 'DRAFT'
  | 'TRANSLATING'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'UPDATE_PENDING'
  | 'REJECTED'
  | 'ARCHIVED';

export type Language = 'uk' | 'en';

export type ParserType = 'generic_rss' | 'html_scraper' | 'json_api' | 'wylsa_custom';

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role_id: string;
  must_change_password: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Source {
  id: string;
  name: string;
  base_url: string;
  feed_url?: string;
  sitemap_url?: string;
  enabled: boolean;
  status: 'active' | 'paused' | 'error' | 'syncing';
  description: string;
  language: string;
  parser_type: ParserType;
  parser_config: string; // JSON string
  article_url_patterns: string; // comma-separated or regex
  excluded_url_patterns: string;
  allowed_categories: string; // comma-separated
  category_mapping?: string; // JSON string
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
  last_sync_at: string | null;
  next_sync_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  created_at: string;
  updated_at: string;
  // Computed stats
  total_articles?: number;
  total_updates?: number;
  total_errors?: number;
}

export interface SourcePage {
  id: string;
  source_id: string;
  url: string;
  status: 'discovered' | 'crawled' | 'failed' | 'ignored';
  http_status: number | null;
  last_crawled_at: string | null;
  etag: string | null;
  last_modified: string | null;
  content_hash: string | null;
  error_message: string | null;
  created_at: string;
}

export interface SourceArticle {
  id: string;
  source_id: string;
  external_id: string;
  source_url: string;
  title: string;
  raw_html: string;
  raw_text: string;
  author: string;
  published_at: string | null;
  content_hash: string;
  status: 'new' | 'processed' | 'updated' | 'ignored';
  created_at: string;
  updated_at: string;
}

export interface SourceSnapshot {
  id: string;
  source_article_id: string;
  content_hash: string;
  raw_content: string;
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  content_text?: string | null;
  content_html?: string | null;
  author?: string | null;
  category?: string | null;
  featured_image_url?: string | null;
  structured_blocks_json?: string | null;
  tags_json?: string | null;
  links_json?: string | null;
  snapshot_at: string;
  created_at?: string;
}

export interface Article {
  id: string;
  source_id: string | null;
  source_article_id: string | null;
  source_url: string | null;
  source_author: string | null;
  source_published_at: string | null;
  title: string;
  subtitle: string;
  excerpt: string;
  content: string;
  category_id: string | null;
  author_id: string | null;
  featured_image_id: string | null;
  featured_image_url?: string | null;
  status: ArticleStatus;
  rights_status: string;
  slug_uk: string;
  slug_en: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  last_source_check: string | null;
  source_content_hash: string | null;
  category_name_uk?: string;
  category_name_en?: string;
  author_name?: string;
  source_name?: string;
  translation_status?: string;
}

export interface ArticleVersion {
  id: string;
  article_id: string;
  version_number: number;
  title: string;
  subtitle?: string | null;
  excerpt: string;
  content: string;
  featured_image_url?: string | null;
  changed_by: string;
  changed_by_username?: string;
  change_reason: string;
  created_at: string;
}

export interface ArticleTranslation {
  id: string;
  article_id: string;
  language: Language;
  title: string;
  subtitle: string;
  excerpt: string;
  content: string;
  slug: string;
  translation_status: 'pending' | 'draft' | 'reviewed' | 'published';
  auto_translated: boolean;
  reviewed_by: string | null;
  updated_at: string;
}

export interface Category {
  id: string;
  name_uk: string;
  name_en: string;
  slug_uk: string;
  slug_en: string;
  description_uk: string;
  description_en: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Tag {
  id: string;
  name_uk: string;
  name_en: string;
  slug_uk: string;
  slug_en: string;
  created_at: string;
}

export interface Author {
  id: string;
  name: string;
  role: string;
  bio_uk: string;
  bio_en: string;
  avatar_url: string;
  email: string;
  social_links: string;
  is_active: boolean;
  created_at: string;
}

export interface Media {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
  url: string;
  alt_text_uk: string;
  alt_text_en: string;
  width: number | null;
  height: number | null;
  created_by: string;
  created_at: string;
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
  | 'new_article'
  | 'content_updated'
  | 'title_updated'
  | 'author_updated'
  | 'deleted_at_source';

export type ChangeEventStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PARTIALLY_APPROVED' | 'pending_review' | 'merged' | 'dismissed';
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

export interface ChangeEvent {
  id: string;
  source_id?: string | null;
  source_article_id: string;
  article_id: string | null;
  old_version_id?: string | null;
  new_snapshot_id?: string | null;
  change_type: ChangeEventType;
  severity: ChangeSeverity;
  summary: string;
  diff: StructuredDiff | string;
  status: ChangeEventStatus;
  detected_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_comment: string | null;
  // Joined fields for admin UI
  source_name?: string;
  source_url?: string;
  article_title?: string;
  source_title?: string;
  // Backwards compatibility
  event_type?: string;
  diff_summary?: string;
  previous_hash?: string | null;
  new_hash?: string;
  resolved_at?: string | null;
}

export interface Notification {
  id: string;
  type: 'change_detected' | 'review_required' | 'import_failed' | 'system_alert' | 'publish_success';
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: string | null;
  new_values: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface SiteSetting {
  key: string;
  value: string;
  description: string;
  updated_at: string;
  updated_by: string | null;
}

export interface SiteElement {
  id: string;
  element_key: string;
  section: string;
  content_uk: string;
  content_en: string;
  is_active: boolean;
  updated_at: string;
}

export interface HomepageSection {
  id: string;
  title_uk: string;
  title_en: string;
  section_type: 'hero' | 'featured_grid' | 'trending_ticker' | 'category_feed' | 'editor_picks' | 'newsletter_bar';
  config_json: string;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  title: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
}

export interface AdSlot {
  id: string;
  slot_key: string;
  name: string;
  position: 'header_banner' | 'sidebar_top' | 'article_inline' | 'footer_leaderboard' | 'in_feed';
  code_snippet: string;
  is_active: boolean;
  fallback_image_url: string;
  fallback_link: string;
  max_impressions: number;
  updated_at: string;
}

export interface SeoSetting {
  id: string;
  page_type: 'home' | 'article' | 'category' | 'author' | 'tag' | 'search';
  meta_title_uk: string;
  meta_title_en: string;
  meta_desc_uk: string;
  meta_desc_en: string;
  og_image_url: string;
  canonical_base: string;
  schema_type: string;
  updated_at: string;
}

export interface SyncJob {
  id: string;
  source_id: string;
  source_name?: string;
  status: 'running' | 'completed' | 'failed';
  items_found: number;
  items_imported: number;
  items_updated: number;
  items_failed: number;
  error_message: string | null;
  duration_ms?: number;
  triggered_by?: string;
  started_at: string;
  completed_at: string | null;
}

export interface SyncLog {
  id: string;
  sync_job_id: string;
  source_id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  details: string | null;
  created_at: string;
}
