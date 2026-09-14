import { db } from '../db/database.ts';
import { Source, SyncJob, SyncLog } from '../types/index.ts';
import { isSafeExternalUrl } from '../auth.ts';

export class SourceService {
  static getAllSources(): Source[] {
    const rows = db.prepare('SELECT * FROM sources ORDER BY name ASC').all() as any[];
    return rows.map(r => ({
      ...r,
      enabled: Boolean(r.enabled),
      sync_enabled: Boolean(r.sync_enabled)
    }));
  }

  static getSourceById(id: string): Source | null {
    const r = db.prepare('SELECT * FROM sources WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      ...r,
      enabled: Boolean(r.enabled),
      sync_enabled: Boolean(r.sync_enabled)
    };
  }

  static createSource(data: Partial<Source>): Source {
    const id = data.id || 'src_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO sources (
        id, name, base_url, enabled, status, description, language,
        parser_type, parser_config, article_url_patterns, excluded_url_patterns,
        allowed_categories, sync_enabled, sync_interval_minutes,
        last_sync_at, next_sync_at, last_success_at, last_error_at,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        NULL, ?, NULL, NULL,
        ?, ?
      )
    `);

    const nextSync = new Date(Date.now() + (data.sync_interval_minutes || 60) * 60 * 1000).toISOString();

    stmt.run(
      id,
      data.name || 'New Tech Source',
      data.base_url || 'https://example.com',
      data.enabled !== false ? 1 : 0,
      data.status || 'active',
      data.description || '',
      data.language || 'en',
      data.parser_type || 'html_scraper',
      data.parser_config || '{}',
      data.article_url_patterns || '',
      data.excluded_url_patterns || '',
      data.allowed_categories || '',
      data.sync_enabled !== false ? 1 : 0,
      data.sync_interval_minutes || 60,
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
        enabled = ?,
        status = ?,
        description = ?,
        language = ?,
        parser_type = ?,
        parser_config = ?,
        article_url_patterns = ?,
        excluded_url_patterns = ?,
        allowed_categories = ?,
        sync_enabled = ?,
        sync_interval_minutes = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.name,
      updated.base_url,
      updated.enabled ? 1 : 0,
      updated.status,
      updated.description,
      updated.language,
      updated.parser_type,
      updated.parser_config,
      updated.article_url_patterns,
      updated.excluded_url_patterns,
      updated.allowed_categories,
      updated.sync_enabled ? 1 : 0,
      updated.sync_interval_minutes,
      now,
      id
    );

    return this.getSourceById(id);
  }

  static deleteSource(id: string): boolean {
    const res = db.prepare('DELETE FROM sources WHERE id = ?').run(id);
    return res.changes > 0;
  }

  static async testConnection(url: string): Promise<{ success: boolean; status?: number; message: string }> {
    if (!isSafeExternalUrl(url)) {
      return { success: false, message: 'Security check: URL rejected (SSRF violation or non-HTTP)' };
    }

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'TechOrbitBot/1.0 (+https://techorbit.media)' },
        signal: AbortSignal.timeout(6000)
      });
      return {
        success: response.ok,
        status: response.status,
        message: response.ok ? `Connection successful (HTTP ${response.status})` : `Failed with HTTP ${response.status}`
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Connection error: ${err.message || 'Timed out'}`
      };
    }
  }

  static getSyncJobs(sourceId?: string, limit: number = 20): SyncJob[] {
    let query = 'SELECT * FROM sync_jobs';
    if (sourceId) {
      query += ' WHERE source_id = ?';
    }
    query += ' ORDER BY started_at DESC LIMIT ?';

    if (sourceId) {
      return db.prepare(query).all(sourceId, limit) as unknown as SyncJob[];
    }
    return db.prepare(query).all(limit) as unknown as SyncJob[];
  }
}
