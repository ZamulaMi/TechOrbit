import { Router, Request, Response } from 'express';
import { db } from '../db/database.ts';
import { ArticleService } from '../services/article.service.ts';
import { SettingsService } from '../services/settings.service.ts';
import { SeoService } from '../services/seo.service.ts';
import { AdService } from '../services/ad.service.ts';
import { Language } from '../types/index.ts';

export const publicRouter = Router();

// GET /api/public/articles
publicRouter.get('/articles', (req: Request, res: Response) => {
  const categorySlug = req.query.category as string | undefined;
  const categoryId = req.query.categoryId as string | undefined;
  const tagSlug = req.query.tag as string | undefined;
  const lang = (req.query.lang as Language) || 'uk';
  const limit = parseInt(req.query.limit as string) || 12;
  const offset = parseInt(req.query.offset as string) || 0;
  const search = req.query.search as string | undefined;
  const type = req.query.type as 'news' | 'review' | 'all' | undefined;
  const sortBy = req.query.sortBy as 'latest' | 'popular' | 'trending' | 'title' | undefined;

  const result = ArticleService.getPublicArticles({
    categorySlug,
    categoryId,
    tagSlug,
    lang,
    limit,
    offset,
    search,
    type,
    sortBy
  });

  res.json(result);
});

// GET /api/public/search
publicRouter.get('/search', (req: Request, res: Response) => {
  const query = (req.query.q as string) || (req.query.search as string) || '';
  const lang = (req.query.lang as Language) || 'uk';
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  const result = ArticleService.searchPublicArticles({
    query,
    lang,
    limit,
    offset
  });

  res.json(result);
});

// GET /api/public/related/:articleId
publicRouter.get('/related/:articleId', (req: Request, res: Response) => {
  const lang = (req.query.lang as Language) || 'uk';
  const limit = parseInt(req.query.limit as string) || 4;

  const articles = ArticleService.getRelatedArticles(req.params.articleId, limit, lang);
  res.json(articles);
});

// GET /api/public/site-elements
publicRouter.get('/site-elements', (req: Request, res: Response) => {
  const elements = SettingsService.getSiteElements();
  res.json(elements);
});

// GET /api/public/social-links
publicRouter.get('/social-links', (req: Request, res: Response) => {
  const links = SettingsService.getSocialLinks();
  res.json(links);
});

// GET /api/public/homepage-sections
publicRouter.get('/homepage-sections', (req: Request, res: Response) => {
  const sections = SettingsService.getHomepageSections();
  res.json(sections);
});

// POST /api/public/newsletter
publicRouter.post('/newsletter', (req: Request, res: Response) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required' });
  }

  try {
    const existing = db.prepare('SELECT email FROM newsletter_subscribers WHERE email = ?').get(email);
    if (!existing) {
      db.prepare(`
        INSERT INTO newsletter_subscribers (id, email, subscribed_at, is_active)
        VALUES (?, ?, ?, 1)
      `).run('sub_' + Date.now(), email, new Date().toISOString());
    }
  } catch {
    // If table doesn't exist yet, we can create it or ignore
  }

  res.json({ success: true, message: 'Thank you for subscribing to TechOrbit!' });
});

