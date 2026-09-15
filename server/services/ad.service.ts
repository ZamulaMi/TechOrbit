import { db } from '../db/database.ts';
import { AdSlot } from '../types/index.ts';

export class AdService {
  static getAllAdSlots(): AdSlot[] {
    const stmt = db.prepare('SELECT * FROM ad_slots ORDER BY position ASC, id ASC');
    const rows = stmt.all() as any[];
    return rows.map(r => this.mapSlot(r));
  }

  static getActiveSlot(position: string): AdSlot | null {
    const stmt = db.prepare('SELECT * FROM ad_slots WHERE position = ? AND is_active = 1 LIMIT 1');
    const r = stmt.get(position) as any;
    if (!r) return null;
    return this.mapSlot(r);
  }

  static getSlotByKey(key: string): AdSlot | null {
    const stmt = db.prepare('SELECT * FROM ad_slots WHERE slot_key = ? OR id = ? LIMIT 1');
    const r = stmt.get(key, key) as any;
    if (!r) return null;
    return this.mapSlot(r);
  }

  static getPublicActiveSlots(): AdSlot[] {
    const stmt = db.prepare('SELECT * FROM ad_slots WHERE is_active = 1 ORDER BY position ASC');
    const rows = stmt.all() as any[];
    const envPubId = process.env.GOOGLE_ADSENSE_PUB_ID || process.env.VITE_GOOGLE_ADSENSE_PUB_ID || '';
    return rows.map(r => {
      const slot = this.mapSlot(r);
      if (!slot.publisher_id && envPubId) {
        slot.publisher_id = envPubId;
      }
      return slot;
    });
  }

  static updateAdSlot(id: string, data: Partial<AdSlot>): boolean {
    const now = new Date().toISOString();
    const existing = db.prepare('SELECT * FROM ad_slots WHERE id = ?').get(id) as any;
    if (!existing) return false;

    db.prepare(`
      UPDATE ad_slots SET
        name = ?,
        provider = ?,
        publisher_id = ?,
        ad_slot = ?,
        desktop = ?,
        tablet = ?,
        mobile = ?,
        frequency = ?,
        format = ?,
        code_snippet = ?,
        is_active = ?,
        fallback_image_url = ?,
        fallback_link = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      data.name !== undefined ? data.name : existing.name,
      data.provider !== undefined ? data.provider : (existing.provider || 'adsense'),
      data.publisher_id !== undefined ? data.publisher_id : (existing.publisher_id || ''),
      data.ad_slot !== undefined ? data.ad_slot : (existing.ad_slot || ''),
      data.desktop !== undefined ? (data.desktop ? 1 : 0) : existing.desktop,
      data.tablet !== undefined ? (data.tablet ? 1 : 0) : existing.tablet,
      data.mobile !== undefined ? (data.mobile ? 1 : 0) : existing.mobile,
      data.frequency !== undefined ? Number(data.frequency) : (existing.frequency || 1),
      data.format !== undefined ? data.format : (existing.format || 'auto'),
      data.code_snippet !== undefined ? data.code_snippet : existing.code_snippet,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : existing.is_active,
      data.fallback_image_url !== undefined ? data.fallback_image_url : existing.fallback_image_url,
      data.fallback_link !== undefined ? data.fallback_link : existing.fallback_link,
      now,
      id
    );

    return true;
  }

  private static mapSlot(r: any): AdSlot {
    const envPubId = process.env.GOOGLE_ADSENSE_PUB_ID || process.env.VITE_GOOGLE_ADSENSE_PUB_ID || '';
    return {
      ...r,
      is_active: Boolean(r.is_active),
      desktop: r.desktop !== undefined ? Boolean(r.desktop) : true,
      tablet: r.tablet !== undefined ? Boolean(r.tablet) : true,
      mobile: r.mobile !== undefined ? Boolean(r.mobile) : true,
      frequency: r.frequency ? Number(r.frequency) : 1,
      provider: r.provider || 'adsense',
      publisher_id: r.publisher_id || envPubId,
      ad_slot: r.ad_slot || '',
      format: r.format || 'auto'
    };
  }
}
