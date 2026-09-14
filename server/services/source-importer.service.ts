import { db } from '../db/database.ts';
import { isSafeExternalUrl } from '../auth.ts';
import { SourceService } from './source.service.ts';
import { SourceParserService } from './source-parser.service.ts';
import { ChangeDetectionService } from './change-detection.service.ts';
import { AuditService } from './audit.service.ts';

export class SourceImporter {
  static async triggerSourceSync(sourceId: string, triggeredBy: string = 'system'): Promise<{
    jobId: string;
    success: boolean;
    imported: number;
    updated: number;
    error?: string;
  }> {
    const source = SourceService.getSourceById(sourceId);
    if (!source) {
      return { jobId: '', success: false, imported: 0, updated: 0, error: 'Source not found' };
    }

    if (!isSafeExternalUrl(source.base_url)) {
      return { jobId: '', success: false, imported: 0, updated: 0, error: 'SSRF validation blocked source URL' };
    }

    const jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    // Insert sync job
    db.prepare(`
      INSERT INTO sync_jobs (
        id, source_id, status, items_found, items_imported, items_updated, items_failed,
        error_message, started_at, completed_at
      ) VALUES (?, ?, 'running', 0, 0, 0, 0, NULL, ?, NULL)
    `).run(jobId, sourceId, now);

    this.logSync(jobId, sourceId, 'info', `Started aggregation job for ${source.name}`);

    try {
      // Determine parser config
      let parserConfig: any = {};
      try {
        parserConfig = JSON.parse(source.parser_config);
      } catch {}

      const fetchTarget = parserConfig.feedUrl || source.base_url;

      if (!isSafeExternalUrl(fetchTarget)) {
        throw new Error('Target feed URL rejected by SSRF security filter');
      }

      const response = await fetch(fetchTarget, {
        headers: {
          'User-Agent': 'TechOrbitBot/1.0 (+https://techorbit.media/bot)'
        },
        signal: AbortSignal.timeout(12000)
      });

      if (!response.ok) {
        throw new Error(`HTTP fetch failed with status ${response.status}`);
      }

      const body = await response.text();
      const parsedItems = SourceParserService.parseRssXml(body);

      let importedCount = 0;
      let updatedCount = 0;

      for (const item of parsedItems.slice(0, 10)) {
        const hash = ChangeDetectionService.computeContentHash(item.title + '\n\n' + item.rawContent);
        const existing = db.prepare('SELECT id, content_hash FROM source_articles WHERE source_url = ?').get(item.url) as { id: string; content_hash: string } | undefined;

        if (!existing) {
          const srcArtId = 'src_art_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          db.prepare(`
            INSERT INTO source_articles (
              id, source_id, external_id, source_url, title, raw_html, raw_text,
              author, published_at, content_hash, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processed', ?, ?)
          `).run(
            srcArtId,
            sourceId,
            item.externalId,
            item.url,
            item.title,
            item.rawContent,
            item.excerpt || item.title,
            item.author || 'Source Author',
            item.publishedAt || now,
            hash,
            now,
            now
          );

          // Save snapshot
          db.prepare(`
            INSERT INTO source_snapshots (id, source_article_id, content_hash, raw_content, title, snapshot_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run('snap_' + Date.now(), srcArtId, hash, item.rawContent, item.title, now);

          // Create draft article
          const artId = 'art_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          const slugUk = 'auto-' + Date.now().toString(36);
          const slugEn = 'auto-' + Date.now().toString(36);

          db.prepare(`
            INSERT INTO articles (
              id, source_id, source_article_id, source_url, source_author, source_published_at,
              title, subtitle, excerpt, content, category_id, author_id,
              featured_image_id, featured_image_url, status, rights_status,
              slug_uk, slug_en, created_at, updated_at, published_at,
              last_source_check, source_content_hash
            ) VALUES (
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, NULL, NULL,
              NULL, ?, 'IMPORTED', 'source_aggregation',
              ?, ?, ?, ?, NULL,
              ?, ?
            )
          `).run(
            artId,
            sourceId,
            srcArtId,
            item.url,
            item.author || '',
            item.publishedAt || now,
            item.title,
            '',
            item.excerpt || '',
            item.rawContent,
            item.featuredImageUrl || null,
            slugUk,
            slugEn,
            now,
            now,
            now,
            hash
          );

          // Initial version
          db.prepare(`
            INSERT INTO article_versions (id, article_id, version_number, title, excerpt, content, changed_by, change_reason, created_at)
            VALUES (?, ?, 1, ?, ?, ?, 'system', 'Imported from source', ?)
          `).run('ver_' + Date.now(), artId, item.title, item.excerpt || '', item.rawContent, now);

          importedCount++;
        } else if (existing.content_hash !== hash) {
          // Detect changes
          ChangeDetectionService.detectArticleChange({
            sourceArticleId: existing.id,
            newTitle: item.title,
            newContent: item.rawContent,
            sourceAuthor: item.author
          });
          updatedCount++;
        }
      }

      const completedAt = new Date().toISOString();
      db.prepare(`
        UPDATE sync_jobs SET
          status = 'completed',
          items_found = ?,
          items_imported = ?,
          items_updated = ?,
          completed_at = ?
        WHERE id = ?
      `).run(parsedItems.length, importedCount, updatedCount, completedAt, jobId);

      // Update source meta
      db.prepare(`
        UPDATE sources SET
          last_sync_at = ?,
          last_success_at = ?,
          updated_at = ?
        WHERE id = ?
      `).run(completedAt, completedAt, completedAt, sourceId);

      this.logSync(jobId, sourceId, 'info', `Job completed: Found ${parsedItems.length}, Imported ${importedCount}, Updated ${updatedCount}`);

      AuditService.log({
        userId: triggeredBy,
        action: 'SOURCE_SYNC_COMPLETED',
        entityType: 'source',
        entityId: sourceId,
        newValues: { jobId, imported: importedCount, updated: updatedCount }
      });

      return { jobId, success: true, imported: importedCount, updated: updatedCount };
    } catch (err: any) {
      const failedAt = new Date().toISOString();
      db.prepare(`
        UPDATE sync_jobs SET
          status = 'failed',
          error_message = ?,
          completed_at = ?
        WHERE id = ?
      `).run(err.message || 'Unknown failure', failedAt, jobId);

      db.prepare(`
        UPDATE sources SET
          last_sync_at = ?,
          last_error_at = ?,
          updated_at = ?
        WHERE id = ?
      `).run(failedAt, failedAt, failedAt, sourceId);

      this.logSync(jobId, sourceId, 'error', `Sync failed: ${err.message || 'Unknown error'}`);

      return { jobId, success: false, imported: 0, updated: 0, error: err.message };
    }
  }

  private static logSync(jobId: string, sourceId: string, level: 'info' | 'warn' | 'error', message: string) {
    const id = 'synclog_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO sync_logs (id, sync_job_id, source_id, level, message, details, created_at)
      VALUES (?, ?, ?, ?, ?, NULL, ?)
    `).run(id, jobId, sourceId, level, message, now);
  }
}
