import crypto from 'crypto';
import { db } from '../db/database.ts';
import { ChangeEvent, SourceArticle, Article } from '../types/index.ts';
import { NotificationService } from './notification.service.ts';

export class ChangeDetectionService {
  static computeContentHash(content: string): string {
    return crypto.createHash('sha256').update(content.trim()).digest('hex');
  }

  static detectArticleChange(params: {
    sourceArticleId: string;
    articleId?: string | null;
    newTitle: string;
    newContent: string;
    sourceAuthor?: string;
  }): { hasChanged: boolean; changeEvent?: ChangeEvent } {
    const newHash = this.computeContentHash(params.newTitle + '\n\n' + params.newContent);

    // Retrieve previous source snapshot or article hash
    const prevSnapshot = db.prepare(`
      SELECT content_hash, title, raw_content
      FROM source_snapshots
      WHERE source_article_id = ?
      ORDER BY snapshot_at DESC
      LIMIT 1
    `).get(params.sourceArticleId) as { content_hash: string; title: string; raw_content: string } | undefined;

    let previousHash = prevSnapshot ? prevSnapshot.content_hash : null;

    if (!previousHash && params.articleId) {
      const art = db.prepare('SELECT source_content_hash FROM articles WHERE id = ?').get(params.articleId) as { source_content_hash: string } | undefined;
      if (art && art.source_content_hash) {
        previousHash = art.source_content_hash;
      }
    }

    if (previousHash && previousHash === newHash) {
      return { hasChanged: false };
    }

    // Has changed or is new!
    const id = 'change_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    let diffSummary = 'Source article modified.';
    let eventType: ChangeEvent['event_type'] = 'content_updated';

    if (!previousHash) {
      diffSummary = `New source article detected: "${params.newTitle.substring(0, 60)}"`;
      eventType = 'new_article';
    } else if (prevSnapshot && prevSnapshot.title !== params.newTitle) {
      diffSummary = `Title modified from "${prevSnapshot.title.substring(0, 40)}..." to "${params.newTitle.substring(0, 40)}..."`;
      eventType = 'title_updated';
    } else {
      diffSummary = `Body content updated. Length: ~${params.newContent.length} chars.`;
    }

    const stmt = db.prepare(`
      INSERT INTO change_events (
        id, source_article_id, article_id, event_type, diff_summary,
        previous_hash, new_hash, status, detected_at, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, NULL)
    `);

    stmt.run(
      id,
      params.sourceArticleId,
      params.articleId || null,
      eventType,
      diffSummary,
      previousHash,
      newHash,
      now
    );

    // Save snapshot
    db.prepare(`
      INSERT INTO source_snapshots (id, source_article_id, content_hash, raw_content, title, snapshot_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('snap_' + Date.now(), params.sourceArticleId, newHash, params.newContent, params.newTitle, now);

    // If article linked, mark UPDATE_PENDING
    if (params.articleId) {
      db.prepare(`
        UPDATE articles SET status = 'UPDATE_PENDING', updated_at = ? WHERE id = ?
      `).run(now, params.articleId);
    }

    // Emit notification
    NotificationService.create({
      type: 'change_detected',
      title: 'Виявлено оновлення матеріалу джерела',
      message: diffSummary,
      link: '/admin/changes'
    });

    return {
      hasChanged: true,
      changeEvent: {
        id,
        source_article_id: params.sourceArticleId,
        article_id: params.articleId || null,
        event_type: eventType,
        diff_summary: diffSummary,
        previous_hash: previousHash,
        new_hash: newHash,
        status: 'pending_review',
        detected_at: now,
        resolved_at: null
      }
    };
  }

  static getPendingChanges(): ChangeEvent[] {
    return db.prepare(`
      SELECT ce.*, sa.title as source_title, sa.source_url, a.title as tech_orbit_title
      FROM change_events ce
      JOIN source_articles sa ON sa.id = ce.source_article_id
      LEFT JOIN articles a ON a.id = ce.article_id
      WHERE ce.status = 'pending_review'
      ORDER BY ce.detected_at DESC
    `).all() as unknown as ChangeEvent[];
  }

  static resolveChange(id: string, action: 'merged' | 'dismissed'): boolean {
    const now = new Date().toISOString();
    const res = db.prepare(`
      UPDATE change_events
      SET status = ?, resolved_at = ?
      WHERE id = ?
    `).run(action, now, id);
    return res.changes > 0;
  }
}
