import * as cheerio from 'cheerio';
import { BaseParser, ParsedArticle, ParserDiscoveryResult } from './types.ts';
import { BlockBuilder } from './block-builder.ts';
import { RssParser } from './rss.parser.ts';

export class WylsaParser implements BaseParser {
  type = 'wylsa_custom';
  private rssParser = new RssParser();

  async discover(body: string, baseUrl: string, config?: any): Promise<ParserDiscoveryResult> {
    // Check if body is XML/RSS feed
    if (body.includes('<rss') || body.includes('<feed') || body.includes('<channel')) {
      return this.rssParser.discover(body, baseUrl);
    }

    // HTML discovery
    const $ = cheerio.load(body);
    const articleUrls: string[] = [];

    // Wylsa article link selectors
    $('.post-card a, .post-item a, article a, h2.entry-title a, .post-title a').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const url = BlockBuilder.resolveUrl(href, baseUrl);

      // Filter out non-article URLs (tags, authors, categories, comments)
      if (
        url.includes('/tag/') ||
        url.includes('/author/') ||
        url.includes('/page/') ||
        url.includes('#') ||
        url.endsWith('.jpg') ||
        url.endsWith('.png') ||
        url.endsWith('.webp')
      ) {
        return;
      }

      if (!articleUrls.includes(url) && url.startsWith('http')) {
        articleUrls.push(url);
      }
    });

    return {
      sourceUrl: baseUrl,
      feedTitle: 'Wylsa.com Technology Feed',
      feedDescription: 'Огляди гаджетів, новини технологій, авто та софт',
      articleUrls
    };
  }

  async parseArticle(body: string, url: string, config?: any): Promise<ParsedArticle> {
    // If it's XML, delegate to RSS parser
    if (body.includes('<rss') || body.includes('<channel')) {
      return this.rssParser.parseArticle(body, url);
    }

    const $ = cheerio.load(body);

    // Clean Wylsa promo, widgets & ads
    $(
      '.telegram-join, .telegram-box, .banner-container, .adsbygoogle, .wylsa-social, .share-buttons, .related-posts, .comments-area, script, style, iframe'
    ).remove();

    // 1. Title
    const title =
      $('h1.entry-title, .single-post-title, h1').first().text().trim() ||
      $('meta[property="og:title"]').attr('content')?.trim() ||
      '';

    // 2. Author
    const author =
      $('.author-name, .post-author a, a[rel="author"], .byline').first().text().trim() ||
      $('meta[name="author"]').attr('content')?.trim() ||
      'Редакція Wylsa';

    // 3. Date
    const dateStr =
      $('time.entry-date').attr('datetime') ||
      $('meta[property="article:published_time"]').attr('content') ||
      $('time').first().text().trim();
    const publishedAt = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();

    // 4. Featured Image
    let featuredImageUrl =
      $('meta[property="og:image"]').attr('content') ||
      $('figure.entry-featured-image img, .post-thumbnail img, .single-featured-image img').first().attr('src') ||
      $('.entry-content img').first().attr('src');

    if (featuredImageUrl) {
      featuredImageUrl = BlockBuilder.resolveUrl(featuredImageUrl, url);
    }

    // 5. Categories
    const categories: string[] = [];
    $('.entry-categories a, .post-categories a, [rel="category tag"], .badge-category').each((_, el) => {
      const cat = $(el).text().trim();
      if (cat && !categories.includes(cat)) categories.push(cat);
    });

    if (categories.length === 0) {
      const section = $('meta[property="article:section"]').attr('content');
      if (section) categories.push(section.trim());
    }

    // 6. Content Container
    const contentEl = $('div.entry-content, article.post, div.post-content').first();
    const rawHtml = contentEl.html() || $('article').html() || '';

    // Convert to blocks
    const blocks = BlockBuilder.htmlToBlocks(rawHtml, url);
    const rawText = BlockBuilder.blocksToPlainText(blocks);
    const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
    const excerpt = metaDesc.trim() || rawText.substring(0, 300).trim();

    return {
      externalId: url,
      url,
      title: title || 'Wylsa Tech Article',
      author,
      publishedAt,
      rawHtml,
      rawText,
      excerpt,
      featuredImageUrl,
      categories,
      tags: categories,
      blocks
    };
  }
}
