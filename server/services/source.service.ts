import { db } from '../db/database.ts';
import { Source, SyncJob, SyncLog, Article } from '../types/index.ts';
import { SsrfGuardService } from './ssrf-guard.service.ts';
import { SourceDiagnosticService, DiagnosticResult } from './source-diagnostic.service.ts';

export class SourceService {
  static getAllSources(): Source[] {
    const rows = db.prepare('SELECT * FROM sources ORDER BY name ASC').all() as any[];

    // Enrich with statistics
    const artCountStmt = db.prepare('SELECT count(*) as count FROM articles WHERE source_id = ?');
    const updateCountStmt = db.prepare(`
      SELECT count(*) as count FROM change_events ce
      JOIN source_articles sa ON sa.id = ce.source_article_id
      WHERE sa.source_id = ?
    `);
    const errorCountStmt = db.prepare("SELECT count(*) as count FROM sync_jobs WHERE source_id = ? AND status = 'failed'");

    return rows.map(r => {
      const artCount = (artCountStmt.get(r.id) as any)?.count || 0;
      const updateCount = (updateCountStmt.get(r.id) as any)?.count || 0;
      const errorCount = (errorCountStmt.get(r.id) as any)?.count || 0;

      return {
        ...r,
        enabled: Boolean(r.enabled),
        sync_enabled: Boolean(r.sync_enabled),
        total_articles: artCount,
        total_updates: updateCount,
        total_errors: errorCount
      };
    });
  }

  static getSourceById(id: string): Source | null {
    const r = db.prepare('SELECT * FROM sources WHERE id = ?').get(id) as any;
    if (!r) return null;

    const artCount = (db.prepare('SELECT count(*) as count FROM articles WHERE source_id = ?').get(id) as any)?.count || 0;
    const updateCount = (db.prepare(`
      SELECT count(*) as count FROM change_events ce
      JOIN source_articles sa ON sa.id = ce.source_article_id
      WHERE sa.source_id = ?
    `).get(id) as any)?.count || 0;
    const errorCount = (db.prepare("SELECT count(*) as count FROM sync_jobs WHERE source_id = ? AND status = 'failed'").get(id) as any)?.count || 0;

    return {
      ...r,
      enabled: Boolean(r.enabled),
      sync_enabled: Boolean(r.sync_enabled),
      total_articles: artCount,
      total_updates: updateCount,
      total_errors: errorCount
    };
  }

  static createSource(data: Partial<Source>): Source {
    const id = data.id || 'src_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();
    const intervalMinutes = data.sync_interval_minutes || 60;
    const nextSync = new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString();

    const stmt = db.prepare(`
      INSERT INTO sources (
        id, name, base_url, feed_url, sitemap_url, enabled, status, description, language,
        parser_type, parser_config, article_url_patterns, excluded_url_patterns,
        allowed_categories, category_mapping, default_category_id,
        max_pages_per_sync, max_articles_per_sync, request_delay_ms, retry_count,
        min_content_length, max_content_length, user_agent, headers_json,
        sync_enabled, sync_interval_minutes,
        last_sync_at, next_sync_at, last_success_at, last_error_at,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        NULL, ?, NULL, NULL,
        ?, ?
      )
    `);

    stmt.run(
      id,
      data.name || 'New Tech Source',
      data.base_url || 'https://example.com',
      data.feed_url || '',
      data.sitemap_url || '',
      data.enabled !== false ? 1 : 0,
      data.status || 'active',
      data.description || '',
      data.language || 'en',
      data.parser_type || 'generic_rss',
      typeof data.parser_config === 'string' ? data.parser_config : JSON.stringify(data.parser_config || {}),
      data.article_url_patterns || '',
      data.excluded_url_patterns || '',
      data.allowed_categories || '',
      typeof data.category_mapping === 'string' ? data.category_mapping : JSON.stringify(data.category_mapping || {}),
      data.default_category_id || 'cat_smartphones',
      data.max_pages_per_sync || 2,
      data.max_articles_per_sync || 10,
      data.request_delay_ms || 500,
      data.retry_count || 3,
      data.min_content_length || 100,
      data.max_content_length || 50000,
      data.user_agent || 'TechOrbitBot/1.0 (+https://techorbit.media/bot)',
      typeof data.headers_json === 'string' ? data.headers_json : JSON.stringify(data.headers_json || {}),
      data.sync_enabled !== false ? 1 : 0,
      intervalMinutes,
      nextSync,
      now,
      now
    );

    return this.getSourceById(id)!;
  }

