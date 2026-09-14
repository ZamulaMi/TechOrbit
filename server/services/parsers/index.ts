import { BaseParser } from './types.ts';
import { RssParser } from './rss.parser.ts';
import { SitemapParser } from './sitemap.parser.ts';
import { HtmlParser } from './html.parser.ts';
import { WylsaParser } from './wylsa.parser.ts';

export * from './types.ts';
export * from './block-builder.ts';
export * from './rss.parser.ts';
export * from './sitemap.parser.ts';
export * from './html.parser.ts';
export * from './wylsa.parser.ts';

export class ParserFactory {
  private static parsers: Map<string, BaseParser> = new Map<string, BaseParser>([
    ['generic_rss', new RssParser()],
    ['rss', new RssParser()],
    ['sitemap', new SitemapParser()],
    ['generic_html', new HtmlParser()],
    ['html', new HtmlParser()],
    ['html_scraper', new HtmlParser()],
    ['wylsa_custom', new WylsaParser()],
    ['custom', new HtmlParser()]
  ]);

  static getParser(type: string): BaseParser {
    const normalized = (type || 'generic_rss').toLowerCase();
    const parser = this.parsers.get(normalized);
    if (parser) return parser;
    return this.parsers.get('generic_rss')!;
  }
}
