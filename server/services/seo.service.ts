import { db } from '../db/database.ts';
import { SeoSetting, Article, Category } from '../types/index.ts';

export class SeoService {
  static getBaseUrl(reqOrigin?: string): string {
    if (process.env.CANONICAL_SITE_URL) {
      return process.env.CANONICAL_SITE_URL.replace(/\/$/, '');
    }
    const globalSetting = this.getSettingForPage('global');
    if (globalSetting?.canonical_base) {
      return globalSetting.canonical_base.replace(/\/$/, '');
    }
    if (reqOrigin && !reqOrigin.includes('localhost') && !reqOrigin.includes('127.0.0.1')) {
      return reqOrigin.replace(/\/$/, '');
    }
    return 'https://techorbit.media';
  }

  static getSeoSettings(): SeoSetting[] {
    const stmt = db.prepare('SELECT * FROM seo_settings ORDER BY id ASC');
    const rows = stmt.all() as any[];
    return rows.map(r => this.mapSeoRow(r));
  }

  static getSettingForPage(pageType: string): SeoSetting | null {
    const stmt = db.prepare('SELECT * FROM seo_settings WHERE page_type = ? LIMIT 1');
    const r = stmt.get(pageType) as any;
    if (!r) return null;
    return this.mapSeoRow(r);
  }

  static getGlobalSettings(): SeoSetting {
    const s = this.getSettingForPage('global');
    if (s) return s;
    return {
      id: 'seo_global',
      page_type: 'global',
      meta_title_uk: 'TechOrbit — Незалежне українське медіа про технології та інновації',
      meta_title_en: 'TechOrbit — Independent Tech Media, AI & Hardware Intelligence',
      meta_desc_uk: 'Оперативні технологічні новини, огляди смартфонів, процесорів, ШІ та науки.',
      meta_desc_en: 'Breaking tech news, independent gadget reviews, AI breakthroughs, and engineering culture.',
      og_image_url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=630&fit=crop&q=80',
      canonical_base: 'https://techorbit.media',
      schema_type: 'NewsMediaOrganization',
      robots: 'index, follow',
      google_analytics_id: process.env.GOOGLE_ANALYTICS_ID || process.env.VITE_GOOGLE_ANALYTICS_ID || '',
      google_search_console_code: process.env.GOOGLE_SITE_VERIFICATION || '',
      sitemap_enabled: true,
      extra_meta_tags: '',
      updated_at: new Date().toISOString()
    };
  }

