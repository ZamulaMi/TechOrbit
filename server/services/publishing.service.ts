import { db } from '../db/database.ts';
import { Article, ArticleStatus } from '../types/index.ts';
import { ArticleService } from './article.service.ts';
import { AuditService } from './audit.service.ts';
import { NotificationService } from './notification.service.ts';

export class PublishingService {
  static getReviewQueue(): Article[] {
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
      WHERE a.status IN ('PENDING_REVIEW', 'UPDATE_PENDING', 'IMPORTED')
      ORDER BY a.updated_at DESC
    `;
    return db.prepare(sql).all() as unknown as Article[];
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
      link: `/admin/articles`
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
}