// GET /api/public/articles/:slug
publicRouter.get('/articles/:slug', (req: Request, res: Response) => {
  const lang = (req.query.lang as Language) || 'uk';
  const article = ArticleService.getPublicArticleBySlug(req.params.slug, lang);

  if (!article) {
    return res.status(404).json({ error: 'Article not found or not published' });
  }

  // Increment views count safely in background
  try {
    db.prepare('UPDATE articles SET views_count = views_count + 1 WHERE id = ?').run(article.id);
  } catch {}

  // Get translations for language switcher & alternate links
  const translations = db.prepare('SELECT language, title, slug, excerpt, content, translation_status, status FROM article_translations WHERE article_id = ?').all(article.id) as any[];

  const baseUrl = SeoService.getBaseUrl(req.get('origin') || `${req.protocol}://${req.get('host')}`);
  const currentSlug = lang === 'en' ? (article.slug_en || article.slug_uk) : article.slug_uk;

  // Never canonical to wylsa.com; strictly self-referencing canonical
  let canonicalUrl = article.canonical_url;
  if (!canonicalUrl || canonicalUrl.includes('wylsa.com')) {
    canonicalUrl = `${baseUrl}/${lang}/article/${encodeURIComponent(currentSlug)}`;
  }

  const enTranslation = translations.find(t => t.language === 'en');
  const enSlug = enTranslation?.slug || article.slug_en || article.slug_uk;
  const ukSlug = article.slug_uk;

  const hreflangs = [
    { lang: 'uk', href: `${baseUrl}/uk/article/${encodeURIComponent(ukSlug)}` },
    { lang: 'en', href: `${baseUrl}/en/article/${encodeURIComponent(enSlug)}` },
    { lang: 'x-default', href: `${baseUrl}/uk/article/${encodeURIComponent(ukSlug)}` }
  ];

  const metaTitle = (lang === 'en' ? article.meta_title_en : article.meta_title_uk) || article.title;
  const metaDesc = (lang === 'en' ? article.meta_desc_en : article.meta_desc_uk) || article.excerpt;
  const ogImage = article.og_image_url || article.featured_image_url || `${baseUrl}/icon.png`;

  const meta = {
    title: metaTitle,
    description: metaDesc,
    canonical: canonicalUrl,
    robots: article.robots || 'index, follow',
    ogTitle: metaTitle,
    ogDescription: metaDesc,
    ogImage,
    ogUrl: `${baseUrl}/${lang}/article/${encodeURIComponent(currentSlug)}`,
    twitterTitle: metaTitle,
    twitterDescription: metaDesc,
    twitterImage: ogImage,
    hreflangs
  };

  const jsonLd = SeoService.generateArticleJsonLd(article, baseUrl, lang);
  const categoryName = lang === 'en' ? (article.category_name_en || article.category_name_uk) : (article.category_name_uk || article.category_name_en);
  const categorySlug = lang === 'en' ? (article.category_slug_en || article.category_slug_uk) : (article.category_slug_uk || article.category_slug_en);

  const breadcrumbs = [
    { name: lang === 'en' ? 'Home' : 'Головна', url: `/${lang}` },
    ...(categoryName ? [{ name: categoryName, url: `/${lang}/category/${encodeURIComponent(categorySlug || '')}` }] : []),
    { name: metaTitle, url: `/${lang}/article/${currentSlug}` }
  ];
  const breadcrumbJsonLd = SeoService.generateBreadcrumbJsonLd(breadcrumbs, baseUrl);

  res.json({
    article,
    translations,
    meta,
    jsonLd,
    breadcrumbJsonLd,
    breadcrumbs
  });
});

// GET /api/public/categories
publicRouter.get('/categories', (req: Request, res: Response) => {
  const cats = db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC').all();
  res.json(cats);
});

// GET /api/public/settings
publicRouter.get('/settings', (req: Request, res: Response) => {
  const settings = SettingsService.getAllSettings();
  const socialLinks = SettingsService.getSocialLinks();
  const homepageSections = SettingsService.getHomepageSections();
  const siteElements = SettingsService.getSiteElements();

  res.json({
    settings,
    socialLinks,
    homepageSections,
    siteElements
  });
});

// GET /api/public/ads
publicRouter.get('/ads', (req: Request, res: Response) => {
  const slots = AdService.getPublicActiveSlots();
  res.json(slots);
});

// GET /api/public/seo/global
publicRouter.get('/seo/global', (req: Request, res: Response) => {
  const baseUrl = SeoService.getBaseUrl(req.get('origin') || `${req.protocol}://${req.get('host')}`);
  const globalSeo = SeoService.getGlobalSettings();
  const orgJsonLd = SeoService.generateOrganizationJsonLd(baseUrl);
  const websiteJsonLdUk = SeoService.generateWebsiteJsonLd(baseUrl, 'uk');
  const websiteJsonLdEn = SeoService.generateWebsiteJsonLd(baseUrl, 'en');

  res.json({
    seo: globalSeo,
    orgJsonLd,
    websiteJsonLdUk,
    websiteJsonLdEn,
    baseUrl
  });
});

// GET /api/public/seo/:pageType
publicRouter.get('/seo/:pageType', (req: Request, res: Response) => {
  const seo = SeoService.getSettingForPage(req.params.pageType as any);
  res.json(seo || null);
});
