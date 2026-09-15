import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'techorbit.db');
export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys for high performance and integrity
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role_id TEXT NOT NULL,
      must_change_password INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      description TEXT,
      language TEXT DEFAULT 'ru',
      parser_type TEXT DEFAULT 'html_scraper',
      parser_config TEXT DEFAULT '{}',
      article_url_patterns TEXT DEFAULT '',
      excluded_url_patterns TEXT DEFAULT '',
      allowed_categories TEXT DEFAULT '',
      sync_enabled INTEGER DEFAULT 1,
      sync_interval_minutes INTEGER DEFAULT 60,
      last_sync_at TEXT,
      next_sync_at TEXT,
      last_success_at TEXT,
      last_error_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS source_pages (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      url TEXT NOT NULL,
      status TEXT DEFAULT 'discovered',
      http_status INTEGER,
      last_crawled_at TEXT,
      etag TEXT,
      last_modified TEXT,
      content_hash TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS source_articles (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      external_id TEXT NOT NULL,
      source_url TEXT NOT NULL,
      title TEXT NOT NULL,
      raw_html TEXT,
      raw_text TEXT,
      author TEXT,
      published_at TEXT,
      content_hash TEXT NOT NULL,
      status TEXT DEFAULT 'new',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS source_snapshots (
      id TEXT PRIMARY KEY,
      source_article_id TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      raw_content TEXT NOT NULL,
      title TEXT NOT NULL,
      snapshot_at TEXT NOT NULL,
      FOREIGN KEY (source_article_id) REFERENCES source_articles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name_uk TEXT NOT NULL,
      name_en TEXT NOT NULL,
      slug_uk TEXT UNIQUE NOT NULL,
      slug_en TEXT UNIQUE NOT NULL,
      description_uk TEXT,
      description_en TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name_uk TEXT NOT NULL,
      name_en TEXT NOT NULL,
      slug_uk TEXT UNIQUE NOT NULL,
      slug_en TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS authors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'Tech Editor',
      bio_uk TEXT,
      bio_en TEXT,
      avatar_url TEXT,
      email TEXT,
      social_links TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      url TEXT NOT NULL,
      alt_text_uk TEXT,
      alt_text_en TEXT,
      width INTEGER,
      height INTEGER,
      created_by TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      source_id TEXT,
      source_article_id TEXT,
      source_url TEXT,
      source_author TEXT,
      source_published_at TEXT,
      title TEXT NOT NULL,
      subtitle TEXT,
      excerpt TEXT,
      content TEXT,
      category_id TEXT,
      author_id TEXT,
      featured_image_id TEXT,
      featured_image_url TEXT,
      status TEXT NOT NULL DEFAULT 'IMPORTED',
      rights_status TEXT DEFAULT 'editorial_review',
      slug_uk TEXT UNIQUE NOT NULL,
      slug_en TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      published_at TEXT,
      last_source_check TEXT,
      source_content_hash TEXT,
      article_type TEXT DEFAULT 'news',
      review_score REAL,
      views_count INTEGER DEFAULT 0,
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL,
      FOREIGN KEY (source_article_id) REFERENCES source_articles(id) ON DELETE SET NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE SET NULL,
      FOREIGN KEY (featured_image_id) REFERENCES media(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS article_versions (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT,
      content TEXT,
      changed_by TEXT NOT NULL,
      change_reason TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS article_translations (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL,
      language TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT,
      excerpt TEXT,
      content TEXT,
      slug TEXT NOT NULL,
      translation_status TEXT DEFAULT 'pending',
      auto_translated INTEGER DEFAULT 0,
      reviewed_by TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE(article_id, language),
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS article_tags (
      article_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (article_id, tag_id),
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS change_events (
      id TEXT PRIMARY KEY,
      source_article_id TEXT NOT NULL,
      article_id TEXT,
      event_type TEXT NOT NULL,
      diff_summary TEXT NOT NULL,
      previous_hash TEXT,
      new_hash TEXT NOT NULL,
      status TEXT DEFAULT 'pending_review',
      detected_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY (source_article_id) REFERENCES source_articles(id) ON DELETE CASCADE,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT NOT NULL,
      updated_by TEXT
    );

    CREATE TABLE IF NOT EXISTS site_elements (
      id TEXT PRIMARY KEY,
      element_key TEXT UNIQUE NOT NULL,
      section TEXT NOT NULL,
      content_uk TEXT NOT NULL,
      content_en TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS homepage_sections (
      id TEXT PRIMARY KEY,
      title_uk TEXT NOT NULL,
      title_en TEXT NOT NULL,
      section_type TEXT NOT NULL,
      config_json TEXT DEFAULT '{}',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS social_links (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      icon TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ad_slots (
      id TEXT PRIMARY KEY,
      slot_key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      code_snippet TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      fallback_image_url TEXT,
      fallback_link TEXT,
      max_impressions INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seo_settings (
      id TEXT PRIMARY KEY,
      page_type TEXT UNIQUE NOT NULL,
      meta_title_uk TEXT NOT NULL,
      meta_title_en TEXT NOT NULL,
      meta_desc_uk TEXT NOT NULL,
      meta_desc_en TEXT NOT NULL,
      og_image_url TEXT,
      canonical_base TEXT NOT NULL,
      schema_type TEXT DEFAULT 'WebSite',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_jobs (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      status TEXT NOT NULL,
      items_found INTEGER DEFAULT 0,
      items_imported INTEGER DEFAULT 0,
      items_updated INTEGER DEFAULT 0,
      items_failed INTEGER DEFAULT 0,
      error_message TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_logs (
      id TEXT PRIMARY KEY,
      sync_job_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (sync_job_id) REFERENCES sync_jobs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
    CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
    CREATE INDEX IF NOT EXISTS idx_articles_slug_uk ON articles(slug_uk);
    CREATE INDEX IF NOT EXISTS idx_articles_slug_en ON articles(slug_en);
    CREATE INDEX IF NOT EXISTS idx_article_versions_article_id ON article_versions(article_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_change_events_status ON change_events(status);
    CREATE INDEX IF NOT EXISTS idx_source_articles_source_id ON source_articles(source_id);
  `);

  // Dynamic migrations for Sources & Sync pipeline
  const migrateColumn = (table: string, colDef: string) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
    } catch {
      // Column already exists
    }
  };

  migrateColumn('sources', 'feed_url TEXT DEFAULT ""');
  migrateColumn('sources', 'sitemap_url TEXT DEFAULT ""');
  migrateColumn('sources', 'default_category_id TEXT DEFAULT "cat_smartphones"');
  migrateColumn('sources', 'category_mapping TEXT DEFAULT "{}"');
  migrateColumn('sources', 'max_pages_per_sync INTEGER DEFAULT 2');
  migrateColumn('sources', 'max_articles_per_sync INTEGER DEFAULT 10');
  migrateColumn('sources', 'request_delay_ms INTEGER DEFAULT 500');
  migrateColumn('sources', 'retry_count INTEGER DEFAULT 3');
  migrateColumn('sources', 'min_content_length INTEGER DEFAULT 100');
  migrateColumn('sources', 'max_content_length INTEGER DEFAULT 50000');
  migrateColumn('sources', 'user_agent TEXT DEFAULT "TechOrbitBot/1.0 (+https://techorbit.media/bot)"');
  migrateColumn('sources', 'headers_json TEXT DEFAULT "{}"');

  migrateColumn('sync_jobs', 'duration_ms INTEGER DEFAULT 0');
  migrateColumn('sync_jobs', 'triggered_by TEXT DEFAULT "scheduler"');

  // Dynamic migrations for Versioning, Snapshots, and Change Events
  migrateColumn('change_events', 'source_id TEXT');
  migrateColumn('change_events', 'old_version_id TEXT');
  migrateColumn('change_events', 'new_snapshot_id TEXT');
  migrateColumn('change_events', 'change_type TEXT DEFAULT "CONTENT_CHANGED"');
  migrateColumn('change_events', 'severity TEXT DEFAULT "medium"');
  migrateColumn('change_events', 'summary TEXT');
  migrateColumn('change_events', 'diff TEXT DEFAULT "{}"');
  migrateColumn('change_events', 'reviewed_at TEXT');
  migrateColumn('change_events', 'reviewed_by TEXT');
  migrateColumn('change_events', 'review_comment TEXT');

  migrateColumn('source_snapshots', 'source_id TEXT');
  migrateColumn('source_snapshots', 'article_id TEXT');
  migrateColumn('source_snapshots', 'subtitle TEXT');
  migrateColumn('source_snapshots', 'excerpt TEXT');
  migrateColumn('source_snapshots', 'author TEXT');
  migrateColumn('source_snapshots', 'category TEXT');
  migrateColumn('source_snapshots', 'tags_json TEXT DEFAULT "[]"');
  migrateColumn('source_snapshots', 'featured_image_url TEXT');
  migrateColumn('source_snapshots', 'gallery_json TEXT DEFAULT "[]"');
  migrateColumn('source_snapshots', 'links_json TEXT DEFAULT "[]"');
  migrateColumn('source_snapshots', 'structured_blocks_json TEXT DEFAULT "[]"');
  migrateColumn('source_snapshots', 'published_at TEXT');
  migrateColumn('source_snapshots', 'updated_at TEXT');

  migrateColumn('article_versions', 'subtitle TEXT');
  migrateColumn('article_versions', 'category_id TEXT');
  migrateColumn('article_versions', 'author_id TEXT');
  migrateColumn('article_versions', 'featured_image_url TEXT');
  migrateColumn('article_versions', 'structured_blocks_json TEXT DEFAULT "[]"');

  migrateColumn('articles', 'translation_status TEXT DEFAULT "NOT_STARTED"');
  migrateColumn('articles', 'source_status TEXT DEFAULT "active"');
  migrateColumn('articles', 'structured_blocks_json TEXT DEFAULT "[]"');
  migrateColumn('articles', 'meta_title_uk TEXT DEFAULT ""');
  migrateColumn('articles', 'meta_title_en TEXT DEFAULT ""');
  migrateColumn('articles', 'meta_desc_uk TEXT DEFAULT ""');
  migrateColumn('articles', 'meta_desc_en TEXT DEFAULT ""');
  migrateColumn('articles', 'tags_json TEXT DEFAULT "[]"');
  migrateColumn('articles', 'article_type TEXT DEFAULT "news"');
  migrateColumn('articles', 'review_score REAL');
  migrateColumn('articles', 'views_count INTEGER DEFAULT 0');

  // Backfill article attributes for existing rows
  try {
    db.exec(`
      UPDATE articles
      SET article_type = 'review'
      WHERE (LOWER(title) LIKE '%огляд%' OR LOWER(title) LIKE '%review%')
        AND (article_type IS NULL OR article_type = 'news');

      UPDATE articles
      SET article_type = 'news'
      WHERE article_type IS NULL;

      UPDATE articles
      SET views_count = 0
      WHERE views_count IS NULL;
    `);
  } catch (err) {
    console.error('Error during article column backfill:', err);
  }

  migrateColumn('article_translations', 'meta_title TEXT DEFAULT ""');
  migrateColumn('article_translations', 'meta_description TEXT DEFAULT ""');
  migrateColumn('article_translations', 'status TEXT DEFAULT "pending"');
  migrateColumn('article_translations', 'translated_at TEXT');
  migrateColumn('article_translations', 'reviewed_at TEXT');
  migrateColumn('article_translations', 'structured_blocks_json TEXT DEFAULT "[]"');

  // Dynamic migrations for Site Elements & Homepage Builder
  migrateColumn('site_elements', 'name TEXT');
  migrateColumn('site_elements', 'type TEXT');
  migrateColumn('site_elements', 'enabled INTEGER DEFAULT 1');
  migrateColumn('site_elements', 'desktop INTEGER DEFAULT 1');
  migrateColumn('site_elements', 'tablet INTEGER DEFAULT 1');
  migrateColumn('site_elements', 'mobile INTEGER DEFAULT 1');
  migrateColumn('site_elements', 'sort_order INTEGER DEFAULT 0');
  migrateColumn('site_elements', 'settings TEXT DEFAULT "{}"');

  migrateColumn('homepage_sections', 'category_id TEXT');
  migrateColumn('homepage_sections', 'layout TEXT DEFAULT "grid"');
  migrateColumn('homepage_sections', 'article_count INTEGER DEFAULT 6');
  migrateColumn('homepage_sections', 'sort_by TEXT DEFAULT "latest"');
  migrateColumn('homepage_sections', 'desktop_visible INTEGER DEFAULT 1');
  migrateColumn('homepage_sections', 'mobile_visible INTEGER DEFAULT 1');

  seedData();
}

function seedData() {
  const now = new Date().toISOString();

  // 1. Roles
  const rolesCount = db.prepare('SELECT count(*) as count FROM roles').get() as { count: number };
  if (rolesCount.count === 0) {
    const insertRole = db.prepare('INSERT INTO roles (id, name, description, created_at) VALUES (?, ?, ?, ?)');
    insertRole.run('role_admin', 'Administrator', 'Full unrestricted platform access', now);
    insertRole.run('role_editor', 'Chief Editor', 'Can review, edit, translate, and publish articles', now);
    insertRole.run('role_moderator', 'Moderator', 'Can review changes and verify translation quality', now);
  }

  // 2. Admin User
  // Username: admin, Temporary Password: ChangeMe!2026_TechOrbit#91
  // Must change password = 1 (true)
  const usersCount = db.prepare('SELECT count(*) as count FROM users WHERE username = ?').get('admin') as { count: number } | undefined;
  if (!usersCount || usersCount.count === 0) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('ChangeMe!2026_TechOrbit#91', salt);
    const insertUser = db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role_id, must_change_password, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)
    `);
    insertUser.run(
      'user_admin_initial',
      'admin',
      'admin@techorbit.media',
      passwordHash,
      'role_admin',
      now,
      now
    );

    // Initial audit log
    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertAudit.run(
      'audit_init_sys',
      'user_admin_initial',
      'SYSTEM_BOOTSTRAP',
      'system',
      'techorbit',
      null,
      JSON.stringify({ note: 'Initial system bootstrap and seed admin initialized' }),
      '127.0.0.1',
      'SystemBootstrap/1.0',
      now
    );
  }

  // 3. Categories
  const catCount = db.prepare('SELECT count(*) as count FROM categories').get() as { count: number };
  if (catCount.count === 0) {
    const insertCat = db.prepare(`
      INSERT INTO categories (id, name_uk, name_en, slug_uk, slug_en, description_uk, description_en, sort_order, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);
    insertCat.run('cat_smartphones', 'Смартфони', 'Smartphones', 'smartphones', 'smartphones', 'Новини та огляди мобільних пристроїв', 'News and reviews of mobile smartphones', 1, now);
    insertCat.run('cat_gadgets', 'Гаджети та Залізо', 'Hardware & Gadgets', 'hardware-gadgets', 'hardware-gadgets', 'Ноутбуки, процесори, периферія', 'Laptops, GPUs, processors and computer accessories', 2, now);
    insertCat.run('cat_ai_software', 'ШІ та Програми', 'AI & Software', 'ai-software', 'ai-software', 'Штучний інтелект, нейромережі, ОС та додатки', 'Artificial intelligence, software and OS updates', 3, now);
    insertCat.run('cat_auto_ev', 'Авто та EV', 'Auto & EVs', 'auto-ev', 'auto-ev', 'Електромобілі, автопілоти, сучасні транспортні технології', 'Electric vehicles, autonomous driving and automotive tech', 4, now);
    insertCat.run('cat_audio', 'Аудіо та Відео', 'Audio & Video', 'audio-video', 'audio-video', 'Навушники, акустика, камери та дисплеї', 'Headphones, Hi-Fi sound, cameras and visual displays', 5, now);
    insertCat.run('cat_gaming', 'Геймінг', 'Gaming', 'gaming', 'gaming', 'Ігрові консолі, релізи ігор, аксесуари', 'Gaming consoles, game releases and gamer equipment', 6, now);
  }

  // 4. Tags
  const tagsCount = db.prepare('SELECT count(*) as count FROM tags').get() as { count: number };
  if (tagsCount.count === 0) {
    const insertTag = db.prepare(`
      INSERT INTO tags (id, name_uk, name_en, slug_uk, slug_en, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertTag.run('tag_apple', 'Apple', 'Apple', 'apple', 'apple', now);
    insertTag.run('tag_google', 'Google', 'Google', 'google', 'google', now);
    insertTag.run('tag_ai', 'ШІ', 'AI', 'ai', 'ai', now);
    insertTag.run('tag_tesla', 'Tesla', 'Tesla', 'tesla', 'tesla', now);
    insertTag.run('tag_android', 'Android', 'Android', 'android', 'android', now);
    insertTag.run('tag_samsung', 'Samsung', 'Samsung', 'samsung', 'samsung', now);
  }

  // 5. Initial Source (Multi-source entity architecture, seeded with wylsa.com as an independent source)
  const sourcesCount = db.prepare('SELECT count(*) as count FROM sources').get() as { count: number };
  if (sourcesCount.count === 0) {
    const insertSource = db.prepare(`
      INSERT INTO sources (
        id, name, base_url, enabled, status, description, language,
        parser_type, parser_config, article_url_patterns, excluded_url_patterns,
        allowed_categories, sync_enabled, sync_interval_minutes,
        last_sync_at, next_sync_at, last_success_at, last_error_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, 1, 'active', ?, 'ru', 'wylsa_custom', ?, ?, ?, ?, 1, 30, ?, ?, ?, NULL, ?, ?)
    `);

    const wylsaConfig = JSON.stringify({
      feedUrl: 'https://wylsa.com/feed/',
      sitemapUrl: 'https://wylsa.com/sitemap_index.xml',
      headers: { 'User-Agent': 'TechOrbitBot/1.0 (+https://techorbit.media/bot)' },
      contentSelector: 'article.entry-content, div.post-content',
      titleSelector: 'h1.entry-title',
      authorSelector: '.author-name, span.byline',
      dateSelector: 'time.entry-date',
      imageSelector: 'figure.entry-featured-image img, meta[property="og:image"]'
    });

    insertSource.run(
      'src_wylsa',
      'Wylsa.com',
      'https://wylsa.com',
      'Популярне технологічне джерело (огляди, гаджети, смартфони)',
      wylsaConfig,
      'wylsa.com/*,wylsa.com/category/*',
      'wylsa.com/tag/*,wylsa.com/author/*',
      'smartphones,gadgets,ai_software,auto_ev',
      now,
      new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      now,
      now,
      now
    );

    // Also add a secondary source template to demonstrate true multi-source capability
    insertSource.run(
      'src_theverge',
      'The Verge RSS',
      'https://www.theverge.com',
      'Global tech, science, art, and culture journalism source',
      JSON.stringify({
        feedUrl: 'https://www.theverge.com/rss/index.xml',
        headers: { 'User-Agent': 'TechOrbitBot/1.0' },
        parser_type: 'generic_rss'
      }),
      'theverge.com/*/*',
      'theverge.com/users/*',
      'smartphones,gadgets,ai_software',
      now,
      new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      now,
      now,
      now
    );
  }

  // 6. Authors
  const authorsCount = db.prepare('SELECT count(*) as count FROM authors').get() as { count: number };
  if (authorsCount.count === 0) {
    const insertAuthor = db.prepare(`
      INSERT INTO authors (id, name, role, bio_uk, bio_en, avatar_url, email, social_links, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);
    insertAuthor.run(
      'author_editorial_techorbit',
      'Редакція TechOrbit',
      'Головний редакторський склад',
      'Аналітична команда журналістів, перекладачів та технологів TechOrbit.',
      'Analytical team of journalists, translators, and technologists at TechOrbit.',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      'editor@techorbit.media',
      JSON.stringify({ twitter: 'https://twitter.com/techorbit_media', telegram: 'https://t.me/techorbit' }),
      now
    );
    insertAuthor.run(
      'author_mykhailo',
      'Михайло Орлов',
      'Senior Tech Columnist',
      'Спеціаліст з ШІ, мобільних процесорів та архітектури автономних систем.',
      'Specialist in AI, mobile chipsets, and autonomous systems architecture.',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      'm.orlov@techorbit.media',
      JSON.stringify({ linkedin: 'https://linkedin.com/in/example' }),
      now
    );
  }

  // 7. Site Settings
  const settingsCount = db.prepare('SELECT count(*) as count FROM site_settings').get() as { count: number };
  if (settingsCount.count === 0) {
    const insertSetting = db.prepare(`
      INSERT INTO site_settings (key, value, description, updated_at, updated_by)
      VALUES (?, ?, ?, ?, 'system')
    `);
    insertSetting.run('site_name', 'TechOrbit', 'Official publication brand name', now);
    insertSetting.run('site_tagline_uk', 'Пульс технологічної ери та незалежні огляди', 'Tagline in Ukrainian', now);
    insertSetting.run('site_tagline_en', 'The Pulse of Modern Tech & Independent Reviews', 'Tagline in English', now);
    insertSetting.run('default_language', 'uk', 'Default display language (uk/en)', now);
    insertSetting.run('auto_translation_enabled', '1', 'Automatic draft translation through Gemini AI pipeline', now);
    insertSetting.run('require_moderation_review', '1', 'Enforce strict editorial approval before publication', now);
    insertSetting.run('sync_frequency_minutes', '30', 'Background source aggregation poll frequency', now);
    insertSetting.run('contact_email', 'contact@techorbit.media', 'Editorial inquiries email', now);
  }

  // 8. Social Links (Telegram, YouTube, Instagram, Facebook, X, TikTok, Discord)
  const defaultSocials = [
    { id: 'soc_telegram', platform: 'telegram', url: 'https://t.me/techorbit_media', title: 'Telegram Канал', icon: 'Send', order: 1 },
    { id: 'soc_youtube', platform: 'youtube', url: 'https://youtube.com/@techorbit_media', title: 'YouTube Огляди', icon: 'Youtube', order: 2 },
    { id: 'soc_instagram', platform: 'instagram', url: 'https://instagram.com/techorbit.media', title: 'Instagram Tech', icon: 'Instagram', order: 3 },
    { id: 'soc_facebook', platform: 'facebook', url: 'https://facebook.com/techorbit.media', title: 'Facebook Page', icon: 'Facebook', order: 4 },
    { id: 'soc_x', platform: 'x', url: 'https://x.com/techorbit_media', title: 'X (Twitter)', icon: 'Twitter', order: 5 },
    { id: 'soc_tiktok', platform: 'tiktok', url: 'https://tiktok.com/@techorbit_media', title: 'TikTok Tech Shorts', icon: 'Video', order: 6 },
    { id: 'soc_discord', platform: 'discord', url: 'https://discord.gg/techorbit', title: 'Discord Community', icon: 'MessageSquare', order: 7 }
  ];

  const insertSocial = db.prepare(`
    INSERT OR IGNORE INTO social_links (id, platform, url, title, icon, sort_order, is_active, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `);
  for (const s of defaultSocials) {
    insertSocial.run(s.id, s.platform, s.url, s.title, s.icon, s.order, now);
  }

  // 8.1 Site Elements (16 configurable elements)
  const defaultElements = [
    { id: 'el_header', key: 'header', name: 'Header', type: 'navigation', sec: 'header', order: 1 },
    { id: 'el_logo', key: 'logo', name: 'Logo', type: 'branding', sec: 'header', order: 2 },
    { id: 'el_navigation', key: 'navigation', name: 'Navigation', type: 'navigation', sec: 'header', order: 3 },
    { id: 'el_search', key: 'search', name: 'Search', type: 'search', sec: 'header', order: 4 },
    { id: 'el_lang_switcher', key: 'language_switcher', name: 'Language Switcher', type: 'i18n', sec: 'header', order: 5 },
    { id: 'el_top_ad', key: 'top_advertisement', name: 'Top Advertisement', type: 'advertising', sec: 'header', order: 6 },
    { id: 'el_hero', key: 'hero', name: 'Hero', type: 'editorial', sec: 'main', order: 7 },
    { id: 'el_latest', key: 'latest_articles', name: 'Latest Articles', type: 'feed', sec: 'main', order: 8 },
    { id: 'el_popular', key: 'popular_articles', name: 'Popular Articles', type: 'feed', sec: 'main', order: 9 },
    { id: 'el_category_sections', key: 'category_sections', name: 'Category Sections', type: 'taxonomy', sec: 'main', order: 10 },
    { id: 'el_sidebar', key: 'sidebar', name: 'Sidebar', type: 'layout', sec: 'main', order: 11 },
    { id: 'el_newsletter', key: 'newsletter', name: 'Newsletter', type: 'engagement', sec: 'footer', order: 12 },
    { id: 'el_social', key: 'social_links', name: 'Social Links', type: 'social', sec: 'footer', order: 13 },
    { id: 'el_source_attrib', key: 'source_attribution', name: 'Source Attribution', type: 'compliance', sec: 'article', order: 14 },
    { id: 'el_related', key: 'related_articles', name: 'Related Articles', type: 'recommendation', sec: 'article', order: 15 },
    { id: 'el_footer', key: 'footer', name: 'Footer', type: 'navigation', sec: 'footer', order: 16 }
  ];

  const insertElement = db.prepare(`
    INSERT OR IGNORE INTO site_elements (
      id, element_key, name, type, section, content_uk, content_en, enabled, is_active,
      desktop, tablet, mobile, sort_order, settings, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 1, 1, 1, ?, '{}', ?)
  `);
  for (const el of defaultElements) {
    insertElement.run(el.id, el.key, el.name, el.type, el.sec, el.name, el.name, el.order, now);
  }

  // 8.2 Modular Homepage Sections
  const defaultHomepageSections = [
    { id: 'sec_hero', uk: 'Головне сьогодні', en: 'Top Editorial Stories', type: 'hero', cat: null, layout: 'hero', count: 5, sort: 'latest', order: 1 },
    { id: 'sec_latest_news', uk: 'Свіжі новини технологій', en: 'Latest Tech News', type: 'latest_news', cat: null, layout: 'two-column', count: 6, sort: 'latest', order: 2 },
    { id: 'sec_featured', uk: 'Вибір редакції', en: 'Editor’s Picks', type: 'featured', cat: null, layout: 'grid', count: 3, sort: 'popular', order: 3 },
    { id: 'sec_reviews', uk: 'Огляди та Лабораторні тести', en: 'In-Depth Reviews', type: 'reviews', cat: 'cat_gadgets', layout: 'three-column', count: 3, sort: 'latest', order: 4 },
    { id: 'sec_popular', uk: 'Найбільш обговорюване', en: 'Trending & Popular', type: 'popular', cat: null, layout: 'horizontal', count: 4, sort: 'popular', order: 5 },
    { id: 'sec_smartphones', uk: 'Смартфони та Мобільна ера', en: 'Smartphones & Mobile Tech', type: 'category_blocks', cat: 'cat_smartphones', layout: 'compact', count: 4, sort: 'latest', order: 6 },
    { id: 'sec_newsletter', uk: 'Щотижневий дайджест TechOrbit', en: 'TechOrbit Weekly Digest', type: 'newsletter', cat: null, layout: 'grid', count: 0, sort: 'latest', order: 7 },
    { id: 'sec_ad_banner', uk: 'Партнерський блок', en: 'Sponsored Feature', type: 'advertisement', cat: null, layout: 'grid', count: 0, sort: 'latest', order: 8 }
  ];

  const insertSection = db.prepare(`
    INSERT OR IGNORE INTO homepage_sections (
      id, title_uk, title_en, section_type, category_id, layout, article_count,
      sort_by, desktop_visible, mobile_visible, config_json, sort_order, is_active, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, '{}', ?, 1, ?)
  `);
  for (const s of defaultHomepageSections) {
    insertSection.run(s.id, s.uk, s.en, s.type, s.cat, s.layout, s.count, s.sort, s.order, now);
  }

  // 9. Ad Slots
  const adCount = db.prepare('SELECT count(*) as count FROM ad_slots').get() as { count: number };
  if (adCount.count === 0) {
    const insertAd = db.prepare(`
      INSERT INTO ad_slots (id, slot_key, name, position, code_snippet, is_active, fallback_image_url, fallback_link, max_impressions, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, 0, ?)
    `);
    insertAd.run(
      'ad_header_top',
      'header_leaderboard',
      'Головний банер шапки (728x90)',
      'header_banner',
      '<!-- TechOrbit Sponsor Unit A -->',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=728&h=90&fit=crop&q=80',
      'https://techorbit.media/partners',
      now
    );
    insertAd.run(
      'ad_sidebar_top',
      'sidebar_rectangle',
      'Боковий модуль (300x250)',
      'sidebar_top',
      '<!-- TechOrbit Sponsor Unit B -->',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&h=250&fit=crop&q=80',
      'https://techorbit.media/partners',
      now
    );
  }

  // 10. SEO Settings
  const seocount = db.prepare('SELECT count(*) as count FROM seo_settings').get() as { count: number };
  if (seocount.count === 0) {
    const insertSeo = db.prepare(`
      INSERT INTO seo_settings (id, page_type, meta_title_uk, meta_title_en, meta_desc_uk, meta_desc_en, og_image_url, canonical_base, schema_type, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertSeo.run(
      'seo_home',
      'home',
      'TechOrbit — Технологічне медіа, новини заліза, гаджети та ШІ',
      'TechOrbit — Next-Gen Tech Media, Hardware, Gadgets & AI Insights',
      'TechOrbit: щоденні технологічні новини, незалежні огляди техніки, переклади та аналітика індустрії.',
      'TechOrbit: daily tech news, independent hardware reviews, translations and industry intelligence.',
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=630&fit=crop&q=80',
      'https://techorbit.media',
      'NewsMediaOrganization',
      now
    );
  }

  // 11. Initial Articles (with multiple status values, version 1, translations UA and EN)
  const articlesCount = db.prepare('SELECT count(*) as count FROM articles').get() as { count: number };
  const hasArt4 = db.prepare('SELECT id FROM articles WHERE id = ?').get('art_samsung_s26_ultra');
  if (articlesCount.count === 0 || !hasArt4) {
    const insertArticle = db.prepare(`
      INSERT OR IGNORE INTO articles (
        id, source_id, source_article_id, source_url, source_author, source_published_at,
        title, subtitle, excerpt, content, category_id, author_id,
        featured_image_id, featured_image_url, status, rights_status,
        slug_uk, slug_en, created_at, updated_at, published_at,
        last_source_check, source_content_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertVersion = db.prepare(`
      INSERT OR IGNORE INTO article_versions (id, article_id, version_number, title, excerpt, content, changed_by, change_reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTrans = db.prepare(`
      INSERT OR IGNORE INTO article_translations (id, article_id, language, title, subtitle, excerpt, content, slug, translation_status, auto_translated, reviewed_by, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Seed source articles first so articles foreign key constraint is satisfied
    const insertSrcArt = db.prepare(`
      INSERT OR IGNORE INTO source_articles (id, source_id, external_id, source_url, title, raw_html, raw_text, author, published_at, content_hash, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processed', ?, ?)
    `);

    insertSrcArt.run(
      'src_art_m4',
      'src_wylsa',
      'wylsa_post_8912',
      'https://wylsa.com/apple-m4-pro-max-details/',
      'Apple M4 Pro & Max announcement',
      '<p>Apple introduced M4 Pro and M4 Max silicon with Thunderbolt 5 support.</p>',
      'Apple introduced M4 Pro and M4 Max silicon with Thunderbolt 5 support.',
      'Олександр П.',
      now,
      'hash_m4_content_v1',
      now,
      now
    );

    insertSrcArt.run(
      'src_art_willow',
      'src_theverge',
      'verge_willow_4412',
      'https://www.theverge.com/willow-quantum-chip',
      'Google Willow Breakthrough',
      '<p>Updated paragraphs with error rates table.</p>',
      'Updated paragraphs with error rates table.',
      'Sarah Jeong',
      now,
      'hash_willow_v2',
      now,
      now
    );

    insertSrcArt.run(
      'src_art_solid_ev',
      'src_wylsa',
      'wylsa_solid_ev_102',
      'https://wylsa.com/solid-state-batteries-ev-reality/',
      'Solid-state EV batteries reality check',
      '<p>Analysis of automotive solid-state technology timeline.</p>',
      'Analysis of automotive solid-state technology timeline.',
      'Дмитро К.',
      now,
      'hash_ev_solid_v1',
      now,
      now
    );

    // Article 1: Published Apple M4 Chip article
    const art1Id = 'art_m4_max_chips';
    const art1TitleUk = 'Apple презентувала чипи M4 Pro та M4 Max з підтримкою Thunderbolt 5';
    const art1TitleEn = 'Apple Unveils M4 Pro and M4 Max Processors Featuring Thunderbolt 5';
    const art1ExcerptUk = 'Нове покоління кремнію від Apple демонструє рекордно швидкі ядра CPU та прискорений нейронний рушій Neural Engine для локальних ШІ-моделей.';
    const art1ExcerptEn = 'The next generation of Apple Silicon demonstrates record-setting CPU single-core performance and an accelerated Neural Engine tailored for on-device AI.';
    const art1ContentUk = `Компанія Apple офіційно розкрила технічні подробиці архітектури своїх флагманських процесорів M4 Pro та M4 Max.

Завдяки переходу на покращений 3-нанометровий техпроцес N3E другого покоління, енергоефективність нових чипів зросла на 25% порівняно з попередньою лінійкою M3. Найбільший технологічний стрибок припав на підсистему пам'яті та інтеграцію шини Thunderbolt 5 із пропускною здатністю до 120 Гбіт/с.

Ключові оновлення:
- До 16 обчислювальних ядер CPU (12 продуктивних та 4 енергоефективних)
- Графічний процесор із підтримкою апаратного прискорення трасування променів другого покоління
- Пропускна здатність об'єднаної пам'яті до 546 ГБ/с в конфігурації Max
- 16-ядерний Neural Engine, оптимізований під виконання моделей Apple Intelligence без підключення до хмари.

Перші пристрої на нових чипах надійдуть у продаж уже цього тижня.`;

    const art1ContentEn = `Apple has officially revealed the architectural specifications for its flagship M4 Pro and M4 Max system-on-chip silicon.

Built on the enhanced second-generation 3nm (N3E) fabrication process, power efficiency has gained a 25% boost compared to the prior M3 generation. The most prominent structural upgrade includes the unified memory subsystem and native Thunderbolt 5 support reaching up to 120 Gbps bandwidth.

Key Architectural Highlights:
- Up to 16 CPU cores (12 performance and 4 high-efficiency cores)
- Second-generation hardware-accelerated ray tracing GPU engine
- Unified memory bandwidth peaking at 546 GB/s on the M4 Max variant
- 16-core Neural Engine specialized for sub-millisecond local Apple Intelligence inference.

Retail units featuring these processors begin shipping worldwide this week.`;

    insertArticle.run(
      art1Id,
      'src_wylsa',
      'src_art_m4',
      'https://wylsa.com/apple-m4-pro-max-details/',
      'Олександр П.',
      now,
      art1TitleUk,
      'Новий стандарт обчислень для професійних Mac',
      art1ExcerptUk,
      art1ContentUk,
      'cat_gadgets',
      'author_editorial_techorbit',
      null,
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&h=680&fit=crop&q=80',
      'PUBLISHED',
      'fair_use_rewritten',
      'apple-m4-pro-m4-max-thunderbolt-5',
      'apple-m4-pro-m4-max-thunderbolt-5',
      now,
      now,
      now,
      now,
      'hash_m4_content_v1'
    );

    insertVersion.run(
      'ver_m4_1',
      art1Id,
      1,
      art1TitleUk,
      art1ExcerptUk,
      art1ContentUk,
      'user_admin_initial',
      'Initial import, editorial rework and verification',
      now
    );

    insertTrans.run(
      'trans_m4_uk',
      art1Id,
      'uk',
      art1TitleUk,
      'Новий стандарт обчислень для професійних Mac',
      art1ExcerptUk,
      art1ContentUk,
      'apple-m4-pro-m4-max-thunderbolt-5',
      'published',
      0,
      'user_admin_initial',
      now
    );

    insertTrans.run(
      'trans_m4_en',
      art1Id,
      'en',
      art1TitleEn,
      'Next-generation computing standard for professional Macs',
      art1ExcerptEn,
      art1ContentEn,
      'apple-m4-pro-m4-max-thunderbolt-5',
      'published',
      1,
      'user_admin_initial',
      now
    );

    // Article 2: PENDING_REVIEW article in Moderation Queue
    const art2Id = 'art_quantum_chip_google';
    const art2TitleUk = 'Google анонсувала квантовий процесор Willow зі стійкістю до помилок';
    const art2TitleEn = 'Google Announces Willow Quantum Chip with Real-time Error Reduction';
    const art2ExcerptUk = 'Процесор знижує рівень шуму експоненційно зі збільшенням кількості кубітів, роблячи практичні квантові обчислення значно ближчими.';
    const art2ExcerptEn = 'The breakthrough processor reduces error rates exponentially as more qubits are linked, marking a pivotal milestone for commercial quantum computing.';
    const art2ContentUk = `Дослідницький підрозділ Google Quantum AI презентував чіп нового покоління Willow. Головним досягненням команди стало практичне подолання порогу корекції квантових помилок: зі зростанням числа фізичних кубітів загальна кількість системних збоїв зменшується, а не накопичується.

Квантова перевага була підтверджена під час обчислення складних бенчмарків за кілька хвилин замість мільйонів років на класичних суперкомп'ютерах.`;
    const art2ContentEn = `Google Quantum AI has announced its latest generation processor, Willow. The key breakthrough is surpassing the quantum error threshold: scaling the number of qubits now measurably reduces errors rather than compounding them.`;

    insertArticle.run(
      art2Id,
      'src_theverge',
      'src_art_willow',
      'https://www.theverge.com/willow-quantum-chip',
      'Sarah Jeong',
      now,
      art2TitleUk,
      'Епоха практичних квантових алгоритмів',
      art2ExcerptUk,
      art2ContentUk,
      'cat_ai_software',
      'author_mykhailo',
      null,
      'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&h=680&fit=crop&q=80',
      'PENDING_REVIEW',
      'editorial_review',
      'google-willow-quantum-chip',
      'google-willow-quantum-chip',
      now,
      now,
      null,
      now,
      'hash_willow_v1'
    );

    insertVersion.run(
      'ver_willow_1',
      art2Id,
      1,
      art2TitleUk,
      art2ExcerptUk,
      art2ContentUk,
      'user_admin_initial',
      'Imported from The Verge source, translated into draft',
      now
    );

    insertTrans.run(
      'trans_willow_uk',
      art2Id,
      'uk',
      art2TitleUk,
      'Епоха практичних квантових алгоритмів',
      art2ExcerptUk,
      art2ContentUk,
      'google-willow-quantum-chip',
      'draft',
      1,
      null,
      now
    );

    // Article 3: IMPORTED article waiting for translation
    const art3Id = 'art_ev_solid_state';
    const art3TitleUk = 'Твердотільні акумулятори для EV: чи готова індустрія до масового випуску';
    const art3TitleEn = 'Solid-State EV Batteries: Is the Automotive Sector Ready for Mass Scale';
    const art3ExcerptUk = 'Аналіз нових патентів та виробничих ліній показує, що перші комерційні авто на твердотільних батареях з’являться раніше 2027 року.';
    const art3ExcerptEn = 'An analysis of battery gigafactories reveals solid-state cells may hit automotive production lines earlier than expected.';

    insertArticle.run(
      art3Id,
      'src_wylsa',
      'src_art_solid_ev',
      'https://wylsa.com/solid-state-batteries-ev-reality/',
      'Дмитро К.',
      now,
      art3TitleUk,
      'Революція запасу ходу та безпеки',
      art3ExcerptUk,
      art3ExcerptUk,
      'cat_auto_ev',
      'author_editorial_techorbit',
      null,
      'https://images.unsplash.com/photo-1558441719-aa34455441cb?w=1200&h=680&fit=crop&q=80',
      'PUBLISHED',
      'original',
      'solid-state-batteries-ev-reality',
      'solid-state-batteries-ev-reality',
      now,
      now,
      now,
      now,
      'hash_ev_solid_v1'
    );

    insertTrans.run(
      'trans_ev_uk',
      art3Id,
      'uk',
      art3TitleUk,
      'Революція запасу ходу та безпеки',
      art3ExcerptUk,
      'Твердотільні електроліти замінюють традиційні рідкі розчини, пропонуючи значно вищу енергетичну щільність та відсутність ризику загоряння. Провідні автовиробники, включаючи Toyota, QuantumScape та BMW, уже проводять дорожні випробування тестових прототипів з пробігом понад 1000 км на одному заряді.',
      'solid-state-batteries-ev-reality',
      'approved',
      0,
      'user_admin_initial',
      now
    );

    insertTrans.run(
      'trans_ev_en',
      art3Id,
      'en',
      art3TitleEn,
      'A revolution in range and safety',
      art3ExcerptEn,
      'Solid-state electrolytes replace volatile liquid solutions, providing dramatically higher volumetric energy density and near-zero thermal runaway risk. Tier-one automakers including Toyota, QuantumScape, and BMW are actively road-testing pre-production prototypes achieving over 600 miles on a single charge.',
      'solid-state-batteries-ev-reality',
      'approved',
      1,
      'user_admin_initial',
      now
    );

    // Article 4: Review - Samsung Galaxy S26 Ultra
    const art4Id = 'art_samsung_s26_ultra';
    insertArticle.run(
      art4Id,
      null,
      null,
      null,
      'Михайло Орлов',
      now,
      'Огляд Samsung Galaxy S26 Ultra: новий еталон мобільної фотографії та вбудованого ШІ',
      '10-кратний перископ, титановий корпус та надшвидкий Snapdragon 8 Gen 5',
      'Детальний тест флагмана: екран без відблисків, автономність понад 14 годин та нові можливості Galaxy AI з локальною обробкою запитів.',
      'Samsung Galaxy S26 Ultra демонструє пікову зрілість лінійки Ultra. Нове антиблікове скло Gorilla Glass Armor 2 повністю прибирає віддзеркалення сонця, а новий сенсор камери на 200 Мп з оптикою f/1.6 забезпечує надзвичайну деталізацію нічних кадрів.',
      'cat_smartphones',
      'author_mykhailo',
      null,
      'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=1200&h=680&fit=crop&q=80',
      'PUBLISHED',
      'original',
      'samsung-galaxy-s26-ultra-review',
      'samsung-galaxy-s26-ultra-review',
      now,
      now,
      now,
      now,
      'hash_s26_v1'
    );
    try {
      db.prepare("UPDATE articles SET article_type = 'review', review_score = 9.4, views_count = 4320 WHERE id = ?").run(art4Id);
    } catch {}

    insertTrans.run(
      'trans_s26_uk',
      art4Id,
      'uk',
      'Огляд Samsung Galaxy S26 Ultra: новий еталон мобільної фотографії та вбудованого ШІ',
      '10-кратний перископ, титановий корпус та надшвидкий Snapdragon 8 Gen 5',
      'Детальний тест флагмана: екран без відблисків, автономність понад 14 годин та нові можливості Galaxy AI з локальною обробкою запитів.',
      'Samsung Galaxy S26 Ultra демонструє пікову зрілість лінійки Ultra. Нове антиблікове скло Gorilla Glass Armor 2 повністю прибирає віддзеркалення сонця, а новий сенсор камери на 200 Мп з оптикою f/1.6 забезпечує надзвичайну деталізацію нічних кадрів.',
      'samsung-galaxy-s26-ultra-review',
      'approved',
      0,
      'user_admin_initial',
      now
    );

    insertTrans.run(
      'trans_s26_en',
      art4Id,
      'en',
      'Samsung Galaxy S26 Ultra In-Depth Review: The Benchmark for Mobile Photography and Local AI',
      '10x Periscope zoom, refined titanium chassis and cutting-edge Snapdragon 8 Gen 5',
      'Comprehensive testing of Samsung’s supreme flagship: anti-reflective display mastery, 14+ hours of active battery life, and latency-free on-device Galaxy AI.',
      'The Samsung Galaxy S26 Ultra represents peak mobile refinement. With next-generation Gorilla Glass Armor 2 eliminating reflections and an overhauled 200MP optical array, it sets an undeniable gold standard for power users.',
      'samsung-galaxy-s26-ultra-review',
      'approved',
      1,
      'user_admin_initial',
      now
    );

    // Article 5: Review - Apple Vision Air
    const art5Id = 'art_apple_vision_air';
    insertArticle.run(
      art5Id,
      null,
      null,
      null,
      'Михайло Орлов',
      now,
      'Огляд Apple Vision Air: чи став полегшений просторовий комп’ютер масовим продуктом',
      'Мінус 200 грамів ваги, ціна утричі нижча та оновлена visionOS 3',
      'Два тижні щоденної роботи та перегляду медіа у просторовій гарнітурі: ергономіка, мікро-OLED дисплеї та нові сценарії багатовіконності.',
      'Apple прислухалася до критиків оригінального Vision Pro: прибравши зовнішній екран EyeSight та оптимізувавши магнієву раму, інженерам вдалося знизити вагу до 380 грамів. Тепер гарнітуру можна комфортно носити годинами без втоми шиї.',
      'cat_gadgets',
      'author_mykhailo',
      null,
      'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=1200&h=680&fit=crop&q=80',
      'PUBLISHED',
      'original',
      'apple-vision-air-review',
      'apple-vision-air-review',
      now,
      now,
      now,
      now,
      'hash_vair_v1'
    );
    try {
      db.prepare("UPDATE articles SET article_type = 'review', review_score = 9.1, views_count = 7850 WHERE id = ?").run(art5Id);
    } catch {}

    insertTrans.run(
      'trans_vair_uk',
      art5Id,
      'uk',
      'Огляд Apple Vision Air: чи став полегшений просторовий комп’ютер масовим продуктом',
      'Мінус 200 грамів ваги, ціна утричі нижча та оновлена visionOS 3',
      'Два тижні щоденної роботи та перегляду медіа у просторовій гарнітурі: ергономіка, мікро-OLED дисплеї та нові сценарії багатовіконності.',
      'Apple прислухалася до критиків оригінального Vision Pro: прибравши зовнішній екран EyeSight та оптимізувавши магнієву раму, інженерам вдалося знизити вагу до 380 грамів.',
      'apple-vision-air-review',
      'approved',
      0,
      'user_admin_initial',
      now
    );

    insertTrans.run(
      'trans_vair_en',
      art5Id,
      'en',
      'Apple Vision Air In-Depth Review: Has Spatial Computing Finally Found Its Mass Audience?',
      '200 grams lighter, three times more accessible, powered by visionOS 3',
      'Two weeks of intensive daily workflows and cinematic viewing inside Apple’s lightweight spatial computer: comfort, micro-OLED clarity, and Mac virtual display integration.',
      'Apple clearly listened to feedback on the pioneering Vision Pro. By shaving off the heavy EyeSight outer panel and designing a featherweight magnesium frame, total weight dropped to 380 grams.',
      'apple-vision-air-review',
      'approved',
      1,
      'user_admin_initial',
      now
    );

    // Article 6: News - Nvidia Blackwell Ultra
    const art6Id = 'art_nvidia_blackwell';
    insertArticle.run(
      art6Id,
      null,
      null,
      null,
      'Редакція TechOrbit',
      now,
      'Архітектура Nvidia Blackwell Ultra: як нові тензорні ядра змінюють швидкість навчання ШІ',
      'FP4 обчислення, рідинне охолодження серверів та 30-кратний приріст у виведенні',
      'Технічний розбір архітектури Blackwell: пропускна здатність NVLink 5, пам’ять HBM3e та енергетична ефективність нового кремнієвого гіганта.',
      'Nvidia офіційно представила повні специфікації платформи Blackwell Ultra. Завдяки з’єднанню двох кристалів через надшвидкісний міст зі швидкістю 10 ТБ/с, система здатна обробляти трильйонні параметри мовних моделей без затримок пам’яті.',
      'cat_ai_software',
      'author_editorial_techorbit',
      null,
      'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=1200&h=680&fit=crop&q=80',
      'PUBLISHED',
      'original',
      'nvidia-blackwell-ultra-architecture',
      'nvidia-blackwell-ultra-architecture',
      now,
      now,
      now,
      now,
      'hash_bwell_v1'
    );
    try {
      db.prepare("UPDATE articles SET article_type = 'news', views_count = 3410 WHERE id = ?").run(art6Id);
    } catch {}

    insertTrans.run(
      'trans_bwell_uk',
      art6Id,
      'uk',
      'Архітектура Nvidia Blackwell Ultra: як нові тензорні ядра змінюють швидкість навчання ШІ',
      'FP4 обчислення, рідинне охолодження серверів та 30-кратний приріст у виведенні',
      'Технічний розбір архітектури Blackwell: пропускна здатність NVLink 5, пам’ять HBM3e та енергетична ефективність нового кремнієвого гіганта.',
      'Nvidia офіційно представила повні специфікації платформи Blackwell Ultra. Завдяки з’єднанню двох кристалів через надшвидкісний міст зі швидкістю 10 ТБ/с, система здатна обробляти трильйонні параметри мовних моделей без затримок пам’яті.',
      'nvidia-blackwell-ultra-architecture',
      'approved',
      0,
      'user_admin_initial',
      now
    );

    insertTrans.run(
      'trans_bwell_en',
      art6Id,
      'en',
      'Nvidia Blackwell Ultra Architecture: How Next-Gen Tensor Cores Reshape Frontier AI',
      'FP4 tensor micro-scaling, liquid-cooled rack infrastructure, and 30x inference gains',
      'A deep engineering breakdown of Blackwell: NVLink 5 bi-directional bandwidth, HBM3e density, and silicon-level energy efficiency.',
      'Nvidia released complete silicon specifications for the Blackwell Ultra architecture. Combining two massive dies across a 10 TB/s interconnect, the chip effortlessly accommodates multi-trillion parameter neural networks.',
      'nvidia-blackwell-ultra-architecture',
      'approved',
      1,
      'user_admin_initial',
      now
    );

    // Article 7: Review - Sonos Ace 2
    const art7Id = 'art_sonos_ace_2';
    insertArticle.run(
      art7Id,
      null,
      null,
      null,
      'Редакція TechOrbit',
      now,
      'Огляд Sonos Ace 2: бездротові навушники з бездоганним звуком та Wi-Fi Lossless',
      'Виправлення дитячих хвороб першого покоління та миттєвий Sound Swap з телевізором',
      'Порівняння з AirPods Max та Sony WH-1000XM5: якість активного шумозаглушення, мікрофони для дзвінків та новий динамічний еквалайзер TrueCinema.',
      'Sonos Ace 2 отримали оновлений 40-мм динамічний драйвер зі спеціальною берилієвою діафрагмою. Звучання стало помітно відкритішим, з винятково швидкими транзієнтами та глибоким текстурованим басом.',
      'cat_audio',
      'author_editorial_techorbit',
      null,
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&h=680&fit=crop&q=80',
      'PUBLISHED',
      'original',
      'sonos-ace-2-headphones-review',
      'sonos-ace-2-headphones-review',
      now,
      now,
      now,
      now,
      'hash_sonos_v1'
    );
    try {
      db.prepare("UPDATE articles SET article_type = 'review', review_score = 8.9, views_count = 2190 WHERE id = ?").run(art7Id);
    } catch {}

    insertTrans.run(
      'trans_sonos_uk',
      art7Id,
      'uk',
      'Огляд Sonos Ace 2: бездротові навушники з бездоганним звуком та Wi-Fi Lossless',
      'Виправлення дитячих хвороб першого покоління та миттєвий Sound Swap з телевізором',
      'Порівняння з AirPods Max та Sony WH-1000XM5: якість активного шумозаглушення, мікрофони для дзвінків та новий динамічний еквалайзер TrueCinema.',
      'Sonos Ace 2 отримали оновлений 40-мм динамічний драйвер зі спеціальною берилієвою діафрагмою.',
      'sonos-ace-2-headphones-review',
      'approved',
      0,
      'user_admin_initial',
      now
    );

    insertTrans.run(
      'trans_sonos_en',
      art7Id,
      'en',
      'Sonos Ace 2 Headphones Review: Audiophile Wireless Sound and Seamless Wi-Fi Lossless',
      'Refined second-generation acoustic tuning and instant TV Sound Swap',
      'Head-to-head comparison with AirPods Max and Sony WH-1000XM5: noise cancellation, dual-beamforming voice isolation, and TrueCinema spatial tracking.',
      'The Sonos Ace 2 features an upgraded 40mm custom beryllium transducer. Acoustically, the presentation is expansive, resolving minute micro-details with punchy, controlled low-end authority.',
      'sonos-ace-2-headphones-review',
      'approved',
      1,
      'user_admin_initial',
      now
    );

    // Article 8: News - Steam Deck 2 OLED
    const art8Id = 'art_steam_deck_2_oled';
    insertArticle.run(
      art8Id,
      null,
      null,
      null,
      'Михайло Орлов',
      now,
      'Steam Deck 2 OLED: витік характеристик та перші бенчмарки кастомного чипа AMD',
      'Zen 5 + RDNA 3.5, 120 Гц VRR дисплей та підтримка швидкого Wi-Fi 7',
      'Valve готує нове покоління портативної консолі зі значним приростом енергоефективності та стабільними 60 FPS у Cyberpunk 2077 на високих налаштуваннях.',
      'Згідно з витоками з митної бази даних, Valve тестує інженерний зразок з процесором AMD під кодовою назвою "Sephiroth 2". Чип поєднує 6 ядер Zen 5 з 16 обчислювальними блоками RDNA 3.5 при TDP до 22 Вт.',
      'cat_gaming',
      'author_mykhailo',
      null,
      'https://images.unsplash.com/photo-1612287233207-6b45f4df21fb?w=1200&h=680&fit=crop&q=80',
      'PUBLISHED',
      'original',
      'steam-deck-2-oled-specs-leak',
      'steam-deck-2-oled-specs-leak',
      now,
      now,
      now,
      now,
      'hash_sdeck_v1'
    );
    try {
      db.prepare("UPDATE articles SET article_type = 'news', views_count = 5620 WHERE id = ?").run(art8Id);
    } catch {}

    insertTrans.run(
      'trans_sdeck_uk',
      art8Id,
      'uk',
      'Steam Deck 2 OLED: витік характеристик та перші бенчмарки кастомного чипа AMD',
      'Zen 5 + RDNA 3.5, 120 Гц VRR дисплей та підтримка швидкого Wi-Fi 7',
      'Valve готує нове покоління портативної консолі зі значним приростом енергоефективності та стабільними 60 FPS у Cyberpunk 2077 на високих налаштуваннях.',
      'Згідно з витоками з митної бази даних, Valve тестує інженерний зразок з процесором AMD під кодовою назвою "Sephiroth 2".',
      'steam-deck-2-oled-specs-leak',
      'approved',
      0,
      'user_admin_initial',
      now
    );

    insertTrans.run(
      'trans_sdeck_en',
      art8Id,
      'en',
      'Steam Deck 2 OLED: Leaked Specifications and Early Benchmarks of AMD’s Custom APU',
      'Zen 5 cores, RDNA 3.5 graphics, 120Hz Variable Refresh Display, and Wi-Fi 7',
      'Valve is engineering its next-generation handheld with massive thermal headroom and a projected 60 FPS lock in demanding AAA titles.',
      'Customs manifests disclose that Valve is actively validating engineering test boards equipped with AMD silicon codenamed "Sephiroth 2", combining 6 Zen 5 cores with 16 RDNA 3.5 Compute Units at up to 22W TDP.',
      'steam-deck-2-oled-specs-leak',
      'approved',
      1,
      'user_admin_initial',
      now
    );

    // Add a change event for the review queue
    const insertChange = db.prepare(`
      INSERT OR IGNORE INTO change_events (id, source_article_id, article_id, event_type, diff_summary, previous_hash, new_hash, status, detected_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review', ?)
    `);

    insertChange.run(
      'change_evt_01',
      'src_art_willow',
      art2Id,
      'content_updated',
      'Source updated benchmark metrics and error rate coefficients',
      'hash_willow_v1',
      'hash_willow_v2',
      now
    );

    // Add sample notifications
    const insertNotif = db.prepare(`
      INSERT OR IGNORE INTO notifications (id, type, title, message, link, read, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `);
    insertNotif.run(
      'notif_01',
      'change_detected',
      'Оновлення матеріалу на першоджерелі',
      'Виявлено зміну вмісту статті Google Willow на The Verge. Потрібна перевірка дифів.',
      '/admin/changes',
      now
    );
    insertNotif.run(
      'notif_02',
      'review_required',
      'Новий матеріал очікує модерації',
      'Стаття про чипи M4 Max готова до публікації та перевірена редактором.',
      '/admin/review-queue',
      now
    );

    // Ensure all articles have non-zero views and appropriate types
    try {
      db.prepare("UPDATE articles SET article_type = 'news', views_count = 3450 WHERE id = 'art_m4_max_chips' AND (views_count IS NULL OR views_count = 0)").run();
      db.prepare("UPDATE articles SET article_type = 'news', views_count = 6890 WHERE id = 'art_quantum_chip_google' AND (views_count IS NULL OR views_count = 0)").run();
      db.prepare("UPDATE articles SET article_type = 'news', views_count = 5120 WHERE id = 'art_ev_solid_state' AND (views_count IS NULL OR views_count = 0)").run();
    } catch {}
  }
}
