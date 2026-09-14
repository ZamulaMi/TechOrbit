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
  parser_type: 'rss' | 'html' | 'api';
  scrape_config?: string;
  sync_interval_min: number;
  sync_interval_minutes?: number;
  last_sync_at?: string;
  last_synced_at?: string;
  enabled?: boolean;
  is_active?: boolean;
  sync_enabled?: boolean;
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
  slug_uk: string;
  slug_en: string;
  views_count: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  source_name?: string;
}

export interface ArticleTranslation {
  id: string;
  article_id: string;
  language: Language;
  title: string;
  subtitle?: string;
  excerpt: string;
  content: string;
  slug: string;
  translation_status: 'draft' | 'reviewed' | 'published';
  auto_translated: boolean;
  reviewed_by?: string;
  updated_at: string;
}

export interface ArticleVersion {
  id: string;
  article_id: string;
  version_number: number;
  title: string;
  excerpt: string;
  content: string;
  changed_by?: string;
  author_name?: string;
  change_reason?: string;
  created_at: string;
}

export interface ChangeEvent {
  id: string;
  source_article_id: string;
  article_id?: string;
  event_type: 'content_updated' | 'deleted' | 'title_changed';
  diff_summary: string;
  previous_hash: string;
  new_hash: string;
  previous_value?: string;
  new_value?: string;
  status: 'pending_review' | 'merged' | 'dismissed' | 'detected';
  detected_at: string;
  article_title?: string;
  source_title?: string;
  source_url?: string;
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
  platform: string;
  url: string;
  icon_name: string;
  is_active: boolean;
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
