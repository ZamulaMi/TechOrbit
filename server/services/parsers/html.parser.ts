import * as cheerio from 'cheerio';
import { BaseParser, ParsedArticle, ParserDiscoveryResult } from './types.ts';
import { BlockBuilder } from './block-builder.ts';

export interface HtmlParserConfig {
  titleSelector?: string;
  contentSelector?: string;
  authorSelector?: string;
  dateSelector?: string;
  imageSelector?: string;
  categorySelector?: string;
  linksSelector?: string;
  articleUrlPatterns?: string;
  excludedUrlPatterns?: string;
  removeSelectors?: string;
}

export class HtmlParser implements BaseParser {
  type = 'generic_html';

  async discover(html: string, baseUrl: string, config?: HtmlParserConfig): Promise<ParserDiscoveryResult> {
    const $ = cheerio.load(html);
    const linksSelector = config?.linksSelector || 'article a, .post a, .entry a, h2 a, h3 a, main a';
    const discoveredUrls: string[] = [];

    $(linksSelector).each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      const resolved = BlockBuilder.resolveUrl(href, baseUrl);
      if (!resolved.startsWith('http')) return;

      // Filter by pattern
      if (this.matchesPatterns(resolved, config?.articleUrlPatterns || '', config?.excludedUrlPatterns || '')) {
        if (!discoveredUrls.includes(resolved)) {
          discoveredUrls.push(resolved);
        }
      }
    });

    const pageTitle = $('title').text().trim() || $('h1').first().text().trim();
    const metaDesc = $('meta[name="description"]').attr('content') || '';

    return {
      sourceUrl: baseUrl,
      feedTitle: pageTitle,
      feedDescription: metaDesc,
      articleUrls: discoveredUrls
    };
  }

  async parseArticle(html: string, url: string, config?: HtmlParserConfig): Promise<ParsedArticle> {
    const $ = cheerio.load(html);

    // Remove unwanted selectors first if specified
    const removeSelectors =
      config?.removeSelectors ||
      'script, style, iframe, noscript, nav, footer, header, .comments, .ad, .advertisement, .social-share, .related-posts, .sidebar';
    $(removeSelectors).remove();

    // 1. Title
    let title = '';
    if (config?.titleSelector) {
      title = $(config.titleSelector).first().text().trim();
    }
    if (!title) {
      title =
        $('meta[property="og:title"]').attr('content')?.trim() ||
        $('h1.entry-title, h1.article-title, h1.post-title, h1').first().text().trim() ||
        $('title').text().replace(/[-|•].*$/, '').trim();
    }

    // 2. Author
    let author = '';
    if (config?.authorSelector) {
      author = $(config.authorSelector).first().text().trim();
    }
    if (!author) {
      author =
        $('meta[name="author"]').attr('content')?.trim() ||
        $('meta[property="article:author"]').attr('content')?.trim() ||
        $('[rel="author"], .author-name, .author, .byline').first().text().trim() ||
        'Tech Columnist';
    }

    // 3. Published Date
    let publishedAt = '';
    if (config?.dateSelector) {
      const el = $(config.dateSelector).first();
      publishedAt = el.attr('datetime') || el.text().trim();
    }
    if (!publishedAt) {
      publishedAt =
        $('meta[property="article:published_time"]').attr('content') ||
        $('time[datetime]').first().attr('datetime') ||
        $('time').first().text().trim();
    }
    const parsedDate = publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString();

    // 4. Featured Image
    let featuredImageUrl: string | undefined = undefined;
    if (config?.imageSelector) {
      const imgEl = $(config.imageSelector).first();
      featuredImageUrl = imgEl.attr('content') || imgEl.attr('src') || imgEl.attr('data-src');
    }
    if (!featuredImageUrl) {
      featuredImageUrl =
        $('meta[property="og:image"]').attr('content') ||
        $('figure.featured-image img, .post-thumbnail img, .entry-featured-image img, article img').first().attr('src');
    }
    if (featuredImageUrl) {
      featuredImageUrl = BlockBuilder.resolveUrl(featuredImageUrl, url);
    }

    // 5. Categories & Tags
    const categories: string[] = [];
    if (config?.categorySelector) {
      $(config.categorySelector).each((_, el) => {
        const cat = $(el).text().trim();
        if (cat && !categories.includes(cat)) categories.push(cat);
      });
    }
    if (categories.length === 0) {
      const ogSection = $('meta[property="article:section"]').attr('content');
      if (ogSection) categories.push(ogSection.trim());
      $('[rel="category tag"], .category, .cat-links a').each((_, el) => {
        const cat = $(el).text().trim();
        if (cat && !categories.includes(cat)) categories.push(cat);
      });
    }

    // 6. Content Body
    let contentHtml = '';
    if (config?.contentSelector) {
      contentHtml = $(config.contentSelector).first().html() || '';
    }
    if (!contentHtml) {
      const candidates = [
        'article.entry-content',
        'div.entry-content',
        'div.post-content',
        'article.post-content',
        'div.article__body',
        'div.article-content',
        'main article',
        'article'
      ];
      for (const sel of candidates) {
        const found = $(sel).first();
        if (found.length > 0 && found.text().trim().length > 100) {
          contentHtml = found.html() || '';
          break;
        }
      }
    }
    if (!contentHtml) {
      contentHtml = $('main').html() || $('body').html() || '';
    }

    // Build structured blocks
    const blocks = BlockBuilder.htmlToBlocks(contentHtml, url);
    const rawText = BlockBuilder.blocksToPlainText(blocks);
    const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
    const excerpt = metaDesc.trim() || rawText.substring(0, 300).trim();

    return {
      externalId: url,
      url,
      title: title || 'Untitled Tech Article',
      author,
      publishedAt: parsedDate,
      rawHtml: contentHtml,
      rawText,
      excerpt,
      featuredImageUrl,
      categories,
      tags: categories,
      blocks
    };
  }

  private matchesPatterns(url: string, includePatterns: string, excludePatterns: string): boolean {
    if (excludePatterns) {
      const excludes = excludePatterns.split(',').map(s => s.trim()).filter(Boolean);
      for (const pattern of excludes) {
        if (this.matchWildcard(url, pattern)) return false;
      }
    }

    if (!includePatterns) return true;

    const includes = includePatterns.split(',').map(s => s.trim()).filter(Boolean);
    if (includes.length === 0) return true;

    for (const pattern of includes) {
      if (this.matchWildcard(url, pattern)) return true;
    }
    return false;
  }

  private matchWildcard(str: string, pattern: string): boolean {
    const regexStr = '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
    try {
      return new RegExp(regexStr, 'i').test(str);
    } catch {
      return str.includes(pattern);
    }
  }
}
