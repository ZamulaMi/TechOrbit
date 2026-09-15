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
    return db.prepare('SELECT * FROM social_links WHERE is_active = 1 ORDER BY sort_order ASC').all().map(r => ({
      ...r,
      is_active: Boolean((r as any).is_active)
    })) as unknown as SocialLink[];
  }

  static getAllSocialLinks(): SocialLink[] {
    return db.prepare('SELECT * FROM social_links ORDER BY sort_order ASC').all().map(r => ({
      ...r,
      is_active: Boolean((r as any).is_active)
    })) as unknown as SocialLink[];
  }

  static saveSocialLink(link: Partial<SocialLink>): SocialLink {
    const now = new Date().toISOString();
    let id = link.id;
    if (id) {
      db.prepare(`
        UPDATE social_links
        SET platform = ?, url = ?, title = ?, icon = ?, sort_order = ?, is_active = ?, updated_at = ?
        WHERE id = ?
      `).run(
        link.platform || '',
        link.url || '',
        link.title || '',
        link.icon || '',
        link.sort_order ?? 0,
        link.is_active ? 1 : 0,
        now,
        id
      );
    } else {
      id = 'soc_' + Date.now();
      db.prepare(`
        INSERT INTO social_links (id, platform, url, title, icon, sort_order, is_active, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        link.platform || '',
        link.url || '',
        link.title || '',
        link.icon || '',
        link.sort_order ?? 0,
        link.is_active !== false ? 1 : 0,
        now
      );
    }
    const row = db.prepare('SELECT * FROM social_links WHERE id = ?').get(id) as any;
    return { ...row, is_active: Boolean(row.is_active) };
  }

  static deleteSocialLink(id: string): void {
    db.prepare('DELETE FROM social_links WHERE id = ?').run(id);
  }

  // ----------------------------------------------------
  // HOMEPAGE SECTIONS
  // ----------------------------------------------------
  static getHomepageSections(): HomepageSection[] {
    const rows = db.prepare('SELECT * FROM homepage_sections WHERE is_active = 1 ORDER BY sort_order ASC').all() as any[];
    return rows.map(r => ({
      ...r,
      is_active: Boolean(r.is_active),
      desktop_visible: Boolean(r.desktop_visible ?? 1),
      mobile_visible: Boolean(r.mobile_visible ?? 1),
      layout: r.layout || 'grid',
      article_count: r.article_count || 6,
      sort_by: r.sort_by || 'latest'
    }));
  }

  static getAllHomepageSections(): HomepageSection[] {
    const rows = db.prepare('SELECT * FROM homepage_sections ORDER BY sort_order ASC').all() as any[];
    return rows.map(r => ({
      ...r,
      is_active: Boolean(r.is_active),
      desktop_visible: Boolean(r.desktop_visible ?? 1),
      mobile_visible: Boolean(r.mobile_visible ?? 1),
      layout: r.layout || 'grid',
      article_count: r.article_count || 6,
      sort_by: r.sort_by || 'latest'
    }));
  }

  static saveHomepageSection(section: Partial<HomepageSection>): HomepageSection {
    const now = new Date().toISOString();
    let id = section.id;
    if (id) {
      db.prepare(`
        UPDATE homepage_sections
        SET title_uk = ?, title_en = ?, section_type = ?, category_id = ?, layout = ?, article_count = ?,
            sort_by = ?, desktop_visible = ?, mobile_visible = ?, config_json = ?, sort_order = ?, is_active = ?, updated_at = ?
        WHERE id = ?
      `).run(
        section.title_uk || '',
        section.title_en || '',
        section.section_type || 'category_blocks',
        section.category_id || null,
        section.layout || 'grid',
        section.article_count ?? 6,
        section.sort_by || 'latest',
        section.desktop_visible !== false ? 1 : 0,
        section.mobile_visible !== false ? 1 : 0,
        typeof section.config_json === 'string' ? section.config_json : JSON.stringify(section.config_json || {}),
        section.sort_order ?? 0,
        section.is_active !== false ? 1 : 0,
        now,
        id
      );
    } else {
      id = 'sec_' + Date.now();
      const maxOrderRow = db.prepare('SELECT MAX(sort_order) as maxOrder FROM homepage_sections').get() as { maxOrder?: number };
      const nextOrder = (maxOrderRow?.maxOrder ?? 0) + 1;

      db.prepare(`
        INSERT INTO homepage_sections (
          id, title_uk, title_en, section_type, category_id, layout, article_count,
          sort_by, desktop_visible, mobile_visible, config_json, sort_order, is_active, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        section.title_uk || 'Нова секція',
        section.title_en || 'New Section',
        section.section_type || 'category_blocks',
        section.category_id || null,
        section.layout || 'grid',
        section.article_count ?? 6,
        section.sort_by || 'latest',
        section.desktop_visible !== false ? 1 : 0,
        section.mobile_visible !== false ? 1 : 0,
        typeof section.config_json === 'string' ? section.config_json : JSON.stringify(section.config_json || {}),
        section.sort_order ?? nextOrder,
        section.is_active !== false ? 1 : 0,
        now
      );
    }
    const row = db.prepare('SELECT * FROM homepage_sections WHERE id = ?').get(id) as any;
    return {
      ...row,
      is_active: Boolean(row.is_active),
      desktop_visible: Boolean(row.desktop_visible),
      mobile_visible: Boolean(row.mobile_visible)
    };
  }

  static deleteHomepageSection(id: string): void {
    db.prepare('DELETE FROM homepage_sections WHERE id = ?').run(id);
  }

  static reorderHomepageSections(ids: string[]): void {
    const updateStmt = db.prepare('UPDATE homepage_sections SET sort_order = ? WHERE id = ?');
    db.exec('BEGIN');
    try {
      ids.forEach((id, index) => {
        updateStmt.run(index + 1, id);
      });
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  // ----------------------------------------------------
  // SITE ELEMENTS
  // ----------------------------------------------------
  static getSiteElements(): SiteElement[] {
    const rows = db.prepare('SELECT * FROM site_elements WHERE enabled = 1 OR is_active = 1 ORDER BY sort_order ASC').all() as any[];
    return rows.map(r => ({
      ...r,
      enabled: Boolean(r.enabled ?? r.is_active ?? 1),
      is_active: Boolean(r.enabled ?? r.is_active ?? 1),
      desktop: Boolean(r.desktop ?? 1),
      tablet: Boolean(r.tablet ?? 1),
      mobile: Boolean(r.mobile ?? 1),
      order: r.sort_order ?? r.order ?? 0,
      settings: typeof r.settings === 'string' ? (() => { try { return JSON.parse(r.settings); } catch { return {}; } })() : (r.settings || {})
    }));
  }

  static getAllSiteElements(): SiteElement[] {
    const rows = db.prepare('SELECT * FROM site_elements ORDER BY sort_order ASC, id ASC').all() as any[];
    return rows.map(r => ({
      ...r,
      enabled: Boolean(r.enabled ?? r.is_active ?? 1),
      is_active: Boolean(r.enabled ?? r.is_active ?? 1),
      desktop: Boolean(r.desktop ?? 1),
      tablet: Boolean(r.tablet ?? 1),
      mobile: Boolean(r.mobile ?? 1),
      order: r.sort_order ?? r.order ?? 0,
      settings: typeof r.settings === 'string' ? (() => { try { return JSON.parse(r.settings); } catch { return {}; } })() : (r.settings || {})
    }));
  }

  static saveSiteElement(element: Partial<SiteElement>): SiteElement {
    const now = new Date().toISOString();
    let id = element.id;
    const settingsStr = typeof element.settings === 'object' ? JSON.stringify(element.settings) : (element.settings || '{}');
    const isEnabled = element.enabled !== false && element.is_active !== false ? 1 : 0;

    if (id) {
      db.prepare(`
        UPDATE site_elements
        SET name = ?, type = ?, enabled = ?, is_active = ?, desktop = ?, tablet = ?, mobile = ?,
            sort_order = ?, settings = ?, updated_at = ?
        WHERE id = ?
      `).run(
        element.name || element.element_key || 'Element',
        element.type || 'layout',
        isEnabled,
        isEnabled,
        element.desktop !== false ? 1 : 0,
        element.tablet !== false ? 1 : 0,
        element.mobile !== false ? 1 : 0,
        element.order ?? element.sort_order ?? 0,
        settingsStr,
        now,
        id
      );
    } else {
      id = 'el_' + Date.now();
      db.prepare(`
        INSERT INTO site_elements (
          id, element_key, name, type, section, content_uk, content_en, enabled, is_active,
          desktop, tablet, mobile, sort_order, settings, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        element.element_key || id,
        element.name || 'New Element',
        element.type || 'layout',
        element.section || 'main',
        element.name || '',
        element.name || '',
        isEnabled,
        isEnabled,
        element.desktop !== false ? 1 : 0,
        element.tablet !== false ? 1 : 0,
        element.mobile !== false ? 1 : 0,
        element.order ?? element.sort_order ?? 0,
        settingsStr,
        now
      );
    }

    const row = db.prepare('SELECT * FROM site_elements WHERE id = ?').get(id) as any;
    return {
      ...row,
      enabled: Boolean(row.enabled ?? row.is_active),
      is_active: Boolean(row.enabled ?? row.is_active),
      desktop: Boolean(row.desktop),
      tablet: Boolean(row.tablet),
      mobile: Boolean(row.mobile),
      order: row.sort_order ?? row.order ?? 0,
      settings: typeof row.settings === 'string' ? (() => { try { return JSON.parse(row.settings); } catch { return {}; } })() : (row.settings || {})
    };
  }

  static toggleSiteElement(id: string, enabled: boolean): void {
    const val = enabled ? 1 : 0;
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE site_elements
      SET enabled = ?, is_active = ?, updated_at = ?
      WHERE id = ? OR element_key = ?
    `).run(val, val, now, id, id);
  }

  static reorderSiteElements(ids: string[]): void {
    const updateStmt = db.prepare('UPDATE site_elements SET sort_order = ? WHERE id = ?');
    db.exec('BEGIN');
    try {
      ids.forEach((id, index) => {
        updateStmt.run(index + 1, id);
      });
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}
