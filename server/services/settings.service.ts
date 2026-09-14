import { db } from '../db/database.ts';
import { SiteSetting, SocialLink, SiteElement, HomepageSection } from '../types/index.ts';

export class SettingsService {
  static getAllSettings(): Record<string, string> {
    const rows = db.prepare('SELECT key, value FROM site_settings').all() as unknown as SiteSetting[];
    const map: Record<string, string> = {};
    for (const r of rows) {
      map[r.key] = r.value;
    }
    return map;
  }

  static getSetting(key: string, defaultValue: string = ''): string {
    const row = db.prepare('SELECT value FROM site_settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? row.value : defaultValue;
  }

  static updateSetting(key: string, value: string, userId?: string): void {
    const now = new Date().toISOString();
    const existing = db.prepare('SELECT key FROM site_settings WHERE key = ?').get(key);

    if (existing) {
      db.prepare(`
        UPDATE site_settings
        SET value = ?, updated_at = ?, updated_by = ?
        WHERE key = ?
      `).run(value, now, userId || null, key);
    } else {
      db.prepare(`
        INSERT INTO site_settings (key, value, description, updated_at, updated_by)
        VALUES (?, ?, '', ?, ?)
      `).run(key, value, now, userId || null);
    }
  }

  static getSocialLinks(): SocialLink[] {
    return db.prepare('SELECT * FROM social_links WHERE is_active = 1 ORDER BY sort_order ASC').all() as unknown as SocialLink[];
  }

  static getAllSocialLinks(): SocialLink[] {
    return db.prepare('SELECT * FROM social_links ORDER BY sort_order ASC').all() as unknown as SocialLink[];
  }

  static saveSocialLink(link: Partial<SocialLink>): void {
    const now = new Date().toISOString();
    if (link.id) {
      db.prepare(`
        UPDATE social_links
        SET platform = ?, url = ?, title = ?, icon = ?, sort_order = ?, is_active = ?, updated_at = ?
        WHERE id = ?
      `).run(
        link.platform || '',
        link.url || '',
        link.title || '',
        link.icon || '',
        link.sort_order || 0,
        link.is_active ? 1 : 0,
        now,
        link.id
      );
    } else {
      const id = 'soc_' + Date.now();
      db.prepare(`
        INSERT INTO social_links (id, platform, url, title, icon, sort_order, is_active, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        link.platform || '',
        link.url || '',
        link.title || '',
        link.icon || '',
        link.sort_order || 0,
        link.is_active !== false ? 1 : 0,
        now
      );
    }
  }

  static getHomepageSections(): HomepageSection[] {
    return db.prepare('SELECT * FROM homepage_sections WHERE is_active = 1 ORDER BY sort_order ASC').all() as unknown as HomepageSection[];
  }

  static getSiteElements(): SiteElement[] {
    return db.prepare('SELECT * FROM site_elements WHERE is_active = 1').all() as unknown as SiteElement[];
  }
}
