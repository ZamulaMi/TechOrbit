import { db } from '../db/database.ts';
import { Article, ArticleStatus } from '../types/index.ts';
import { ArticleService } from './article.service.ts';
import { AuditService } from './audit.service.ts';
import { NotificationService } from './notification.service.ts';

export interface ReviewQueueGroups {
  newArticles: Article[];
  updatedArticles: Article[];
  translationsPending: Article[];
  publishingReady: Article[];
  counts: {
    newArticles: number;
    updatedArticles: number;
    translationsPending: number;
    publishingReady: number;
  };
}

export class PublishingService {
  /**
   * Retrieves structured review queue divided into:
   * 1. New Articles (PENDING_REVIEW)
   * 2. Updated Articles (UPDATE_PENDING)
   * 3. Translations Pending (NOT_STARTED, IN_PROGRESS, READY_FOR_REVIEW)
   * 4. Publishing Ready (APPROVED, DRAFT)
   */
  static getCategorizedReviewQueue(filters: {
    sourceId?: string;
    categoryId?: string;
    search?: string;
  } = {}): ReviewQueueGroups {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.sourceId && filters.sourceId !== 'ALL') {
      conditions.push('a.source_id = ?');
      params.push(filters.sourceId);
    }

    if (filters.categoryId && filters.categoryId !== 'ALL') {
      conditions.push('a.category_id = ?');
      params.push(filters.categoryId);
    }

    if (filters.search && filters.search.trim()) {
      conditions.push('(a.title LIKE ? OR a.excerpt LIKE ?)');
      const term = `%${filters.search.trim()}%`;
      params.push(term, term);
    }

    const whereExtra = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const baseSql = `
      SELECT
        a.*,
        c.name_uk as category_name_uk,
        c.name_en as category_name_en,
        au.name as author_name,
        s.name as source_name,
        (SELECT count(*) FROM change_events ce WHERE ce.article_id = a.id AND ce.status = 'PENDING') as pending_changes_count
      FROM articles a
      LEFT JOIN categories c ON c.id = a.category_id
      LEFT JOIN authors au ON au.id = a.author_id
      LEFT JOIN sources s ON s.id = a.source_id
    `;

    // 1. New articles
    const newArticles = db.prepare(`
      ${baseSql}
      WHERE a.status = 'PENDING_REVIEW' ${whereExtra}
      ORDER BY a.created_at DESC
    `).all(...params) as unknown as Article[];

    // 2. Updated articles
    const updatedArticles = db.prepare(`
      ${baseSql}
      WHERE a.status = 'UPDATE_PENDING' ${whereExtra}
      ORDER BY a.updated_at DESC
    `).all(...params) as unknown as Article[];

    // 3. Translations Pending
    const translationsPending = db.prepare(`
      ${baseSql}
      WHERE (a.translation_status IN ('NOT_STARTED', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'pending', 'draft') OR a.translation_status IS NULL)
        AND a.status != 'REJECTED'
        ${whereExtra}
      ORDER BY a.updated_at DESC
    `).all(...params) as unknown as Article[];

    // 4. Publishing Ready
    const publishingReady = db.prepare(`
      ${baseSql}
      WHERE a.status IN ('APPROVED', 'DRAFT') ${whereExtra}
      ORDER BY a.updated_at DESC
    `).all(...params) as unknown as Article[];

    return {
      newArticles,
      updatedArticles,
      translationsPending,
      publishingReady,
      counts: {
        newArticles: newArticles.length,
        updatedArticles: updatedArticles.length,
        translationsPending: translationsPending.length,
        publishingReady: publishingReady.length
      }
    };
  }

  static getReviewQueue(): Article[] {
    const queue = this.getCategorizedReviewQueue();
    return [...queue.newArticles, ...queue.updatedArticles];
  }

  static approveArticle(articleId: string, userId: string): Article | null {
    const article = ArticleService.getArticleById(articleId);
    if (!article) return null;

    const updated = ArticleService.updateStatus(articleId, 'APPROVED', userId);

    AuditService.log({
      userId,
      action: 'ARTICLE_APPROVED',
      entityType: 'article',
      entityId: articleId,
      oldValues: { status: article.status },
      newValues: { status: 'APPROVED' }
    });

    NotificationService.create({
      type: 'review_required',
      title: 'Матеріал схвалено',
      message: `Статтю "${article.title.substring(0, 40)}" схвалено до публікації.`,
      link: `/admin/review`
    });

    return updated;
  }

  static publishArticle(articleId: string, userId: string): Article | null {
    const article = ArticleService.getArticleById(articleId);
    if (!article) return null;

    const updated = ArticleService.updateStatus(articleId, 'PUBLISHED', userId);

    AuditService.log({
      userId,
      action: 'ARTICLE_PUBLISHED',
      entityType: 'article',
      entityId: articleId,
      oldValues: { status: article.status },
      newValues: { status: 'PUBLISHED', published_at: updated?.published_at }
    });

    NotificationService.create({
      type: 'publish_success',
      title: 'Матеріал опубліковано на TechOrbit',
      message: `Стаття "${article.title.substring(0, 40)}" тепер публічно доступна на сайті.`,
      link: `/article/${article.slug_uk}`
    });

    return updated;
  }

  static rejectArticle(articleId: string, userId: string, reason: string): Article | null {
    const article = ArticleService.getArticleById(articleId);
    if (!article) return null;

    const updated = ArticleService.updateStatus(articleId, 'REJECTED', userId);

    AuditService.log({
      userId,
      action: 'ARTICLE_REJECTED',
      entityType: 'article',
      entityId: articleId,
      oldValues: { status: article.status },
      newValues: { status: 'REJECTED', reason }
    });

    return updated;
  }

  static updateTranslationStatus(
    articleId: string,
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'READY_FOR_REVIEW' | 'APPROVED',
    userId: string
  ): boolean {
    const now = new Date().toISOString();
    db.prepare('UPDATE articles SET translation_status = ?, updated_at = ? WHERE id = ?').run(status, now, articleId);

    AuditService.log({
      userId,
      action: 'TRANSLATION_STATUS_UPDATED',
      entityType: 'article',
      entityId: articleId,
      newValues: { translationStatus: status }
    });

    if (status === 'READY_FOR_REVIEW') {
      NotificationService.create({
        type: 'review_required',
        title: 'Переклад готовий до вичитки',
        message: `Переклад статті вимагає фінальної перевірки редактора.`,
        link: `/admin/review`
      });
    }

    return true;
  }
}
