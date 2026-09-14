import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { requireAdminAuth, AuthenticatedRequest } from '../auth.ts';
import { ArticleService } from '../services/article.service.ts';
import { ArticleVersionService } from '../services/article-version.service.ts';
import { TranslationService } from '../services/translation.service.ts';
import { PublishingService } from '../services/publishing.service.ts';
import { SourceService } from '../services/source.service.ts';
import { SourceImporter } from '../services/source-importer.service.ts';
import { ChangeDetectionService } from '../services/change-detection.service.ts';
import { SettingsService } from '../services/settings.service.ts';
import { MediaService } from '../services/media.service.ts';
import { SeoService } from '../services/seo.service.ts';
import { AdService } from '../services/ad.service.ts';
import { AuditService } from '../services/audit.service.ts';
import { NotificationService } from '../services/notification.service.ts';
import { ArticleStatus, Language } from '../types/index.ts';

export const adminRouter = Router();

// Apply auth middleware to all admin endpoints
adminRouter.use(requireAdminAuth);

// ----------------------------------------------------
// 1. DASHBOARD STATS
// ----------------------------------------------------
adminRouter.get('/stats', (req: AuthenticatedRequest, res: Response) => {
  const articlesTotal = db.prepare('SELECT count(*) as count FROM articles').get() as { count: number };
  const publishedCount = db.prepare("SELECT count(*) as count FROM articles WHERE status = 'PUBLISHED'").get() as { count: number };
  const reviewQueueCount = db.prepare("SELECT count(*) as count FROM articles WHERE status IN ('PENDING_REVIEW', 'UPDATE_PENDING')").get() as { count: number };
  const importedCount = db.prepare("SELECT count(*) as count FROM articles WHERE status = 'IMPORTED'").get() as { count: number };
  const sourcesCount = db.prepare('SELECT count(*) as count FROM sources WHERE enabled = 1').get() as { count: number };
  const changesCount = db.prepare("SELECT count(*) as count FROM change_events WHERE status = 'pending_review'").get() as { count: number };
  const translationsCount = db.prepare('SELECT count(*) as count FROM article_translations').get() as { count: number };
  const unreadNotifs = NotificationService.getUnreadCount();

  const recentArticles = ArticleService.getAdminArticles({ limit: 5 });
  const recentChanges = ChangeDetectionService.getPendingChanges().slice(0, 5);
  const recentAudit = AuditService.getRecentLogs(6);

  res.json({
    counts: {
      articlesTotal: articlesTotal.count,
      published: publishedCount.count,
      reviewQueue: reviewQueueCount.count,
      imported: importedCount.count,
      sources: sourcesCount.count,
      pendingChanges: changesCount.count,
      translations: translationsCount.count,
      unreadNotifications: unreadNotifs
    },
    recentArticles: recentArticles.articles,
    recentChanges,
    recentAudit
  });
});

// ----------------------------------------------------
// 2. ARTICLES
// ----------------------------------------------------
adminRouter.get('/articles', (req: AuthenticatedRequest, res: Response) => {
  const status = req.query.status as ArticleStatus | undefined;
  const categoryId = req.query.categoryId as string | undefined;
  const sourceId = req.query.sourceId as string | undefined;
  const search = req.query.search as string | undefined;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  const result = ArticleService.getAdminArticles({
    status,
    categoryId,
    sourceId,
    search,
    limit,
    offset
  });

  res.json(result);
});

