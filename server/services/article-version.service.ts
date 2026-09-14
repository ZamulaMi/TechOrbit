import { db } from '../db/database.ts';
import { ArticleVersion } from '../types/index.ts';
import { ArticleService } from './article.service.ts';

export class ArticleVersionService {
  static getVersionsForArticle(articleId: string): ArticleVersion[] {
    const stmt = db.prepare(`
      SELECT av.*, u.username as changed_by_username
      FROM article_versions av
      LEFT JOIN users u ON u.id = av.changed_by
      WHERE av.article_id = ?
      ORDER BY av.version_number DESC
    `);
    return stmt.all(articleId) as unknown as ArticleVersion[];
  }

  static getVersionById(id: string): ArticleVersion | null {
    const stmt = db.prepare('SELECT * FROM article_versions WHERE id = ?');
    return (stmt.get(id) as any) || null;
  }

  static rollbackToVersion(articleId: string, versionId: string, userId: string): boolean {
    const targetVersion = this.getVersionById(versionId);
    if (!targetVersion || targetVersion.article_id !== articleId) {
      return false;
    }

    ArticleService.updateArticle(
      articleId,
      {
        title: targetVersion.title,
        excerpt: targetVersion.excerpt,
        content: targetVersion.content
      },
      userId,
      `Rollback to version #${targetVersion.version_number}`
    );

    return true;
  }
}
