import * as cheerio from 'cheerio';
import { BaseParser, ParsedArticle, ParserDiscoveryResult } from './types.ts';
import { BlockBuilder } from './block-builder.ts';

export class SitemapParser implements BaseParser {
  type = 'sitemap';

  async discover(xmlString: string, baseUrl: string, config?: any): Promise<ParserDiscoveryResult> {
    const $ = cheerio.load(xmlString, { xmlMode: true });
    const isSitemapIndex = $('sitemapindex').length > 0;
    const articleUrls: string[] = [];

    const urlPattern = config?.articleUrlPatterns || '';
    const excludePattern = config?.excludedUrlPatterns || '';

    if (isSitemapIndex) {
      // Return sub-sitemaps
      $('sitemap > loc').each((_, loc) => {
        const url = $(loc).text().trim();
        if (url && !articleUrls.includes(url)) {
          articleUrls.push(url);
        }
      });
    } else {
      $('url > loc').each((_, loc) => {
        const url = $(loc).text().trim();
        if (url && !articleUrls.includes(url)) {
          // Filter if patterns exist
          if (this.matchesPatterns(url, urlPattern, excludePattern)) {
            articleUrls.push(url);
          }
        }
      });
    }

    return {
      sourceUrl: baseUrl,
      feedTitle: isSitemapIndex ? 'XML Sitemap Index' : 'XML Sitemap',
      feedDescription: `Contains ${articleUrls.length} discovered URLs`,
      articleUrls
    };
  }

  async parseArticle(body: string, url: string): Promise<ParsedArticle> {
    throw new Error('SitemapParser only discovers URLs. Use HtmlParser to parse article bodies.');
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