adminRouter.get('/articles/:id', (req: AuthenticatedRequest, res: Response) => {
  const article = ArticleService.getArticleById(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  res.json(article);
});

adminRouter.post('/articles', (req: AuthenticatedRequest, res: Response) => {
  const article = ArticleService.createArticle(req.body, req.user!.id);
  AuditService.log({
    userId: req.user!.id,
    action: 'ARTICLE_CREATED',
    entityType: 'article',
    entityId: article.id,
    newValues: { title: article.title, status: article.status }
  });
  res.status(201).json(article);
});

adminRouter.put('/articles/:id', (req: AuthenticatedRequest, res: Response) => {
  const reason = (req.body.changeReason as string) || 'Admin update';
  const article = ArticleService.updateArticle(req.params.id, req.body, req.user!.id, reason);
  if (!article) return res.status(404).json({ error: 'Article not found' });

  AuditService.log({
    userId: req.user!.id,
    action: 'ARTICLE_UPDATED',
    entityType: 'article',
    entityId: article.id,
    newValues: { title: article.title, status: article.status }
  });

  res.json(article);
});

adminRouter.delete('/articles/:id', (req: AuthenticatedRequest, res: Response) => {
  const success = ArticleService.deleteArticle(req.params.id);
  if (!success) return res.status(404).json({ error: 'Article not found' });

  AuditService.log({
    userId: req.user!.id,
    action: 'ARTICLE_DELETED',
    entityType: 'article',
    entityId: req.params.id
  });

  res.json({ success: true });
});

// ----------------------------------------------------
// 3. REVIEW QUEUE & MODERATION
// ----------------------------------------------------
adminRouter.get('/review-queue', (req: AuthenticatedRequest, res: Response) => {
  const queue = PublishingService.getReviewQueue();
  res.json(queue);
});

adminRouter.post('/articles/:id/approve', (req: AuthenticatedRequest, res: Response) => {
  const updated = PublishingService.approveArticle(req.params.id, req.user!.id);
  if (!updated) return res.status(404).json({ error: 'Article not found' });
  res.json(updated);
});

adminRouter.post('/articles/:id/publish', (req: AuthenticatedRequest, res: Response) => {
  const updated = PublishingService.publishArticle(req.params.id, req.user!.id);
  if (!updated) return res.status(404).json({ error: 'Article not found' });
  res.json(updated);
});

adminRouter.post('/articles/:id/reject', (req: AuthenticatedRequest, res: Response) => {
  const reason = req.body.reason || 'Rejected by editor';
  const updated = PublishingService.rejectArticle(req.params.id, req.user!.id, reason);
  if (!updated) return res.status(404).json({ error: 'Article not found' });
  res.json(updated);
});

// ----------------------------------------------------
// 4. ARTICLE VERSIONS
// ----------------------------------------------------
adminRouter.get('/articles/:id/versions', (req: AuthenticatedRequest, res: Response) => {
  const versions = ArticleVersionService.getVersionsForArticle(req.params.id);
  res.json(versions);
});

adminRouter.post('/articles/:id/versions/:versionId/rollback', (req: AuthenticatedRequest, res: Response) => {
  const success = ArticleVersionService.rollbackToVersion(req.params.id, req.params.versionId, req.user!.id);
  if (!success) return res.status(400).json({ error: 'Rollback failed. Invalid version.' });

  AuditService.log({
    userId: req.user!.id,
    action: 'ARTICLE_ROLLBACK',
    entityType: 'article',
    entityId: req.params.id,
    newValues: { versionId: req.params.versionId }
  });

  res.json({ success: true, article: ArticleService.getArticleById(req.params.id) });
});

// ----------------------------------------------------
// 5. TRANSLATIONS
// ----------------------------------------------------
adminRouter.get('/articles/:id/translations', (req: AuthenticatedRequest, res: Response) => {
  const translations = TranslationService.getTranslations(req.params.id);
  res.json(translations);
});

adminRouter.post('/articles/:id/translations', (req: AuthenticatedRequest, res: Response) => {
  const translation = TranslationService.saveTranslation({
    articleId: req.params.id,
    language: req.body.language,
    title: req.body.title,
    subtitle: req.body.subtitle,
    excerpt: req.body.excerpt,
    content: req.body.content,
    slug: req.body.slug,
    translationStatus: req.body.translationStatus,
    autoTranslated: req.body.autoTranslated,
    reviewedBy: req.user!.id
  });

  AuditService.log({
    userId: req.user!.id,
    action: 'TRANSLATION_SAVED',
    entityType: 'article_translation',
    entityId: translation.id,
    newValues: { language: translation.language, title: translation.title }
  });

  res.json(translation);
});

adminRouter.post('/articles/:id/translate-ai', async (req: AuthenticatedRequest, res: Response) => {
  const targetLang = (req.body.targetLang as 'uk' | 'en') || 'uk';
  const article = ArticleService.getArticleById(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });

  const translatedTitle = await TranslationService.translateWithGemini(article.title, targetLang, 'title');
  const translatedExcerpt = await TranslationService.translateWithGemini(article.excerpt, targetLang, 'excerpt');
  const translatedContent = await TranslationService.translateWithGemini(article.content, targetLang, 'content');

  const record = TranslationService.saveTranslation({
    articleId: article.id,
    language: targetLang,
    title: translatedTitle,
    excerpt: translatedExcerpt,
    content: translatedContent,
    translationStatus: 'draft',
    autoTranslated: true,
    reviewedBy: null
  });

  res.json({ success: true, translation: record });
});

// ----------------------------------------------------
// 6. CHANGES & DIFF TRACKER
// ----------------------------------------------------
adminRouter.get('/changes', (req: AuthenticatedRequest, res: Response) => {
  const changes = ChangeDetectionService.getPendingChanges();
  res.json(changes);
});

