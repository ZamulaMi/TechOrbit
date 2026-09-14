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
  const tagSlug = req.query.tag as string | undefined;
  const lang = (req.query.lang as Language) || 'uk';
  const limit = parseInt(req.query.limit as string) || 12;
  const offset = parseInt(req.query.offset as string) || 0;
  const search = req.query.search as string | undefined;

  const result = ArticleService.getPublicArticles({
    categorySlug,
    tagSlug,
    lang,
    limit,
    offset,
    search
  });

  res.json(result);
});

// GET /api/public/articles/:slug
publicRouter.get('/articles/:slug', (req: Request, res: Response) => {
  const lang = (req.query.lang as Language) || 'uk';
  const article = ArticleService.getPublicArticleBySlug(req.params.slug, lang);

  if (!article) {
    return res.status(404).json({ error: 'Article not found or not published' });
  }

  // Get translations for language switcher
  const translations = db.prepare('SELECT language, title, slug, excerpt, content FROM article_translations WHERE article_id = ?').all(article.id);

  // Generate SEO schema
  const jsonLd = SeoService.generateArticleJsonLd(article);

  res.json({
    article,
    translations,
    jsonLd
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

  res.json({
    settings,
    socialLinks,
    homepageSections
  });
});

// GET /api/public/ads
publicRouter.get('/ads', (req: Request, res: Response) => {
  const slots = AdService.getAllAdSlots().filter(s => s.is_active);
  res.json(slots);
});

// GET /api/public/seo/:pageType
publicRouter.get('/seo/:pageType', (req: Request, res: Response) => {
  const seo = SeoService.getSettingForPage(req.params.pageType as any);
  res.json(seo || null);
});