  static updateSeoSetting(data: Partial<SeoSetting> & { page_type: string }): void {
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
          robots = ?,
          google_analytics_id = ?,
          google_search_console_code = ?,
          sitemap_enabled = ?,
          extra_meta_tags = ?,
          updated_at = ?
        WHERE page_type = ?
      `).run(
        data.meta_title_uk !== undefined ? data.meta_title_uk : existing.meta_title_uk,
        data.meta_title_en !== undefined ? data.meta_title_en : existing.meta_title_en,
        data.meta_desc_uk !== undefined ? data.meta_desc_uk : existing.meta_desc_uk,
        data.meta_desc_en !== undefined ? data.meta_desc_en : existing.meta_desc_en,
        data.og_image_url !== undefined ? data.og_image_url : existing.og_image_url,
        data.canonical_base !== undefined ? data.canonical_base : existing.canonical_base,
        data.schema_type !== undefined ? data.schema_type : existing.schema_type,
        data.robots !== undefined ? data.robots : (existing.robots || 'index, follow'),
        data.google_analytics_id !== undefined ? data.google_analytics_id : (existing.google_analytics_id || ''),
        data.google_search_console_code !== undefined ? data.google_search_console_code : (existing.google_search_console_code || ''),
        data.sitemap_enabled !== undefined ? (data.sitemap_enabled ? 1 : 0) : (existing.sitemap_enabled ? 1 : 0),
        data.extra_meta_tags !== undefined ? data.extra_meta_tags : (existing.extra_meta_tags || ''),
        now,
        data.page_type
      );
    } else {
      const id = 'seo_' + data.page_type;
      db.prepare(`
        INSERT INTO seo_settings (
          id, page_type, meta_title_uk, meta_title_en, meta_desc_uk, meta_desc_en,
          og_image_url, canonical_base, schema_type, robots, google_analytics_id,
          google_search_console_code, sitemap_enabled, extra_meta_tags, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.page_type,
        data.meta_title_uk || '',
        data.meta_title_en || '',
        data.meta_desc_uk || '',
        data.meta_desc_en || '',
        data.og_image_url || '',
        data.canonical_base || 'https://techorbit.media',
        data.schema_type || 'WebSite',
        data.robots || 'index, follow',
        data.google_analytics_id || '',
        data.google_search_console_code || '',
        data.sitemap_enabled !== undefined ? (data.sitemap_enabled ? 1 : 0) : 1,
        data.extra_meta_tags || '',
        now
      );
    }
  }

  // --- JSON-LD STRUCTURED DATA ---

  static generateOrganizationJsonLd(baseUrl: string = 'https://techorbit.media') {
    return {
      '@context': 'https://schema.org',
      '@type': 'NewsMediaOrganization',
      name: 'TechOrbit',
      alternateName: 'TechOrbit Media',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/icon.png`,
        width: 512,
        height: 512
      },
      sameAs: [
        'https://t.me/techorbit_media',
        'https://twitter.com/techorbit',
        'https://youtube.com/@techorbit',
        'https://facebook.com/techorbit'
      ],
      description: 'Незалежне українське технологічне онлайн-медіа: огляди, новини, аналітика штучного інтелекту та споживчої електроніки.'
    };
  }

  static generateWebsiteJsonLd(baseUrl: string = 'https://techorbit.media', lang: 'uk' | 'en' = 'uk') {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'TechOrbit',
      url: `${baseUrl}/${lang}`,
      inLanguage: lang === 'uk' ? 'uk-UA' : 'en-US',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${baseUrl}/${lang}/search?q={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      }
    };
  }

  static generateBreadcrumbJsonLd(
    items: { name: string; url: string }[],
    baseUrl: string = 'https://techorbit.media'
  ) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url.startsWith('http') ? item.url : `${baseUrl}${item.url.startsWith('/') ? '' : '/'}${item.url}`
      }))
    };
  }

  static generateArticleJsonLd(
    article: Article,
    baseUrl: string = 'https://techorbit.media',
    lang: 'uk' | 'en' = 'uk'
  ) {
    const slug = lang === 'en' ? (article.slug_en || article.slug_uk) : article.slug_uk;
    const pageUrl = `${baseUrl}/${lang}/article/${slug}`;
    const headline = lang === 'en'
      ? (article.meta_title_en || article.title)
      : (article.meta_title_uk || article.title);
    const description = lang === 'en'
      ? (article.meta_desc_en || article.excerpt)
      : (article.meta_desc_uk || article.excerpt);
    const imageUrl = article.og_image_url || article.featured_image_url || `${baseUrl}/og-default.jpg`;
    const isReview = article.article_type === 'review';

    const baseSchema: any = {
      '@context': 'https://schema.org',
      '@type': isReview ? 'Review' : 'NewsArticle',
      headline: headline || 'TechOrbit Article',
      description: description || '',
      image: [imageUrl],
      datePublished: article.published_at || article.created_at,
      dateModified: article.updated_at || article.published_at || article.created_at,
      inLanguage: lang === 'uk' ? 'uk-UA' : 'en-US',
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': pageUrl
      },
      author: [
        {
          '@type': 'Person',
          name: article.author_name || 'TechOrbit Editorial Team'
        }
      ],
      publisher: {
        '@type': 'NewsMediaOrganization',
        name: 'TechOrbit',
        url: baseUrl,
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/icon.png`
        }
      }
    };

    if (isReview && article.review_score) {
      baseSchema.itemReviewed = {
        '@type': 'Product',
        name: headline,
        image: imageUrl
      };
      baseSchema.reviewRating = {
        '@type': 'Rating',
        ratingValue: article.review_score,
        bestRating: 10,
        worstRating: 1
      };
    }

    return baseSchema;
  }

  // --- SITEMAPS GENERATION ---

  static generateSitemapIndex(baseUrl: string = 'https://techorbit.media'): string {
    const latestArticle = db.prepare(`
      SELECT updated_at FROM articles
      WHERE (status = 'PUBLISHED' OR status = 'published')
      ORDER BY updated_at DESC LIMIT 1
    `).get() as { updated_at?: string } | undefined;

    const lastmod = latestArticle?.updated_at
      ? new Date(latestArticle.updated_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap-articles.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-categories.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-images.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
</sitemapindex>`;
  }

  static generateArticlesSitemap(baseUrl: string = 'https://techorbit.media'): string {
    // Only published, approved and indexable articles
    const articles = db.prepare(`
      SELECT id, title, slug_uk, slug_en, updated_at, published_at, robots
      FROM articles
      WHERE (status = 'PUBLISHED' OR status = 'published')
        AND (robots IS NULL OR LOWER(robots) NOT LIKE '%noindex%')
      ORDER BY published_at DESC
    `).all() as any[];

    // Fetch approved translations to see if EN version is indexable
    const translations = db.prepare(`
      SELECT article_id, language, slug, translation_status, status
      FROM article_translations
      WHERE language = 'en'
    `).all() as any[];

    const enMap = new Map<string, any>();
    for (const t of translations) {
      if (t.translation_status === 'APPROVED' || t.status === 'approved' || t.translation_status === 'COMPLETED') {
        enMap.set(t.article_id, t);
      }
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`;

    for (const art of articles) {
      const lastmod = (art.updated_at || art.published_at || new Date().toISOString()).split('T')[0];
      const ukSlug = art.slug_uk;
      const ukUrl = `${baseUrl}/uk/article/${encodeURIComponent(ukSlug)}`;

      const hasEn = enMap.has(art.id) || Boolean(art.slug_en);
      const enSlug = enMap.get(art.id)?.slug || art.slug_en || ukSlug;
      const enUrl = `${baseUrl}/en/article/${encodeURIComponent(enSlug)}`;

      // Ukrainian URL entry
      xml += `
  <url>
    <loc>${ukUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="uk" href="${ukUrl}" />`;

      if (hasEn) {
        xml += `
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />`;
      }

      xml += `
    <xhtml:link rel="alternate" hreflang="x-default" href="${ukUrl}" />
  </url>`;

      // English URL entry if translation is published/approved
      if (hasEn) {
        xml += `
  <url>
    <loc>${enUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="uk" href="${ukUrl}" />
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${ukUrl}" />
  </url>`;
      }
    }

    xml += `\n</urlset>`;
    return xml;
  }

  static generateCategoriesSitemap(baseUrl: string = 'https://techorbit.media'): string {
    const categories = db.prepare('SELECT id, slug_uk, slug_en, name_uk, name_en FROM categories ORDER BY sort_order ASC').all() as unknown as Category[];
    const lastmod = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/uk</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="uk" href="${baseUrl}/uk" />
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/uk" />
  </url>
  <url>
    <loc>${baseUrl}/en</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="uk" href="${baseUrl}/uk" />
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/uk" />
  </url>`;

    for (const cat of categories) {
      const ukSlug = cat.slug_uk;
      const enSlug = cat.slug_en || cat.slug_uk;
      const ukUrl = `${baseUrl}/uk/category/${encodeURIComponent(ukSlug)}`;
      const enUrl = `${baseUrl}/en/category/${encodeURIComponent(enSlug)}`;

      xml += `
  <url>
    <loc>${ukUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <xhtml:link rel="alternate" hreflang="uk" href="${ukUrl}" />
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${ukUrl}" />
  </url>
  <url>
    <loc>${enUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <xhtml:link rel="alternate" hreflang="uk" href="${ukUrl}" />
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${ukUrl}" />
  </url>`;
    }

    xml += `\n</urlset>`;
    return xml;
  }

  static generateImagesSitemap(baseUrl: string = 'https://techorbit.media'): string {
    const articles = db.prepare(`
      SELECT title, slug_uk, featured_image_url, updated_at
      FROM articles
      WHERE (status = 'PUBLISHED' OR status = 'published')
        AND featured_image_url IS NOT NULL
        AND featured_image_url != ''
        AND (robots IS NULL OR LOWER(robots) NOT LIKE '%noindex%')
      ORDER BY published_at DESC
    `).all() as any[];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    for (const art of articles) {
      const pageUrl = `${baseUrl}/uk/article/${encodeURIComponent(art.slug_uk)}`;
      const escapedTitle = this.escapeXml(art.title);
      const imgUrl = this.escapeXml(art.featured_image_url);

      xml += `
  <url>
    <loc>${pageUrl}</loc>
    <image:image>
      <image:loc>${imgUrl}</image:loc>
      <image:title>${escapedTitle}</image:title>
      <image:caption>${escapedTitle} — TechOrbit</image:caption>
    </image:image>
  </url>`;
    }

    xml += `\n</urlset>`;
    return xml;
  }

  // --- ROBOTS.TXT GENERATOR ---

  static generateRobotsTxt(baseUrl: string = 'https://techorbit.media'): string {
    const globalSeo = this.getGlobalSettings();
    const isGlobalNoindex = globalSeo.robots && globalSeo.robots.toLowerCase().includes('noindex');

    if (isGlobalNoindex) {
      return `# TechOrbit Robots.txt
User-agent: *
Disallow: /

Sitemap: ${baseUrl}/sitemap.xml
`;
    }

    return `# TechOrbit Robots.txt (Autonomous Web Media)
User-agent: *
Allow: /
Allow: /uk/
Allow: /en/
Allow: /api/public/

# Protect Private & Administrative Paths
Disallow: /admin/
Disallow: /api/admin/
Disallow: /preview/
Disallow: /draft/

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/sitemap-articles.xml
Sitemap: ${baseUrl}/sitemap-categories.xml
Sitemap: ${baseUrl}/sitemap-images.xml
`;
  }

  private static mapSeoRow(r: any): SeoSetting {
    return {
      id: r.id,
      page_type: r.page_type,
      meta_title_uk: r.meta_title_uk || '',
      meta_title_en: r.meta_title_en || '',
      meta_desc_uk: r.meta_desc_uk || '',
      meta_desc_en: r.meta_desc_en || '',
      og_image_url: r.og_image_url || '',
      canonical_base: r.canonical_base || 'https://techorbit.media',
      schema_type: r.schema_type || 'WebSite',
      robots: r.robots || 'index, follow',
      google_analytics_id: r.google_analytics_id || '',
      google_search_console_code: r.google_search_console_code || '',
      sitemap_enabled: r.sitemap_enabled !== undefined ? Boolean(r.sitemap_enabled) : true,
      extra_meta_tags: r.extra_meta_tags || '',
      updated_at: r.updated_at || new Date().toISOString()
    };
  }

  private static escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
