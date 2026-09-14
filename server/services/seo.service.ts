import { db } from '../db/database.ts';
import { SeoSetting, Article } from '../types/index.ts';

export class SeoService {
  static getSeoSettings(): SeoSetting[] {
    const stmt = db.prepare('SELECT * FROM seo_settings');
    return stmt.all() as unknown as SeoSetting[];
  }

  static getSettingForPage(pageType: SeoSetting['page_type']): SeoSetting | null {
    const stmt = db.prepare('SELECT * FROM seo_settings WHERE page_type = ?');
    return (stmt.get(pageType) as any) || null;
  }

  static updateSeoSetting(data: Partial<SeoSetting> & { page_type: SeoSetting['page_type'] }): void {
    const now = new Date().toISOString();
    const existing = this.getSettingForPage(data.page_type);

    if (existing) {
      db.prepare(`
        UPDATE seo_settings SET
          meta_title_uk = ?,
          meta_title_en = ?,
          meta_desc_uk = ?,
          meta_desc_en = ?,
          og_image_url = ?,
          canonical_base = ?,
          schema_type = ?,
          updated_at = ?
        WHERE page_type = ?
      `).run(
        data.meta_title_uk || existing.meta_title_uk,
        data.meta_title_en || existing.meta_title_en,
        data.meta_desc_uk || existing.meta_desc_uk,
        data.meta_desc_en || existing.meta_desc_en,
        data.og_image_url || existing.og_image_url,
        data.canonical_base || existing.canonical_base,
        data.schema_type || existing.schema_type,
        now,
        data.page_type
      );
    } else {
      const id = 'seo_' + data.page_type;
      db.prepare(`
        INSERT INTO seo_settings (
          id, page_type, meta_title_uk, meta_title_en, meta_desc_uk, meta_desc_en,
          og_image_url, canonical_base, schema_type, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.page_type,
        data.meta_title_uk || '',
        data.meta_title_en || '',
        data.meta_desc_uk || '',
        data.meta_desc_en || '',
        data.og_image_url || '',
        data.canonical_base || 'https://techorbit.media',
        data.schema_type || 'Article',
        now
      );
    }
  }

  static generateArticleJsonLd(article: Article, baseUrl: string = 'https://techorbit.media') {
    return {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: article.title,
      description: article.excerpt,
      image: [article.featured_image_url || `${baseUrl}/og-default.jpg`],
      datePublished: article.published_at || article.created_at,
      dateModified: article.updated_at,
      author: [{
        '@type': 'Person',
        name: article.author_name || 'TechOrbit Editorial Team'
      }],
      publisher: {
        '@type': 'NewsMediaOrganization',
        name: 'TechOrbit',
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/logo.png`
        }
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${baseUrl}/article/${article.slug_uk}`
      }
    };
  }
}
