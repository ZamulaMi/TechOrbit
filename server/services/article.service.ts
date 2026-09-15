import { db } from '../db/database.ts';
import { Article, ArticleStatus, Language } from '../types/index.ts';

export class ArticleService {
  static slugify(text: string): string {
    const cyrToLatMap: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ye',
      'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l',
      'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'yu',
      'я': 'ya'
    };

    let slug = text.toLowerCase();
    slug = slug.split('').map(char => cyrToLatMap[char] || char).join('');
    return slug
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  }

  static getPublicArticles(options: {
    categorySlug?: string;
    categoryId?: string;
    tagSlug?: string;
    lang?: Language;
    limit?: number;
    offset?: number;
    search?: string;
    type?: 'news' | 'review' | 'all';
    sortBy?: 'latest' | 'popular' | 'trending' | 'title';
  } = {}): { articles: Article[]; total: number } {
    const lang = options.lang || 'uk';
    const limit = options.limit || 12;
    const offset = options.offset || 0;

    let whereClause = "WHERE a.status IN ('APPROVED', 'PUBLISHED')";
    const params: any[] = [];

    if (options.categorySlug) {
      whereClause += ' AND (c.slug_uk = ? OR c.slug_en = ?)';
      params.push(options.categorySlug, options.categorySlug);
    }

    if (options.categoryId) {
      whereClause += ' AND a.category_id = ?';
      params.push(options.categoryId);
    }

    if (options.type && options.type !== 'all') {
      if (options.type === 'review') {
        whereClause += " AND (a.article_type = 'review' OR LOWER(a.title) LIKE '%огляд%' OR LOWER(a.title) LIKE '%review%')";
      } else if (options.type === 'news') {
        whereClause += " AND (a.article_type = 'news' OR (a.article_type IS NULL AND LOWER(a.title) NOT LIKE '%огляд%' AND LOWER(a.title) NOT LIKE '%review%'))";
      }
    }

    if (options.search) {
      whereClause += ' AND (a.title LIKE ? OR a.excerpt LIKE ? OR a.content LIKE ?)';
      const term = `%${options.search}%`;
      params.push(term, term, term);
    }

    const countSql = `
      SELECT count(*) as count
      FROM articles a
      LEFT JOIN categories c ON c.id = a.category_id
      ${whereClause}
    `;
    const total = (db.prepare(countSql).get(...params) as { count: number }).count;

    let orderClause = 'ORDER BY a.published_at DESC, a.created_at DESC';
    if (options.sortBy === 'popular' || options.sortBy === 'trending') {
      orderClause = 'ORDER BY a.views_count DESC, a.published_at DESC';
    } else if (options.sortBy === 'title') {
      orderClause = 'ORDER BY title ASC';
    }

    const querySql = `
      SELECT
        a.*,
        COALESCE(te.title, a.title) as title,
        COALESCE(te.excerpt, a.excerpt) as excerpt,
        COALESCE(te.slug, a.slug_en) as slug_en,
        c.name_uk as category_name_uk,
        c.name_en as category_name_en,
        au.name as author_name,
        s.name as source_name
      FROM articles a
      LEFT JOIN categories c ON c.id = a.category_id
      LEFT JOIN authors au ON au.id = a.author_id
      LEFT JOIN sources s ON s.id = a.source_id
      LEFT JOIN article_translations te ON te.article_id = a.id AND te.language = 'en' AND '${lang}' = 'en'
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;

    const articles = db.prepare(querySql).all(...params, limit, offset) as unknown as Article[];
    return { articles, total };
  }

  static getRelatedArticles(articleId: string, limit: number = 4, lang: Language = 'uk'): Article[] {
    const current = db.prepare('SELECT id, category_id, title FROM articles WHERE id = ?').get(articleId) as any;
    if (!current) return [];

    const categoryId = current.category_id;
    const sql = `
      SELECT
        a.*,
        COALESCE(te.title, a.title) as title,
        COALESCE(te.excerpt, a.excerpt) as excerpt,
        COALESCE(te.slug, a.slug_en) as slug_en,
        c.name_uk as category_name_uk,
        c.name_en as category_name_en,
        au.name as author_name
      FROM articles a
      LEFT JOIN categories c ON c.id = a.category_id
      LEFT JOIN authors au ON au.id = a.author_id
      LEFT JOIN article_translations te ON te.article_id = a.id AND te.language = 'en' AND '${lang}' = 'en'
      WHERE a.id != ? AND a.status IN ('APPROVED', 'PUBLISHED')
      ORDER BY (CASE WHEN a.category_id = ? THEN 1 ELSE 2 END), a.published_at DESC
      LIMIT ?
    `;

    return db.prepare(sql).all(articleId, categoryId, limit) as unknown as Article[];
  }

  static searchPublicArticles(options: {
    query: string;
    lang?: Language;
    limit?: number;
    offset?: number;
  }): { articles: Article[]; total: number; query: string } {
    const lang = options.lang || 'uk';
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    const q = (options.query || '').trim();

    if (!q) {
      return { articles: [], total: 0, query: '' };
    }

    const term = `%${q}%`;
    const countSql = `
      SELECT count(DISTINCT a.id) as count
      FROM articles a
      LEFT JOIN categories c ON c.id = a.category_id
      LEFT JOIN article_translations t ON t.article_id = a.id
      WHERE a.status IN ('APPROVED', 'PUBLISHED')
        AND (
          a.title LIKE ? OR a.subtitle LIKE ? OR a.excerpt LIKE ? OR a.content LIKE ? OR a.tags_json LIKE ?
          OR c.name_uk LIKE ? OR c.name_en LIKE ?
          OR t.title LIKE ? OR t.excerpt LIKE ? OR t.content LIKE ?
        )
    `;

    const total = (db.prepare(countSql).get(
      term, term, term, term, term,
      term, term,
      term, term, term
    ) as { count: number }).count;

    const querySql = `
      SELECT DISTINCT
        a.*,
        COALESCE(te.title, a.title) as title,
        COALESCE(te.excerpt, a.excerpt) as excerpt,
        COALESCE(te.slug, a.slug_en) as slug_en,
        c.name_uk as category_name_uk,
        c.name_en as category_name_en,
        au.name as author_name,
        s.name as source_name
      FROM articles a
      LEFT JOIN categories c ON c.id = a.category_id
      LEFT JOIN authors au ON au.id = a.author_id
      LEFT JOIN sources s ON s.id = a.source_id
      LEFT JOIN article_translations te ON te.article_id = a.id AND te.language = 'en' AND '${lang}' = 'en'
      LEFT JOIN article_translations tsearch ON tsearch.article_id = a.id
      WHERE a.status IN ('APPROVED', 'PUBLISHED')
        AND (
          a.title LIKE ? OR a.subtitle LIKE ? OR a.excerpt LIKE ? OR a.content LIKE ? OR a.tags_json LIKE ?
          OR c.name_uk LIKE ? OR c.name_en LIKE ?
          OR tsearch.title LIKE ? OR tsearch.excerpt LIKE ? OR tsearch.content LIKE ?
        )
      ORDER BY
        (CASE
          WHEN LOWER(a.title) LIKE LOWER(?) THEN 1
          WHEN LOWER(te.title) LIKE LOWER(?) THEN 1
          WHEN LOWER(a.excerpt) LIKE LOWER(?) THEN 2
          ELSE 3
        END) ASC,
        a.published_at DESC
      LIMIT ? OFFSET ?
    `;

    const articles = db.prepare(querySql).all(
      term, term, term, term, term,
      term, term,
      term, term, term,
      term, term, term,
      limit, offset
    ) as unknown as Article[];

    return { articles, total, query: q };
  }

  static getPublicArticleBySlug(slug: string, lang: Language = 'uk'): Article | null {
    const sql = `
      SELECT
        a.*,
        c.name_uk as category_name_uk,
        c.name_en as category_name_en,
        au.name as author_name,
        s.name as source_name
      FROM articles a
      LEFT JOIN categories c ON c.id = a.category_id
      LEFT JOIN authors au ON au.id = a.author_id
      LEFT JOIN sources s ON s.id = a.source_id
      WHERE (a.slug_uk = ? OR a.slug_en = ? OR a.id IN (SELECT article_id FROM article_translations WHERE slug = ?))
        AND a.status IN ('APPROVED', 'PUBLISHED')
      LIMIT 1
    `;
    const art = db.prepare(sql).get(slug, slug, slug) as any;
    if (!art) return null;

    if (lang === 'en' || art.slug_en === slug) {
      const trans = db.prepare('SELECT * FROM article_translations WHERE article_id = ? AND language = ?').get(art.id, 'en') as any;
      if (trans) {
        art.title = trans.title || art.title;
        art.subtitle = trans.subtitle || art.subtitle;
        art.excerpt = trans.excerpt || art.excerpt;
        art.content = trans.content || art.content;
        if (trans.structured_blocks_json && trans.structured_blocks_json !== '[]') {
          art.structured_blocks_json = trans.structured_blocks_json;
        }
        art.meta_title_en = trans.meta_title || art.meta_title_en;
        art.meta_desc_en = trans.meta_description || art.meta_desc_en;
      }
    }

    return art;
  }

  static getAdminArticles(options: {
    status?: ArticleStatus;
    categoryId?: string;
    sourceId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): { articles: Article[]; total: number } {
    const limit = options.limit || 25;
    const offset = options.offset || 0;

    const conditions: string[] = [];
    const params: any[] = [];

    if (options.status) {
      conditions.push('a.status = ?');
      params.push(options.status);
    }

    if (options.categoryId) {
      conditions.push('a.category_id = ?');
      params.push(options.categoryId);
    }

    if (options.sourceId) {
      conditions.push('a.source_id = ?');
      params.push(options.sourceId);
    }

    if (options.search) {
      conditions.push('(a.title LIKE ? OR a.excerpt LIKE ? OR a.source_url LIKE ?)');
      const term = `%${options.search}%`;
      params.push(term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `
      SELECT count(*) as count
      FROM articles a
      ${whereClause}
    `;
    const total = (db.prepare(countSql).get(...params) as { count: number }).count;

    const querySql = `
      SELECT
        a.*,
        c.name_uk as category_name_uk,
        c.name_en as category_name_en,
        au.name as author_name,
        s.name as source_name
      FROM articles a
      LEFT JOIN categories c ON c.id = a.category_id
      LEFT JOIN authors au ON au.id = a.author_id
      LEFT JOIN sources s ON s.id = a.source_id
      ${whereClause}
      ORDER BY a.updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const articles = db.prepare(querySql).all(...params, limit, offset) as unknown as Article[];
    return { articles, total };
  }

  static getArticleById(id: string): Article | null {
    const sql = `
      SELECT
        a.*,
        c.name_uk as category_name_uk,
        c.name_en as category_name_en,
        au.name as author_name,
        s.name as source_name
      FROM articles a
      LEFT JOIN categories c ON c.id = a.category_id
      LEFT JOIN authors au ON au.id = a.author_id
      LEFT JOIN sources s ON s.id = a.source_id
      WHERE a.id = ?
    `;
    return (db.prepare(sql).get(id) as any) || null;
  }

  static createArticle(data: Partial<Article>, userId: string): Article {
    const id = data.id || 'art_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const title = data.title || 'Untitled Article';
    const slugUk = data.slug_uk || this.slugify(title);
    const slugEn = data.slug_en || this.slugify(data.title || 'untitled');

    const stmt = db.prepare(`
      INSERT INTO articles (
        id, source_id, source_article_id, source_url, source_author, source_published_at,
        title, subtitle, excerpt, content, category_id, author_id,
        featured_image_id, featured_image_url, status, rights_status,
        slug_uk, slug_en, created_at, updated_at, published_at,
        last_source_check, source_content_hash,
        article_type, review_score, views_count
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?
      )
    `);

    stmt.run(
      id,
      data.source_id || null,
      data.source_article_id || null,
      data.source_url || null,
      data.source_author || null,
      data.source_published_at || null,
      title,
      data.subtitle || '',
      data.excerpt || '',
      data.content || '',
      data.category_id || null,
      data.author_id || null,
      data.featured_image_id || null,
      data.featured_image_url || null,
      data.status || 'DRAFT',
      data.rights_status || 'editorial_original',
      slugUk,
      slugEn,
      now,
      now,
      data.status === 'PUBLISHED' ? now : null,
      now,
      data.source_content_hash || null,
      data.article_type || 'news',
      data.review_score ?? null,
      data.views_count || 0
    );

    // Create initial version 1
    db.prepare(`
      INSERT INTO article_versions (id, article_id, version_number, title, excerpt, content, changed_by, change_reason, created_at)
      VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)
    `).run('ver_' + Date.now(), id, title, data.excerpt || '', data.content || '', userId, 'Initial creation', now);

    return this.getArticleById(id)!;
  }

  static updateArticle(id: string, data: Partial<Article>, userId: string, changeReason: string = 'Editorial update'): Article | null {
    const existing = this.getArticleById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated = { ...existing, ...data, updated_at: now };

    if (data.status === 'PUBLISHED' && !existing.published_at) {
      updated.published_at = now;
    }

    const stmt = db.prepare(`
      UPDATE articles SET
        title = ?,
        subtitle = ?,
        excerpt = ?,
        content = ?,
        category_id = ?,
        author_id = ?,
        featured_image_url = ?,
        status = ?,
        rights_status = ?,
        slug_uk = ?,
        slug_en = ?,
        structured_blocks_json = ?,
        meta_title_uk = ?,
        meta_title_en = ?,
        meta_desc_uk = ?,
        meta_desc_en = ?,
        tags_json = ?,
        translation_status = COALESCE(?, translation_status),
        article_type = COALESCE(?, article_type),
        review_score = COALESCE(?, review_score),
        views_count = COALESCE(?, views_count),
        updated_at = ?,
        published_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.title,
      updated.subtitle || '',
      updated.excerpt,
      updated.content,
      updated.category_id,
      updated.author_id,
      updated.featured_image_url,
      updated.status,
      updated.rights_status,
      updated.slug_uk,
      updated.slug_en,
      updated.structured_blocks_json || existing.structured_blocks_json || '[]',
      updated.meta_title_uk || existing.meta_title_uk || '',
      updated.meta_title_en || existing.meta_title_en || '',
      updated.meta_desc_uk || existing.meta_desc_uk || '',
      updated.meta_desc_en || existing.meta_desc_en || '',
      updated.tags_json || existing.tags_json || '[]',
      data.translation_status || null,
      data.article_type || null,
      data.review_score !== undefined ? data.review_score : null,
      data.views_count !== undefined ? data.views_count : null,
      now,
      updated.published_at,
      id
    );

    // Save article version if title, excerpt or content changed
    if (
      data.title !== undefined ||
      data.content !== undefined ||
      data.excerpt !== undefined
    ) {
      const lastVer = db.prepare(`
        SELECT max(version_number) as max_ver FROM article_versions WHERE article_id = ?
      `).get(id) as { max_ver: number | null };

      const nextVerNum = (lastVer?.max_ver || 0) + 1;
      db.prepare(`
        INSERT INTO article_versions (id, article_id, version_number, title, excerpt, content, changed_by, change_reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'ver_' + Date.now() + '_' + nextVerNum,
        id,
        nextVerNum,
        updated.title,
        updated.excerpt,
        updated.content,
        userId,
        changeReason,
        now
      );
    }

    return this.getArticleById(id);
  }

  static updateStatus(id: string, newStatus: ArticleStatus, userId: string, reason: string = ''): Article | null {
    const existing = this.getArticleById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    let publishedAt = existing.published_at;
    if (newStatus === 'PUBLISHED' && !publishedAt) {
      publishedAt = now;
    }

    db.prepare(`
      UPDATE articles SET status = ?, updated_at = ?, published_at = ? WHERE id = ?
    `).run(newStatus, now, publishedAt, id);

    return this.getArticleById(id);
  }

  static deleteArticle(id: string): boolean {
    const res = db.prepare('DELETE FROM articles WHERE id = ?').run(id);
    return res.changes > 0;
  }
}
