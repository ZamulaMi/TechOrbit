import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './server/db/database.ts';
import { authRouter } from './server/routes/auth.routes.ts';
import { adminRouter } from './server/routes/admin.routes.ts';
import { publicRouter } from './server/routes/public.routes.ts';
import { SeoService } from './server/services/seo.service.ts';

async function startServer() {
  // Initialize SQLite database and schema migrations
  initDatabase();

  const app = express();
  const PORT = 3000;

  // Global Middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Security Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'TechOrbit Media & CMS Engine',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // API Routes
  app.use('/api/admin', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/public', publicRouter);

  // Dynamic SEO Sitemaps & Robots.txt
  app.get('/robots.txt', (req, res) => {
    const baseUrl = SeoService.getBaseUrl(req.get('origin') || `${req.protocol}://${req.get('host')}`);
    const robots = SeoService.generateRobotsTxt(baseUrl);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(robots);
  });

  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = SeoService.getBaseUrl(req.get('origin') || `${req.protocol}://${req.get('host')}`);
    const xml = SeoService.generateSitemapIndex(baseUrl);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  });

  app.get('/sitemap-articles.xml', (req, res) => {
    const baseUrl = SeoService.getBaseUrl(req.get('origin') || `${req.protocol}://${req.get('host')}`);
    const xml = SeoService.generateArticlesSitemap(baseUrl);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  });

  app.get('/sitemap-categories.xml', (req, res) => {
    const baseUrl = SeoService.getBaseUrl(req.get('origin') || `${req.protocol}://${req.get('host')}`);
    const xml = SeoService.generateCategoriesSitemap(baseUrl);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  });

  app.get('/sitemap-images.xml', (req, res) => {
    const baseUrl = SeoService.getBaseUrl(req.get('origin') || `${req.protocol}://${req.get('host')}`);
    const xml = SeoService.generateImagesSitemap(baseUrl);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  });

  // Vite Middleware / Static SPA serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TechOrbit] Server initialized on http://0.0.0.0:${PORT}`);
  });
}

startServer();
