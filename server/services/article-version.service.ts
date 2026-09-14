import { db } from '../db/database.ts';
import { ArticleVersion, StructuredDiff } from '../types/index.ts';
import { ArticleService } from './article.service.ts';
import { ContentNormalizer } from './content-normalizer.ts';
import { AuditService } from './audit.service.ts';

export class ArticleVersionService {
  static getVersionsForArticle(articleId: string): ArticleVersion[] {
    const stmt = db.prepare(`
      SELECT av.*, COALESCE(u.username, av.changed_by) as changed_by_username
      FROM article_versions av
      LEFT JOIN users u ON u.id = av.changed_by
      WHERE av.article_id = ?
      ORDER BY av.version_number DESC
    `);
    return stmt.all(articleId) as unknown as ArticleVersion[];
  }

  static getVersionById(id: string): ArticleVersion | null {
    const stmt = db.prepare(`
      SELECT av.*, COALESCE(u.username, av.changed_by) as changed_by_username
      FROM article_versions av
      LEFT JOIN users u ON u.id = av.changed_by
      WHERE av.id = ?
    `);
    return (stmt.get(id) as any) || null;
  }

  static compareVersions(v1Id: string, v2Id: string): {
    version1: ArticleVersion;
    version2: ArticleVersion;
    diff: StructuredDiff;
    summary: string;
  } | null {
    const v1 = this.getVersionById(v1Id);
    const v2 = this.getVersionById(v2Id);
    if (!v1 || !v2) return null;

    const diffResult = ContentNormalizer.buildDiff(
      {
        title: v1.title,
        subtitle: v1.subtitle,
        excerpt: v1.excerpt,
        content: v1.content,
        featured_image_url: v1.featured_image_url
      },
      {
        title: v2.title,
        subtitle: v2.subtitle,
        excerpt: v2.excerpt,
        content: v2.content,
        featured_image_url: v2.featured_image_url
      }
    );

    return {
      version1: v1,
      version2: v2,
      diff: diffResult.diff,
      summary: diffResult.summary
    };
  }

  static rollbackToVersion(articleId: string, versionId: string, userId: string): {
    success: boolean;
    newVersionNumber?: number;
    message: string;
  } {
    const targetVersion = this.getVersionById(versionId);
    if (!targetVersion || targetVersion.article_id !== articleId) {
      return { success: false, message: 'Цільову версію не знайдено' };
    }

    const updated = ArticleService.updateArticle(
      articleId,
      {
        title: targetVersion.title,
        subtitle: targetVersion.subtitle,
        excerpt: targetVersion.excerpt,
        content: targetVersion.content,
        featured_image_url: targetVersion.featured_image_url
      },
      userId,
      `Відновлено стан з версії #${targetVersion.version_number}`
    );

    if (!updated) {
      return { success: false, message: 'Помилка відновлення версії' };
    }

    const lastVer = db.prepare(`
      SELECT max(version_number) as max_ver FROM article_versions WHERE article_id = ?
    `).get(articleId) as { max_ver: number };

    AuditService.log({
      userId,
      action: 'RESTORE_ARTICLE_VERSION',
      entityType: 'article',
      entityId: articleId,
      newValues: {
        restoredFromVersion: targetVersion.version_number,
        newVersionNumber: lastVer.max_ver
      }
    });

    return {
      success: true,
      newVersionNumber: lastVer.max_ver,
      message: `Статтю успішно відновлено до стану версії #${targetVersion.version_number} (створено версію #${lastVer.max_ver}).`
    };
  }
}