adminRouter.post('/changes/:id/resolve', (req: AuthenticatedRequest, res: Response) => {
  const action = req.body.action as 'merged' | 'dismissed';
  if (!action || !['merged', 'dismissed'].includes(action)) {
    return res.status(400).json({ error: 'Action must be merged or dismissed' });
  }

  const success = ChangeDetectionService.resolveChange(req.params.id, action);
  if (!success) return res.status(404).json({ error: 'Change event not found' });

  AuditService.log({
    userId: req.user!.id,
    action: 'CHANGE_RESOLVED',
    entityType: 'change_event',
    entityId: req.params.id,
    newValues: { status: action }
  });

  res.json({ success: true });
});

// ----------------------------------------------------
// 7. SOURCES
// ----------------------------------------------------
adminRouter.get('/sources', (req: AuthenticatedRequest, res: Response) => {
  const sources = SourceService.getAllSources();
  res.json(sources);
});

adminRouter.post('/sources', (req: AuthenticatedRequest, res: Response) => {
  const source = SourceService.createSource(req.body);
  AuditService.log({
    userId: req.user!.id,
    action: 'SOURCE_CREATED',
    entityType: 'source',
    entityId: source.id,
    newValues: { name: source.name, base_url: source.base_url }
  });
  res.status(201).json(source);
});

adminRouter.put('/sources/:id', (req: AuthenticatedRequest, res: Response) => {
  const source = SourceService.updateSource(req.params.id, req.body);
  if (!source) return res.status(404).json({ error: 'Source not found' });
  AuditService.log({
    userId: req.user!.id,
    action: 'SOURCE_UPDATED',
    entityType: 'source',
    entityId: source.id,
    newValues: req.body
  });
  res.json(source);
});

adminRouter.delete('/sources/:id', (req: AuthenticatedRequest, res: Response) => {
  const success = SourceService.deleteSource(req.params.id);
  if (!success) return res.status(404).json({ error: 'Source not found' });
  AuditService.log({
    userId: req.user!.id,
    action: 'SOURCE_DELETED',
    entityType: 'source',
    entityId: req.params.id
  });
  res.json({ success: true });
});

adminRouter.post('/sources/test', async (req: AuthenticatedRequest, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  const result = await SourceService.testConnection(url);
  res.json(result);
});

adminRouter.post('/sources/:id/sync', async (req: AuthenticatedRequest, res: Response) => {
  const result = await SourceImporter.triggerSourceSync(req.params.id, req.user!.id);
  res.json(result);
});

adminRouter.get('/sources/sync-jobs', (req: AuthenticatedRequest, res: Response) => {
  const sourceId = req.query.sourceId as string | undefined;
  const jobs = SourceService.getSyncJobs(sourceId);
  res.json(jobs);
});

// ----------------------------------------------------
// 8. CATEGORIES & TAGS
// ----------------------------------------------------
adminRouter.get('/categories', (req: AuthenticatedRequest, res: Response) => {
  const cats = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
  res.json(cats);
});

