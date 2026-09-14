import crypto from 'crypto';
import { db } from '../db/database.ts';
import { SsrfGuardService } from './ssrf-guard.service.ts';
import { SourceService } from './source.service.ts';
import { ParserFactory, BlockBuilder, ParsedArticle, ContentBlock } from './parsers/index.ts';
import { ChangeDetectionService } from './change-detection.service.ts';
import { AuditService } from './audit.service.ts';

export interface SyncRunResult {
  jobId: string;
  sourceId: string;
  sourceName: string;
  status: 'completed' | 'failed' | 'partial';
  discovered: number;
  imported: number;
  updated: number;
  unchanged: number;
  failed: number;
  durationMs: number;
  error?: string;
}

export class SourceImporter {
  /**
   * Normalizes URLs by removing marketing query parameters, session IDs, and trailing slashes.
   */
  static normalizeUrl(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl.trim());
      // Strip tracking params
      const trackingParams = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'fbclid',
        'gclid',
        'yclid',
        'ref',
        'source',
        '_ga',
        'mc_eid',
        'zen_source'
      ];
      for (const p of trackingParams) {
        parsed.searchParams.delete(p);
      }

      // Remove fragment
      parsed.hash = '';

      // Normalize trailing slash (keep only if root)
      let pathname = parsed.pathname;
      if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.substring(0, pathname.length - 1);
      }
      parsed.pathname = pathname;

      return parsed.toString();
    } catch {
      return rawUrl.trim();
    }
  }

  /**
   * Resolves category ID based on source category mapping or fallback.
   */
  static resolveCategoryId(
    sourceCategories: string[],
    mappingJson?: string,
    defaultCatId: string = 'cat_smartphones'
  ): string {
    let mapping: Record<string, string> = {};
    try {
      if (mappingJson) {
        mapping = JSON.parse(mappingJson);
      }
    } catch {}

    // Check mapping against source categories (case-insensitive)
    for (const cat of sourceCategories) {
      const lower = cat.toLowerCase().trim();
      for (const [key, targetCatId] of Object.entries(mapping)) {
        if (key.toLowerCase().trim() === lower) {
          return targetCatId;
        }
      }
    }

    // Secondary heuristic keyword matching
    const joined = sourceCategories.join(' ').toLowerCase();
    if (joined.includes('смартфон') || joined.includes('phone') || joined.includes('apple') || joined.includes('samsung') || joined.includes('xiaomi') || joined.includes('pixel')) {
      return 'cat_smartphones';
    }
    if (joined.includes('обзор') || joined.includes('review') || joined.includes('гаджет') || joined.includes('ноутбук') || joined.includes('процессор') || joined.includes('hardware')) {
      return 'cat_gadgets';
    }
    if (joined.includes('штучн') || joined.includes('ии') || joined.includes('ai') || joined.includes('софт') || joined.includes('app') || joined.includes('програм')) {
      return 'cat_ai_software';
    }
    if (joined.includes('авто') || joined.includes('ev') || joined.includes('tesla') || joined.includes('електромоб')) {
      return 'cat_auto_ev';
    }
    if (joined.includes('кібер') || joined.includes('security') || joined.includes('безпек') || joined.includes('взлом')) {
      return 'cat_cybersecurity';
    }

    // Default fallback category
    const catCheck = db.prepare('SELECT id FROM categories WHERE id = ?').get(defaultCatId);
    if (catCheck) return defaultCatId;

    const firstCat = db.prepare('SELECT id FROM categories LIMIT 1').get() as { id: string } | undefined;
    return firstCat ? firstCat.id : 'cat_smartphones';
  }

  /**
   * Main import execution engine
   */
  static async triggerSourceSync(sourceId: string, triggeredBy: string = 'admin'): Promise<SyncRunResult> {
    const startTime = Date.now();
    const source = SourceService.getSourceById(sourceId);
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    const jobId = 'job_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    // 1. Initialize Sync Job
    db.prepare(`
      INSERT INTO sync_jobs (
        id, source_id, status, items_found, items_imported, items_updated, items_failed,
        error_message, duration_ms, triggered_by, started_at, completed_at
      ) VALUES (?, ?, 'running', 0, 0, 0, 0, NULL, 0, ?, ?, NULL)
    `).run(jobId, sourceId, triggeredBy, now);

    // Update source status
    db.prepare("UPDATE sources SET status = 'syncing', updated_at = ? WHERE id = ?").run(now, sourceId);

    this.log(jobId, sourceId, 'info', `Initiated ingestion run for "${source.name}" (Parser: ${source.parser_type})`);

    let discoveredCount = 0;
    let importedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    let failedCount = 0;

    try {
      let parserConfig: any = {};
      try {
        parserConfig = typeof source.parser_config === 'string' ? JSON.parse(source.parser_config) : (source.parser_config || {});
      } catch {}

      // Combine patterns
      parserConfig.articleUrlPatterns = source.article_url_patterns || parserConfig.articleUrlPatterns;
      parserConfig.excludedUrlPatterns = source.excluded_url_patterns || parserConfig.excludedUrlPatterns;

      // Determine initial feed / landing URL
      const targetFetchUrl = source.feed_url || parserConfig.feedUrl || source.base_url;

      this.log(jobId, sourceId, 'info', `Connecting to feed endpoint: ${targetFetchUrl}`);

      // Safe fetch of discovery payload
      const fetchResp = await SsrfGuardService.safeFetch(targetFetchUrl, {
        timeoutMs: 15000,
        headers: {
          'User-Agent': source.user_agent || 'TechOrbitBot/1.0 (+https://techorbit.media/bot)'
        }
      });

      if (!fetchResp.ok) {
        throw new Error(`Feed fetch failed with HTTP ${fetchResp.status}: ${fetchResp.statusText}`);
      }

      const bodyText = await fetchResp.text();
      const parser = ParserFactory.getParser(source.parser_type);
      const discovery = await parser.discover(bodyText, targetFetchUrl, parserConfig);

      let targetArticles: ParsedArticle[] = [];

      if (discovery.sampleArticles && discovery.sampleArticles.length > 0) {
        targetArticles = discovery.sampleArticles;
      }

      // Record discovered URLs
      const uniqueUrls = Array.from(new Set(discovery.articleUrls.map(u => this.normalizeUrl(u))));
      discoveredCount = uniqueUrls.length;
      this.log(jobId, sourceId, 'info', `Discovery identified ${discoveredCount} article URLs`);

      // Update sync_jobs items_found
      db.prepare('UPDATE sync_jobs SET items_found = ? WHERE id = ?').run(discoveredCount, jobId);

      const maxArticles = Math.min(source.max_articles_per_sync || 10, 25);
      const requestDelay = Math.max(source.request_delay_ms || 400, 200);

      // Process articles up to limit
      for (const rawUrl of uniqueUrls.slice(0, maxArticles)) {
        const normalizedUrl = this.normalizeUrl(rawUrl);

        // Record in source_pages
        const pageId = 'page_' + crypto.createHash('md5').update(normalizedUrl).digest('hex').substring(0, 16);
        db.prepare(`
          INSERT INTO source_pages (id, source_id, url, status, created_at)
          VALUES (?, ?, ?, 'discovered', ?)
          ON CONFLICT(id) DO UPDATE SET last_crawled_at = ?
        `).run(pageId, sourceId, normalizedUrl, now, now);

        // Check if we already have a parsed item from discovery (e.g. RSS item)
        let articleData = targetArticles.find(a => this.normalizeUrl(a.url) === normalizedUrl);

        // If not, fetch and parse article page individually
        if (!articleData) {
          try {
            // Respect request delay for polite crawling
            await new Promise(res => setTimeout(res, requestDelay));

            const artResp = await SsrfGuardService.safeFetch(normalizedUrl, {
              timeoutMs: 12000,
              headers: {
                'User-Agent': source.user_agent || 'TechOrbitBot/1.0 (+https://techorbit.media/bot)'
              }
            });

            if (!artResp.ok) {
              this.log(jobId, sourceId, 'warn', `Article fetch failed HTTP ${artResp.status} for ${normalizedUrl}`);
              failedCount++;
              continue;
            }

            const artBody = await artResp.text();
            // Parse with custom or HTML parser
            const artParser =
              source.parser_type === 'wylsa_custom'
                ? ParserFactory.getParser('wylsa_custom')
                : ParserFactory.getParser('generic_html');

            articleData = await artParser.parseArticle(artBody, normalizedUrl, parserConfig);
          } catch (fetchErr: any) {
            this.log(jobId, sourceId, 'warn', `Failed to crawl article ${normalizedUrl}: ${fetchErr.message}`);
            failedCount++;
            continue;
          }
        }

        if (!articleData || !articleData.title) {
          failedCount++;
          continue;
        }

        // Length validation
        const minLen = source.min_content_length || 80;
        if (articleData.rawText.length < minLen) {
          this.log(jobId, sourceId, 'warn', `Skipping "${articleData.title}": content length (${articleData.rawText.length}) below minimum ${minLen}`);
          failedCount++;
          continue;
        }

        // Compute content hash (SHA-256)
        const contentForHash = (articleData.title + '\n\n' + articleData.rawText).trim();
        const contentHash = crypto.createHash('sha256').update(contentForHash).digest('hex');

        // Resolve Category
        const categoryId = this.resolveCategoryId(
          articleData.categories,
          source.category_mapping,
          source.default_category_id || 'cat_smartphones'
        );

        // Check if article exists
        const existingSourceArticle = db.prepare(`
          SELECT sa.id, sa.content_hash, a.id as article_id, a.title, a.status as article_status
          FROM source_articles sa
          LEFT JOIN articles a ON a.source_article_id = sa.id
          WHERE sa.source_url = ? OR sa.external_id = ?
        `).get(normalizedUrl, articleData.externalId) as {
          id: string;
          content_hash: string;
          article_id?: string;
          title?: string;
          article_status?: string;
        } | undefined;

        if (!existingSourceArticle) {
          // BRAND NEW ARTICLE
          const srcArtId = 'src_art_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
          const articleId = 'art_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
          const slugBase = slugify(articleData.title) || 'tech-' + Date.now().toString(36);
          const slugUk = slugBase + '-' + Math.random().toString(36).substring(2, 6);
          const slugEn = slugBase + '-en-' + Math.random().toString(36).substring(2, 6);

          // 1. Insert into source_articles
          db.prepare(`
            INSERT INTO source_articles (
              id, source_id, external_id, source_url, title, raw_html, raw_text,
              author, published_at, content_hash, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processed', ?, ?)
          `).run(
            srcArtId,
            sourceId,
            articleData.externalId,
            normalizedUrl,
            articleData.title,
            articleData.rawHtml,
            articleData.rawText,
            articleData.author,
            articleData.publishedAt,
            contentHash,
            now,
            now
          );

          // 2. Insert Snapshot
          const snapshotId = 'snap_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
          db.prepare(`
            INSERT INTO source_snapshots (id, source_article_id, content_hash, raw_content, title, snapshot_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(snapshotId, srcArtId, contentHash, articleData.rawHtml, articleData.title, now);

          // 3. Insert Article with status = 'PENDING_REVIEW' (never published automatically!)
          db.prepare(`
            INSERT INTO articles (
              id, source_id, source_article_id, source_url, source_author, source_published_at,
              title, subtitle, excerpt, content, category_id, author_id,
              featured_image_id, featured_image_url, status, rights_status,
              slug_uk, slug_en, created_at, updated_at, published_at,
              last_source_check, source_content_hash
            ) VALUES (
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, NULL,
              NULL, ?, 'PENDING_REVIEW', 'editorial_review',
              ?, ?, ?, ?, NULL,
              ?, ?
            )
          `).run(
            articleId,
            sourceId,
            srcArtId,
            normalizedUrl,
            articleData.author,
            articleData.publishedAt,
            articleData.title,
            articleData.subtitle || '',
            articleData.excerpt,
            BlockBuilder.blocksToHtml(articleData.blocks) || articleData.rawHtml,
            categoryId,
            articleData.featuredImageUrl || null,
            slugUk,
            slugEn,
            now,
            now,
            now,
            contentHash
          );

          // 4. Create Version 1
          const versionId = 'ver_' + Date.now().toString(36);
          db.prepare(`
            INSERT INTO article_versions (id, article_id, version_number, title, excerpt, content, changed_by, change_reason, created_at)
            VALUES (?, ?, 1, ?, ?, ?, 'system', 'Imported from ${source.name}', ?)
          `).run(versionId, articleId, articleData.title, articleData.excerpt, articleData.rawText, now);

          importedCount++;
          this.log(jobId, sourceId, 'info', `Imported new article: "${articleData.title}" (Queue: PENDING_REVIEW)`);
        } else if (existingSourceArticle.content_hash !== contentHash) {
          // CONTENT HAS CHANGED AT SOURCE
          this.log(jobId, sourceId, 'info', `Update detected for "${articleData.title}"`);

          // 1. Update source_articles
          db.prepare(`
            UPDATE source_articles SET
              title = ?,
              raw_html = ?,
              raw_text = ?,
              author = ?,
              content_hash = ?,
              updated_at = ?
            WHERE id = ?
          `).run(articleData.title, articleData.rawHtml, articleData.rawText, articleData.author, contentHash, now, existingSourceArticle.id);

          // 2. Add new snapshot
          const snapshotId = 'snap_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
          db.prepare(`
            INSERT INTO source_snapshots (id, source_article_id, content_hash, raw_content, title, snapshot_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(snapshotId, existingSourceArticle.id, contentHash, articleData.rawHtml, articleData.title, now);

          // 3. Register change event & set article to UPDATE_PENDING
          ChangeDetectionService.detectArticleChange({
            sourceArticleId: existingSourceArticle.id,
            newTitle: articleData.title,
            newContent: articleData.rawHtml,
            sourceAuthor: articleData.author
          });

          if (existingSourceArticle.article_id) {
            db.prepare(`
              UPDATE articles SET
                status = 'UPDATE_PENDING',
                last_source_check = ?,
                source_content_hash = ?
              WHERE id = ?
            `).run(now, contentHash, existingSourceArticle.article_id);
          }

          updatedCount++;
        } else {
          // No changes
          unchangedCount++;
          if (existingSourceArticle.article_id) {
            db.prepare('UPDATE articles SET last_source_check = ? WHERE id = ?').run(now, existingSourceArticle.article_id);
          }
        }
      }

      const durationMs = Date.now() - startTime;
      const completedAt = new Date().toISOString();
      const jobStatus = failedCount > 0 && (importedCount > 0 || updatedCount > 0) ? 'partial' : 'completed';

      // Update sync_jobs
      db.prepare(`
        UPDATE sync_jobs SET
          status = ?,
          items_imported = ?,
          items_updated = ?,
          items_failed = ?,
          duration_ms = ?,
          completed_at = ?
        WHERE id = ?
      `).run(jobStatus, importedCount, updatedCount, failedCount, durationMs, completedAt, jobId);

      // Update source
      const interval = source.sync_interval_minutes || 60;
      const nextSync = new Date(Date.now() + interval * 60 * 1000).toISOString();
      db.prepare(`
        UPDATE sources SET
          status = 'active',
          last_sync_at = ?,
          last_success_at = ?,
          next_sync_at = ?,
          updated_at = ?
        WHERE id = ?
      `).run(completedAt, completedAt, nextSync, completedAt, sourceId);

      this.log(
        jobId,
        sourceId,
        'info',
        `Completed: Discovered ${discoveredCount}, New ${importedCount}, Updated ${updatedCount}, Unchanged ${unchangedCount}, Failed ${failedCount} (${durationMs}ms)`
      );

      AuditService.log({
        userId: triggeredBy,
        action: 'SOURCE_SYNC_COMPLETED',
        entityType: 'source',
        entityId: sourceId,
        newValues: { jobId, imported: importedCount, updated: updatedCount, durationMs }
      });

      return {
        jobId,
        sourceId,
        sourceName: source.name,
        status: jobStatus,
        discovered: discoveredCount,
        imported: importedCount,
        updated: updatedCount,
        unchanged: unchangedCount,
        failed: failedCount,
        durationMs
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const failedAt = new Date().toISOString();

      db.prepare(`
        UPDATE sync_jobs SET
          status = 'failed',
          error_message = ?,
          duration_ms = ?,
          completed_at = ?
        WHERE id = ?
      `).run(err.message, durationMs, failedAt, jobId);

      db.prepare(`
        UPDATE sources SET
          status = 'error',
          last_sync_at = ?,
          last_error_at = ?,
          updated_at = ?
        WHERE id = ?
      `).run(failedAt, failedAt, failedAt, sourceId);

      this.log(jobId, sourceId, 'error', `Fatal sync exception: ${err.message}`);

      AuditService.log({
        userId: triggeredBy,
        action: 'SOURCE_SYNC_FAILED',
        entityType: 'source',
        entityId: sourceId,
        newValues: { jobId, error: err.message }
      });

      return {
        jobId,
        sourceId,
        sourceName: source.name,
        status: 'failed',
        discovered: discoveredCount,
        imported: importedCount,
        updated: updatedCount,
        unchanged: unchangedCount,
        failed: failedCount,
        durationMs,
        error: err.message
      };
    }
  }

  private static log(jobId: string, sourceId: string, level: 'info' | 'warn' | 'error', message: string, details?: any) {
    const id = 'log_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();
    const detailsStr = details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null;

    db.prepare(`
      INSERT INTO sync_logs (id, sync_job_id, source_id, level, message, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, jobId, sourceId, level, message, detailsStr, now);
  }
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\wа-яіїєґ\-]+/gu, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .substring(0, 80);
}
