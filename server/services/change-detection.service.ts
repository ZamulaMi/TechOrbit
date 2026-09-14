import crypto from 'crypto';
import { db } from '../db/database.ts';
import {
  ChangeEvent,
  StructuredDiff,
  ChangeEventType,
  ChangeEventStatus,
  ChangeSeverity,
  SourceSnapshot,
  Article
} from '../types/index.ts';
import { ContentNormalizer } from './content-normalizer.ts';
import { NotificationService } from './notification.service.ts';
import { AuditService } from './audit.service.ts';
import { BlockBuilder } from './parsers/block-builder.ts';

export class ChangeDetectionService {
  /**
   * Computes normalized hash
   */
  static computeContentHash(content: string): string {
    return ContentNormalizer.computeHash([content]);
  }

  /**
   * Retrieves the latest snapshot for a source article
   */
  static getLatestSnapshot(sourceArticleId: string): SourceSnapshot | null {
    const snap = db.prepare(`
      SELECT * FROM source_snapshots
      WHERE source_article_id = ?
      ORDER BY snapshot_at DESC
      LIMIT 1
    `).get(sourceArticleId) as any;
    return snap || null;
  }

  /**
   * Saves a new snapshot
   */
  static saveSnapshot(data: {
    sourceId?: string | null;
    sourceArticleId: string;
    articleId?: string | null;
    contentHash: string;
    title: string;
    subtitle?: string | null;
    excerpt?: string | null;
    rawContent: string;
    author?: string | null;
    category?: string | null;
    tags?: string[];
    featuredImageUrl?: string | null;
    gallery?: string[];
    links?: string[];
    blocks?: any[];
    publishedAt?: string | null;
    updatedAt?: string | null;
  }): string {
    const id = 'snap_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO source_snapshots (
        id, source_id, source_article_id, article_id, content_hash,
        title, subtitle, excerpt, raw_content, author, category,
        tags_json, featured_image_url, gallery_json, links_json,
        structured_blocks_json, published_at, updated_at, snapshot_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.sourceId || null,
      data.sourceArticleId,
      data.articleId || null,
      data.contentHash,
      data.title,
      data.subtitle || null,
      data.excerpt || null,
      data.rawContent,
      data.author || null,
      data.category || null,
      JSON.stringify(data.tags || []),
      data.featuredImageUrl || null,
      JSON.stringify(data.gallery || []),
      JSON.stringify(data.links || []),
      JSON.stringify(data.blocks || []),
      data.publishedAt || null,
      data.updatedAt || null,
      now
    );

