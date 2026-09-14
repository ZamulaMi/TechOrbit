import { db } from '../db/database.ts';
import { AdSlot } from '../types/index.ts';

export class AdService {
  static getAllAdSlots(): AdSlot[] {
    const stmt = db.prepare('SELECT * FROM ad_slots ORDER BY position ASC');
    const rows = stmt.all() as any[];
    return rows.map(r => ({
      ...r,
      is_active: Boolean(r.is_active)
    }));
  }

  static getActiveSlot(position: AdSlot['position']): AdSlot | null {
    const stmt = db.prepare('SELECT * FROM ad_slots WHERE position = ? AND is_active = 1 LIMIT 1');
    const r = stmt.get(position) as any;
    if (!r) return null;
    return {
      ...r,
      is_active: Boolean(r.is_active)
    };
  }

  static updateAdSlot(id: string, data: Partial<AdSlot>): boolean {
    const now = new Date().toISOString();
    const existing = db.prepare('SELECT * FROM ad_slots WHERE id = ?').get(id) as any;
    if (!existing) return false;

    db.prepare(`
      UPDATE ad_slots SET
        name = ?,
        code_snippet = ?,
        is_active = ?,
        fallback_image_url = ?,
        fallback_link = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      data.name !== undefined ? data.name : existing.name,
      data.code_snippet !== undefined ? data.code_snippet : existing.code_snippet,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : (existing.is_active ? 1 : 0),
      data.fallback_image_url !== undefined ? data.fallback_image_url : existing.fallback_image_url,
      data.fallback_link !== undefined ? data.fallback_link : existing.fallback_link,
      now,
      id
    );

    return true;
  }
}
