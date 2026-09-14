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
    tagSlug?: string;
    lang?: Language;
    limit?: number;
    offset?: number;
    search?: string;
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
      ORDER BY a.published_at DESC, a.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const articles = db.prepare(querySql).all(...params, limit, offset) as unknown as Article[];
    return { articles, total };
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
      WHERE (a.slug_uk = ? OR a.slug_en = ?) AND a.status IN ('APPROVED', 'PUBLISHED')
      LIMIT 1
    `;
    const art = db.prepare(sql).get(slug, slug) as any;
    return art || null;
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
        last_source_check, source_content_hash
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?
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
      data.source_content_hash || null
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
        updated_at = ?,
        published_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.title,
      updated.subtitle,
      updated.excerpt,
      updated.content,
      updated.category_id,
      updated.author_id,
      updated.featured_image_url,
      updated.status,
      updated.rights_status,
      updated.slug_uk,
      updated.slug_en,
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