adminRouter.post('/categories', (req: AuthenticatedRequest, res: Response) => {
  const { name_uk, name_en, slug_uk, slug_en, description_uk, description_en, sort_order } = req.body;
  const id = 'cat_' + Date.now().toString(36);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO categories (id, name_uk, name_en, slug_uk, slug_en, description_uk, description_en, sort_order, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(id, name_uk, name_en, slug_uk, slug_en, description_uk || '', description_en || '', sort_order || 0, now);

  res.status(201).json({ id, name_uk, name_en });
});

adminRouter.get('/tags', (req: AuthenticatedRequest, res: Response) => {
  const tags = db.prepare('SELECT * FROM tags ORDER BY name_uk ASC').all();
  res.json(tags);
});

adminRouter.post('/tags', (req: AuthenticatedRequest, res: Response) => {
  const { name_uk, name_en, slug_uk, slug_en } = req.body;
  const id = 'tag_' + Date.now().toString(36);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO tags (id, name_uk, name_en, slug_uk, slug_en, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name_uk, name_en, slug_uk, slug_en, now);

  res.status(201).json({ id, name_uk, name_en });
});

// ----------------------------------------------------
// 9. AUTHORS
// ----------------------------------------------------
adminRouter.get('/authors', (req: AuthenticatedRequest, res: Response) => {
  const authors = db.prepare('SELECT * FROM authors ORDER BY name ASC').all();
  res.json(authors);
});

adminRouter.post('/authors', (req: AuthenticatedRequest, res: Response) => {
  const id = 'author_' + Date.now().toString(36);
  const now = new Date().toISOString();
  const { name, role, bio_uk, bio_en, avatar_url, email } = req.body;

  db.prepare(`
    INSERT INTO authors (id, name, role, bio_uk, bio_en, avatar_url, email, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(id, name, role || 'Tech Columnist', bio_uk || '', bio_en || '', avatar_url || '', email || '', now);

  res.status(201).json({ id, name });
});

// ----------------------------------------------------
// 10. MEDIA
// ----------------------------------------------------
adminRouter.get('/media', (req: AuthenticatedRequest, res: Response) => {
  const items = MediaService.getAllMedia();
  res.json(items);
});

adminRouter.post('/media', (req: AuthenticatedRequest, res: Response) => {
  const media = MediaService.registerMedia({
    ...req.body,
    createdBy: req.user!.id
  });
  res.status(201).json(media);
});

adminRouter.delete('/media/:id', (req: AuthenticatedRequest, res: Response) => {
  const success = MediaService.deleteMedia(req.params.id);
  res.json({ success });
});

// ----------------------------------------------------
// 11. SETTINGS & SITE ELEMENTS
// ----------------------------------------------------
adminRouter.get('/settings', (req: AuthenticatedRequest, res: Response) => {
  const settings = SettingsService.getAllSettings();
  res.json(settings);
});

adminRouter.post('/settings', (req: AuthenticatedRequest, res: Response) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'Setting key is required' });

  SettingsService.updateSetting(key, value, req.user!.id);
  AuditService.log({
    userId: req.user!.id,
    action: 'SETTING_UPDATED',
    entityType: 'site_setting',
    entityId: key,
    newValues: { value }
  });

  res.json({ success: true, key, value });
});

adminRouter.get('/homepage-sections', (req: AuthenticatedRequest, res: Response) => {
  const sections = SettingsService.getHomepageSections();
  res.json(sections);
});

// ----------------------------------------------------
// 12. ADS
// ----------------------------------------------------
adminRouter.get('/ads', (req: AuthenticatedRequest, res: Response) => {
  const ads = AdService.getAllAdSlots();
  res.json(ads);
});

adminRouter.put('/ads/:id', (req: AuthenticatedRequest, res: Response) => {
  const success = AdService.updateAdSlot(req.params.id, req.body);
  res.json({ success });
});

// ----------------------------------------------------
// 13. SOCIAL LINKS
// ----------------------------------------------------
adminRouter.get('/social-links', (req: AuthenticatedRequest, res: Response) => {
  const links = SettingsService.getAllSocialLinks();
  res.json(links);
});

adminRouter.post('/social-links', (req: AuthenticatedRequest, res: Response) => {
  SettingsService.saveSocialLink(req.body);
  res.json({ success: true });
});

// ----------------------------------------------------
// 14. SEO
// ----------------------------------------------------
adminRouter.get('/seo', (req: AuthenticatedRequest, res: Response) => {
  const list = SeoService.getSeoSettings();
  res.json(list);
});

adminRouter.post('/seo', (req: AuthenticatedRequest, res: Response) => {
  SeoService.updateSeoSetting(req.body);
  res.json({ success: true });
});

// ----------------------------------------------------
// 15. NOTIFICATIONS
// ----------------------------------------------------
adminRouter.get('/notifications', (req: AuthenticatedRequest, res: Response) => {
  const list = NotificationService.getNotifications();
  res.json(list);
});

adminRouter.post('/notifications/:id/read', (req: AuthenticatedRequest, res: Response) => {
  NotificationService.markAsRead(req.params.id);
  res.json({ success: true });
});

adminRouter.post('/notifications/read-all', (req: AuthenticatedRequest, res: Response) => {
  NotificationService.markAllAsRead();
  res.json({ success: true });
});

// ----------------------------------------------------
// 16. USERS & ROLES
// ----------------------------------------------------
adminRouter.get('/users', (req: AuthenticatedRequest, res: Response) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.email, u.role_id, u.must_change_password, u.is_active, u.created_at, r.name as role_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    ORDER BY u.created_at ASC
  `).all();
  res.json(users);
});

adminRouter.get('/roles', (req: AuthenticatedRequest, res: Response) => {
  const roles = db.prepare('SELECT * FROM roles').all();
  res.json(roles);
});

// ----------------------------------------------------
// 17. AUDIT LOGS
// ----------------------------------------------------
adminRouter.get('/audit-logs', (req: AuthenticatedRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const logs = AuditService.getRecentLogs(limit, offset);
  res.json(logs);
});

// ----------------------------------------------------
// 18. SYNC LOGS
// ----------------------------------------------------
adminRouter.get('/sync-logs', (req: AuthenticatedRequest, res: Response) => {
  const logs = db.prepare(`
    SELECT sl.*, s.name as source_name
    FROM sync_logs sl
    JOIN sources s ON s.id = sl.source_id
    ORDER BY sl.created_at DESC
    LIMIT 100
  `).all();
  res.json(logs);
});