    return id;
  }

  /**
   * Detects changes between previous version/snapshot and newly scraped content.
   * If purely technical/whitespace, ignores and does not create an event.
   */
  static detectArticleChange(params: {
    sourceId?: string;
    sourceArticleId: string;
    articleId?: string | null;
    newTitle: string;
    newSubtitle?: string | null;
    newExcerpt?: string | null;
    newContent: string;
    newAuthor?: string | null;
    newCategory?: string | null;
    newFeaturedImageUrl?: string | null;
    newTags?: string[];
    newLinks?: string[];
    newBlocks?: any[];
    publishedAt?: string | null;
    updatedAt?: string | null;
  }): { hasChanged: boolean; changeEvent?: ChangeEvent } {
    const prevSnapshot = this.getLatestSnapshot(params.sourceArticleId);

    // Retrieve corresponding local article if linked
    let currentArticle: Article | null = null;
    if (params.articleId) {
      currentArticle = (db.prepare('SELECT * FROM articles WHERE id = ?').get(params.articleId) as any) || null;
    }

    // Prepare old state to compare against
    let oldBlocks: any[] = [];
    if (prevSnapshot && prevSnapshot.structured_blocks_json) {
      try {
        oldBlocks = JSON.parse(prevSnapshot.structured_blocks_json);
      } catch {}
    }

    let oldTags: string[] = [];
    if (prevSnapshot && prevSnapshot.tags_json) {
      try {
        oldTags = JSON.parse(prevSnapshot.tags_json);
      } catch {}
    }

    let oldLinks: string[] = [];
    if (prevSnapshot && prevSnapshot.links_json) {
      try {
        oldLinks = JSON.parse(prevSnapshot.links_json);
      } catch {}
    }

    const oldState = {
      title: prevSnapshot ? prevSnapshot.title : currentArticle?.title || '',
      subtitle: prevSnapshot ? prevSnapshot.subtitle : currentArticle?.subtitle || '',
      excerpt: prevSnapshot ? prevSnapshot.excerpt : currentArticle?.excerpt || '',
      content: prevSnapshot ? prevSnapshot.raw_content : currentArticle?.content || '',
      author: prevSnapshot ? prevSnapshot.author : currentArticle?.source_author || '',
      category: prevSnapshot ? prevSnapshot.category : '',
      featured_image_url: prevSnapshot ? prevSnapshot.featured_image_url : currentArticle?.featured_image_url || '',
      tags: oldTags,
      links: oldLinks,
      blocks: oldBlocks
    };

    const newState = {
      title: params.newTitle,
      subtitle: params.newSubtitle,
      excerpt: params.newExcerpt,
      content: params.newContent,
      author: params.newAuthor,
      category: params.newCategory,
      featured_image_url: params.newFeaturedImageUrl,
      tags: params.newTags || [],
      links: params.newLinks || [],
      blocks: params.newBlocks || []
    };

    // Calculate semantic diff with whitespace & tracking normalization
    const diffResult = ContentNormalizer.buildDiff(oldState, newState);

    if (!prevSnapshot) {
      // First snapshot creation
      const contentHash = ContentNormalizer.computeHash([params.newTitle, params.newContent]);
      const newSnapId = this.saveSnapshot({
        sourceId: params.sourceId,
        sourceArticleId: params.sourceArticleId,
        articleId: params.articleId,
        contentHash,
        title: params.newTitle,
        subtitle: params.newSubtitle,
        excerpt: params.newExcerpt,
        rawContent: params.newContent,
        author: params.newAuthor,
        category: params.newCategory,
        tags: params.newTags,
        featuredImageUrl: params.newFeaturedImageUrl,
        links: params.newLinks,
        blocks: params.newBlocks,
        publishedAt: params.publishedAt,
        updatedAt: params.updatedAt
      });
      return { hasChanged: false };
    }

    // If no semantic change, do not create an update event
    if (!diffResult.hasChanged) {
      return { hasChanged: false };
    }

    // Semantic change detected!
    const newContentHash = ContentNormalizer.computeHash([params.newTitle, params.newContent]);
    const now = new Date().toISOString();

    // 1. Save new snapshot
    const newSnapId = this.saveSnapshot({
      sourceId: params.sourceId,
      sourceArticleId: params.sourceArticleId,
      articleId: params.articleId,
      contentHash: newContentHash,
      title: params.newTitle,
      subtitle: params.newSubtitle,
      excerpt: params.newExcerpt,
      rawContent: params.newContent,
      author: params.newAuthor,
      category: params.newCategory,
      tags: params.newTags,
      featuredImageUrl: params.newFeaturedImageUrl,
      links: params.newLinks,
      blocks: params.newBlocks,
      publishedAt: params.publishedAt,
      updatedAt: params.updatedAt
    });

    // 2. Fetch latest article_versions id if article exists
    let oldVersionId: string | null = null;
    if (params.articleId) {
      const lastVer = db.prepare(`
        SELECT id FROM article_versions
        WHERE article_id = ?
        ORDER BY version_number DESC
        LIMIT 1
      `).get(params.articleId) as { id: string } | undefined;
      oldVersionId = lastVer ? lastVer.id : null;
    }

    // 3. Create Change Event
    const changeId = 'change_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const diffJson = JSON.stringify(diffResult.diff);

    db.prepare(`
      INSERT INTO change_events (
        id, source_id, source_article_id, article_id, old_version_id, new_snapshot_id,
        change_type, severity, summary, diff, status, detected_at,
        reviewed_at, reviewed_by, review_comment,
        event_type, diff_summary, previous_hash, new_hash
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, 'PENDING', ?,
        NULL, NULL, NULL,
        ?, ?, ?, ?
      )
    `).run(
      changeId,
      params.sourceId || null,
      params.sourceArticleId,
      params.articleId || null,
      oldVersionId,
      newSnapId,
      diffResult.changeType,
      diffResult.severity,
      diffResult.summary,
      diffJson,
      now,
      diffResult.changeType.toLowerCase(),
      diffResult.summary,
      prevSnapshot.content_hash,
      newContentHash
    );

    // 4. Update Article status to UPDATE_PENDING
    if (params.articleId) {
      db.prepare(`
        UPDATE articles SET
          status = 'UPDATE_PENDING',
          last_source_check = ?,
          source_content_hash = ?,
          updated_at = ?
        WHERE id = ?
      `).run(now, newContentHash, now, params.articleId);
    }

    // 5. Send Notification
    NotificationService.create({
      type: 'change_detected',
      title: `Зміна в першоджерелі: "${params.newTitle.substring(0, 50)}..."`,
      message: `${diffResult.summary} (Важливість: ${diffResult.severity.toUpperCase()})`,
      link: `/admin/changes`
    });

    // 6. Log Audit Trail
    AuditService.log({
      action: 'CHANGE_EVENT_DETECTED',
      entityType: 'change_event',
      entityId: changeId,
      newValues: {
        changeType: diffResult.changeType,
        severity: diffResult.severity,
        summary: diffResult.summary,
        articleId: params.articleId
      }
    });

    const event: ChangeEvent = {
      id: changeId,
      source_id: params.sourceId || null,
      source_article_id: params.sourceArticleId,
      article_id: params.articleId || null,
      old_version_id: oldVersionId,
      new_snapshot_id: newSnapId,
      change_type: diffResult.changeType,
      severity: diffResult.severity,
      summary: diffResult.summary,
      diff: diffResult.diff,
      status: 'PENDING',
      detected_at: now,
      reviewed_at: null,
      reviewed_by: null,
      review_comment: null
    };

    return {
      hasChanged: true,
      changeEvent: event
    };
  }

  /**
   * Handles disappearance / deletion of an article at the external source.
   * Does NOT automatically delete local article, but records ARTICLE_DELETED change event.
   */
  static recordDeletedSourceArticle(sourceArticleId: string, articleId?: string | null): ChangeEvent | null {
    const now = new Date().toISOString();

    // Check if an unresolved ARTICLE_DELETED event already exists
    const existingEvent = db.prepare(`
      SELECT id FROM change_events
      WHERE source_article_id = ? AND change_type = 'ARTICLE_DELETED' AND status = 'PENDING'
    `).get(sourceArticleId);

    if (existingEvent) return null;

    const srcArt = db.prepare('SELECT * FROM source_articles WHERE id = ?').get(sourceArticleId) as any;
    const article = articleId ? (db.prepare('SELECT * FROM articles WHERE id = ?').get(articleId) as any) : null;

    const changeId = 'change_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const title = article?.title || srcArt?.title || 'Unknown article';
    const summary = `Матеріал зник або був видалений на сайті-першоджерелі (${srcArt?.source_url || ''})`;

    db.prepare(`
      INSERT INTO change_events (
        id, source_id, source_article_id, article_id, old_version_id, new_snapshot_id,
        change_type, severity, summary, diff, status, detected_at,
        event_type, diff_summary
      ) VALUES (
        ?, ?, ?, ?, NULL, NULL,
        'ARTICLE_DELETED', 'high', ?, '{}', 'PENDING', ?,
        'deleted_at_source', ?
      )
    `).run(
      changeId,
      srcArt?.source_id || null,
      sourceArticleId,
      articleId || null,
      summary,
      now,
      summary
    );

    // Update article source_status
    if (articleId) {
      db.prepare(`
        UPDATE articles SET
          source_status = 'deleted_at_source',
          status = 'UPDATE_PENDING',
          updated_at = ?
        WHERE id = ?
      `).run(now, articleId);
    }

    NotificationService.create({
      type: 'change_detected',
      title: 'Матеріал видалено в першоджерелі',
      message: `Статтю "${title}" більше не знайдено на сервері джерела. Оберіть дію: залишити, зняти з публікації або архівувати.`,
      link: '/admin/changes'
    });

    AuditService.log({
      action: 'ARTICLE_DELETED_AT_SOURCE',
      entityType: 'source_article',
      entityId: sourceArticleId,
      newValues: { articleId, title }
    });

    return {
      id: changeId,
      source_id: srcArt?.source_id || null,
      source_article_id: sourceArticleId,
      article_id: articleId || null,
      change_type: 'ARTICLE_DELETED',
      severity: 'high',
      summary,
      diff: {},
      status: 'PENDING',
      detected_at: now,
      reviewed_at: null,
      reviewed_by: null,
      review_comment: null
    };
  }

  /**
   * Retrieves change events with joined metadata
   */
  static getChanges(filters: {
    status?: string;
    sourceId?: string;
    severity?: string;
    changeType?: string;
  } = {}): ChangeEvent[] {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.status && filters.status !== 'ALL') {
      conditions.push('(ce.status = ? OR ce.status = ?)');
      params.push(filters.status, filters.status.toLowerCase());
    }

    if (filters.sourceId && filters.sourceId !== 'ALL') {
      conditions.push('ce.source_id = ?');
      params.push(filters.sourceId);
    }

    if (filters.severity && filters.severity !== 'ALL') {
      conditions.push('ce.severity = ?');
      params.push(filters.severity);
    }

    if (filters.changeType && filters.changeType !== 'ALL') {
      conditions.push('ce.change_type = ?');
      params.push(filters.changeType);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        ce.*,
        sa.title as source_title,
        sa.source_url,
        a.title as article_title,
        s.name as source_name
      FROM change_events ce
      LEFT JOIN source_articles sa ON sa.id = ce.source_article_id
      LEFT JOIN articles a ON a.id = ce.article_id
      LEFT JOIN sources s ON s.id = ce.source_id OR s.id = sa.source_id
      ${where}
      ORDER BY ce.detected_at DESC
    `;

    const rows = db.prepare(sql).all(...params) as any[];

    return rows.map(r => {
      let parsedDiff: StructuredDiff = {};
      try {
        if (typeof r.diff === 'string' && r.diff.trim().startsWith('{')) {
          parsedDiff = JSON.parse(r.diff);
        }
      } catch {}

      return {
        ...r,
        diff: parsedDiff,
        status: (r.status || 'PENDING').toUpperCase() as ChangeEventStatus,
        change_type: (r.change_type || 'CONTENT_CHANGED').toUpperCase() as ChangeEventType,
        severity: (r.severity || 'medium').toLowerCase() as ChangeSeverity
      };
    });
  }

  /**
   * Retrieves pending changes for review queue and dashboard
   */
  static getPendingChanges(): ChangeEvent[] {
    return this.getChanges({ status: 'PENDING' });
  }

  /**
   * Retrieves single change event with full snapshots
   */
  static getChangeById(id: string): {
    changeEvent: ChangeEvent;
    oldSnapshot?: SourceSnapshot | null;
    newSnapshot?: SourceSnapshot | null;
    currentArticle?: Article | null;
  } | null {
    const row = db.prepare(`
      SELECT
        ce.*,
        sa.title as source_title,
        sa.source_url,
        a.title as article_title,
        s.name as source_name
      FROM change_events ce
      LEFT JOIN source_articles sa ON sa.id = ce.source_article_id
      LEFT JOIN articles a ON a.id = ce.article_id
      LEFT JOIN sources s ON s.id = ce.source_id OR s.id = sa.source_id
      WHERE ce.id = ?
    `).get(id) as any;

    if (!row) return null;

    let parsedDiff: StructuredDiff = {};
    try {
      if (typeof row.diff === 'string' && row.diff.trim().startsWith('{')) {
        parsedDiff = JSON.parse(row.diff);
      }
    } catch {}

    const event: ChangeEvent = {
      ...row,
      diff: parsedDiff,
      status: (row.status || 'PENDING').toUpperCase() as ChangeEventStatus,
      change_type: (row.change_type || 'CONTENT_CHANGED').toUpperCase() as ChangeEventType,
      severity: (row.severity || 'medium').toLowerCase() as ChangeSeverity
    };

    let newSnapshot: SourceSnapshot | null = null;
    if (row.new_snapshot_id) {
      newSnapshot = (db.prepare('SELECT * FROM source_snapshots WHERE id = ?').get(row.new_snapshot_id) as any) || null;
    }

    let oldSnapshot: SourceSnapshot | null = null;
    if (newSnapshot) {
      oldSnapshot = (db.prepare(`
        SELECT * FROM source_snapshots
        WHERE source_article_id = ? AND id != ?
        ORDER BY snapshot_at DESC
        LIMIT 1
      `).get(row.source_article_id, newSnapshot.id) as any) || null;
    }

    let currentArticle: Article | null = null;
    if (row.article_id) {
      currentArticle = (db.prepare('SELECT * FROM articles WHERE id = ?').get(row.article_id) as any) || null;
    }

    return {
      changeEvent: event,
      oldSnapshot,
      newSnapshot,
      currentArticle
    };
  }

  /**
   * Resolves a change event with approval, rejection, or partial block approval.
   */
  static resolveChange(
    changeId: string,
    params: {
      action: 'accept_all' | 'reject_all' | 'accept_selected' | 'reject_selected';
      acceptedFields?: string[];
      acceptedBlockIndices?: number[];
      comment?: string;
      deletedAction?: 'keep_published' | 'unpublish' | 'archive';
      userId: string;
    }
  ): { success: boolean; message: string } {
    const now = new Date().toISOString();
    const detail = this.getChangeById(changeId);
    if (!detail) {
      throw new Error(`Change event not found: ${changeId}`);
    }

    const { changeEvent, newSnapshot, currentArticle } = detail;
    const articleId = changeEvent.article_id;

    // Handle Deleted Article choice
    if (changeEvent.change_type === 'ARTICLE_DELETED') {
      let finalStatus = 'PUBLISHED';
      let msg = 'Матеріал залишено опублікованим із приміткою редактора.';

      if (params.deletedAction === 'unpublish') {
        finalStatus = 'DRAFT';
        msg = 'Матеріал знято з публікації (переведено в чернетки).';
      } else if (params.deletedAction === 'archive') {
        finalStatus = 'ARCHIVED';
        msg = 'Матеріал переведено в архів.';
      }

      if (articleId) {
        db.prepare(`
          UPDATE articles SET
            status = ?,
            source_status = 'deleted_at_source',
            updated_at = ?
          WHERE id = ?
        `).run(finalStatus, now, articleId);
      }

      db.prepare(`
        UPDATE change_events SET
          status = 'APPROVED',
          reviewed_at = ?,
          reviewed_by = ?,
          review_comment = ?
        WHERE id = ?
      `).run(now, params.userId, params.comment || msg, changeId);

      AuditService.log({
        userId: params.userId,
        action: 'RESOLVE_DELETED_ARTICLE',
        entityType: 'article',
        entityId: articleId || undefined,
        newValues: { action: params.deletedAction, finalStatus }
      });

      return { success: true, message: msg };
    }

    // Handle Standard Changes
    if (params.action === 'reject_all' || params.action === 'reject_selected') {
      // Reject changes: Keep current article content intact
      db.prepare(`
        UPDATE change_events SET
          status = 'REJECTED',
          reviewed_at = ?,
          reviewed_by = ?,
          review_comment = ?
        WHERE id = ?
      `).run(now, params.userId, params.comment || 'Changes rejected by editorial team', changeId);

      if (articleId && currentArticle) {
        const revertStatus = currentArticle.published_at ? 'PUBLISHED' : 'DRAFT';
        db.prepare(`
          UPDATE articles SET status = ?, updated_at = ? WHERE id = ?
        `).run(revertStatus, now, articleId);
      }

      AuditService.log({
        userId: params.userId,
        action: 'REJECT_CHANGE_EVENT',
        entityType: 'change_event',
        entityId: changeId,
        newValues: { comment: params.comment }
      });

      return { success: true, message: 'Зміни першоджерела успішно відхилено.' };
    }

    // Accept All or Accept Selected
    if (!articleId || !currentArticle) {
      throw new Error('No article linked to this change event');
    }

    if (!newSnapshot) {
      throw new Error('New snapshot not found for merging');
    }

    let updatedTitle = currentArticle.title;
    let updatedSubtitle = currentArticle.subtitle;
    let updatedExcerpt = currentArticle.excerpt;
    let updatedContent = currentArticle.content;
    let updatedImage = currentArticle.featured_image_url;

    if (params.action === 'accept_all') {
      // Merge all fields from snapshot
      updatedTitle = newSnapshot.title;
      updatedSubtitle = newSnapshot.subtitle || currentArticle.subtitle;
      updatedExcerpt = newSnapshot.excerpt || currentArticle.excerpt;
      updatedImage = newSnapshot.featured_image_url || currentArticle.featured_image_url;

      if (newSnapshot.structured_blocks_json && newSnapshot.structured_blocks_json !== '[]') {
        try {
          const blocks = JSON.parse(newSnapshot.structured_blocks_json);
          updatedContent = BlockBuilder.blocksToHtml(blocks) || newSnapshot.raw_content;
        } catch {
          updatedContent = newSnapshot.raw_content;
        }
      } else {
        updatedContent = newSnapshot.raw_content;
      }
    } else if (params.action === 'accept_selected') {
      // Merge only accepted fields
      const accepted = params.acceptedFields || [];
      if (accepted.includes('title')) updatedTitle = newSnapshot.title;
      if (accepted.includes('subtitle') && newSnapshot.subtitle) updatedSubtitle = newSnapshot.subtitle;
      if (accepted.includes('excerpt') && newSnapshot.excerpt) updatedExcerpt = newSnapshot.excerpt;
      if (accepted.includes('featured_image_url') && newSnapshot.featured_image_url) {
        updatedImage = newSnapshot.featured_image_url;
      }

      // Block-level partial merge
      if (accepted.includes('content') || (params.acceptedBlockIndices && params.acceptedBlockIndices.length > 0)) {
        if (newSnapshot.structured_blocks_json) {
          try {
            const newBlocks = JSON.parse(newSnapshot.structured_blocks_json);
            if (params.acceptedBlockIndices && params.acceptedBlockIndices.length > 0) {
              // Merge selected blocks
              const selectedBlocks = newBlocks.filter((_: any, idx: number) =>
                params.acceptedBlockIndices!.includes(idx)
              );
              updatedContent = BlockBuilder.blocksToHtml(selectedBlocks);
            } else {
              updatedContent = BlockBuilder.blocksToHtml(newBlocks);
            }
          } catch {
            updatedContent = newSnapshot.raw_content;
          }
        } else {
          updatedContent = newSnapshot.raw_content;
        }
      }
    }

    // Determine target status
    const targetStatus = currentArticle.published_at ? 'PUBLISHED' : 'APPROVED';

    // 1. Update Article
    db.prepare(`
      UPDATE articles SET
        title = ?,
        subtitle = ?,
        excerpt = ?,
        content = ?,
        featured_image_url = ?,
        status = ?,
        source_content_hash = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      updatedTitle,
      updatedSubtitle,
      updatedExcerpt,
      updatedContent,
      updatedImage,
      targetStatus,
      newSnapshot.content_hash,
      now,
      articleId
    );

    // 2. Create NEW Article Version (Never destructive overwrite!)
    const lastVer = db.prepare(`
      SELECT max(version_number) as max_ver FROM article_versions WHERE article_id = ?
    `).get(articleId) as { max_ver: number | null };
    const nextVer = (lastVer?.max_ver || 1) + 1;

    const reason =
      params.action === 'accept_all'
        ? `Applied update from source (Event: ${changeId})`
        : `Applied selected changes from source (Event: ${changeId})`;

    db.prepare(`
      INSERT INTO article_versions (
        id, article_id, version_number, title, subtitle, excerpt, content,
        featured_image_url, changed_by, change_reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'ver_' + Date.now().toString(36) + '_' + nextVer,
      articleId,
      nextVer,
      updatedTitle,
      updatedSubtitle,
      updatedExcerpt,
      updatedContent,
      updatedImage,
      params.userId,
      reason,
      now
    );

    // 3. Mark Change Event Resolved
    const finalEventStatus = params.action === 'accept_all' ? 'APPROVED' : 'PARTIALLY_APPROVED';
    db.prepare(`
      UPDATE change_events SET
        status = ?,
        reviewed_at = ?,
        reviewed_by = ?,
        review_comment = ?
      WHERE id = ?
    `).run(finalEventStatus, now, params.userId, params.comment || reason, changeId);

    // 4. Audit Log
    AuditService.log({
      userId: params.userId,
      action: params.action === 'accept_all' ? 'APPROVE_CHANGE_EVENT' : 'PARTIAL_APPROVE_CHANGE_EVENT',
      entityType: 'article',
      entityId: articleId,
      newValues: {
        changeEventId: changeId,
        newVersionNumber: nextVer,
        action: params.action
      }
    });

    return {
      success: true,
      message:
        params.action === 'accept_all'
          ? `Усі зміни успішно застосовано! Створено версію #${nextVer}.`
          : `Вибрані зміни застосовано! Створено версію #${nextVer}.`
    };
  }
}