  static updateSource(id: string, data: Partial<Source>): Source | null {
    const existing = this.getSourceById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated = { ...existing, ...data, updated_at: now };

    const stmt = db.prepare(`
      UPDATE sources SET
        name = ?,
        base_url = ?,
        feed_url = ?,
        sitemap_url = ?,
        enabled = ?,
        status = ?,
        description = ?,
        language = ?,
        parser_type = ?,
        parser_config = ?,
        article_url_patterns = ?,
        excluded_url_patterns = ?,
        allowed_categories = ?,
        category_mapping = ?,
        default_category_id = ?,
        max_pages_per_sync = ?,
        max_articles_per_sync = ?,
        request_delay_ms = ?,
        retry_count = ?,
        min_content_length = ?,
        max_content_length = ?,
        user_agent = ?,
        headers_json = ?,
        sync_enabled = ?,
        sync_interval_minutes = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.name,
      updated.base_url,
      updated.feed_url || '',
      updated.sitemap_url || '',
      updated.enabled ? 1 : 0,
      updated.status,
      updated.description || '',
      updated.language,
      updated.parser_type,
      typeof updated.parser_config === 'string' ? updated.parser_config : JSON.stringify(updated.parser_config || {}),
      updated.article_url_patterns || '',
      updated.excluded_url_patterns || '',
      updated.allowed_categories || '',
      typeof updated.category_mapping === 'string' ? updated.category_mapping : JSON.stringify(updated.category_mapping || {}),
      updated.default_category_id || 'cat_smartphones',
      updated.max_pages_per_sync || 2,
      updated.max_articles_per_sync || 10,
      updated.request_delay_ms || 500,
      updated.retry_count || 3,
      updated.min_content_length || 100,
      updated.max_content_length || 50000,
      updated.user_agent || 'TechOrbitBot/1.0 (+https://techorbit.media/bot)',
      typeof updated.headers_json === 'string' ? updated.headers_json : JSON.stringify(updated.headers_json || {}),
      updated.sync_enabled ? 1 : 0,
      updated.sync_interval_minutes || 60,
      now,
      id
    );

    return this.getSourceById(id);
  }

  static togglePause(id: string): { success: boolean; source: Source | null } {
    const source = this.getSourceById(id);
    if (!source) return { success: false, source: null };

    const newSyncEnabled = !source.sync_enabled;
    const newStatus = newSyncEnabled ? 'active' : 'paused';

    db.prepare('UPDATE sources SET sync_enabled = ?, status = ?, updated_at = ? WHERE id = ?').run(
      newSyncEnabled ? 1 : 0,
      newStatus,
      new Date().toISOString(),
      id
    );

    return {
      success: true,
      source: this.getSourceById(id)
    };
  }

  static deleteSource(id: string): boolean {
    const res = db.prepare('DELETE FROM sources WHERE id = ?').run(id);
    return res.changes > 0;
  }

  static async testSource(url: string, parserType?: string, config?: any): Promise<DiagnosticResult> {
    return SourceDiagnosticService.runFullDiagnostic(url, parserType || 'generic_rss', config);
  }

  static getSyncJobs(sourceId?: string, limit: number = 30): SyncJob[] {
    let query = `
      SELECT sj.*, s.name as source_name
      FROM sync_jobs sj
      JOIN sources s ON s.id = sj.source_id
    `;
    if (sourceId) {
      query += ' WHERE sj.source_id = ?';
    }
    query += ' ORDER BY sj.started_at DESC LIMIT ?';

    if (sourceId) {
      return db.prepare(query).all(sourceId, limit) as unknown as SyncJob[];
    }
    return db.prepare(query).all(limit) as unknown as SyncJob[];
  }

  static getSyncLogs(sourceId?: string, jobId?: string, limit: number = 50): SyncLog[] {
    let query = 'SELECT * FROM sync_logs';
    const params: any[] = [];
    const conditions: string[] = [];

    if (sourceId) {
      conditions.push('source_id = ?');
      params.push(sourceId);
    }
    if (jobId) {
      conditions.push('sync_job_id = ?');
      params.push(jobId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    return db.prepare(query).all(...params) as unknown as SyncLog[];
  }

  static getArticlesForSource(sourceId: string, limit: number = 20): Article[] {
    return db.prepare(`
      SELECT a.*, c.name_uk as category_name_uk, c.name_en as category_name_en, s.name as source_name
      FROM articles a
      LEFT JOIN categories c ON c.id = a.category_id
      LEFT JOIN sources s ON s.id = a.source_id
      WHERE a.source_id = ?
      ORDER BY a.created_at DESC
      LIMIT ?
    `).all(sourceId, limit) as unknown as Article[];
  }
}
