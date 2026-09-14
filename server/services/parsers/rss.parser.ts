import * as cheerio from 'cheerio';
import { BaseParser, ParsedArticle, ParserDiscoveryResult } from './types.ts';
import { BlockBuilder } from './block-builder.ts';

export class RssParser implements BaseParser {
  type = 'generic_rss';

  async discover(xmlString: string, baseUrl: string): Promise<ParserDiscoveryResult> {
    const $ = cheerio.load(xmlString, { xmlMode: true });
    const isAtom = $('feed').length > 0;

    const feedTitle = $('channel > title, feed > title').first().text().trim();
    const feedDescription = $('channel > description, feed > subtitle').first().text().trim();

    const articleUrls: string[] = [];
    const sampleArticles: ParsedArticle[] = [];

    if (isAtom) {
      $('entry').each((_, entry) => {
        const $entry = $(entry);
        let link = $entry.find('link[rel="alternate"]').attr('href') || $entry.find('link').attr('href') || '';
        if (!link) link = $entry.find('id').text().trim();
        link = BlockBuilder.resolveUrl(link, baseUrl);

        if (link && !articleUrls.includes(link)) {
          articleUrls.push(link);
          if (sampleArticles.length < 5) {
            sampleArticles.push(this.parseAtomEntry($entry, link, baseUrl));
          }
        }
      });
    } else {
      $('item').each((_, item) => {
        const $item = $(item);
        let link = $item.find('link').text().trim() || $item.find('guid').text().trim();
        link = BlockBuilder.resolveUrl(link, baseUrl);

        if (link && !articleUrls.includes(link)) {
          articleUrls.push(link);
          if (sampleArticles.length < 5) {
            sampleArticles.push(this.parseRssItem($item, link, baseUrl));
          }
        }
      });
    }

    return {
      sourceUrl: baseUrl,
      feedTitle,
      feedDescription,
      articleUrls,
      sampleArticles
    };
  }

  async parseArticle(body: string, url: string): Promise<ParsedArticle> {
    const $ = cheerio.load(body, { xmlMode: true });
    // Find matching item by link or guid
    let targetItem = $('item').filter((_, el) => {
      const link = $(el).find('link').text().trim();
      const guid = $(el).find('guid').text().trim();
      return link === url || guid === url;
    }).first();

    if (targetItem.length === 0) {
      targetItem = $('item').first();
    }

    if (targetItem.length > 0) {
      return this.parseRssItem(targetItem, url, url);
    }

    // Atom entry fallback
    let targetEntry = $('entry').filter((_, el) => {
      const link = $(el).find('link').attr('href');
      return link === url;
    }).first();

    if (targetEntry.length === 0) {
      targetEntry = $('entry').first();
    }

    if (targetEntry.length > 0) {
      return this.parseAtomEntry(targetEntry, url, url);
    }

    throw new Error(`Could not find RSS/Atom entry for URL "${url}"`);
  }

  private parseRssItem($item: cheerio.Cheerio<any>, url: string, baseUrl: string): ParsedArticle {
    const title = $item.find('title').text().trim();
    const guid = $item.find('guid').text().trim() || url;
    const author =
      $item.find('dc\\:creator, creator').text().trim() ||
      $item.find('author').text().trim() ||
      'Tech Columnist';
    const pubDateStr = $item.find('pubDate').text().trim();
    const publishedAt = pubDateStr ? new Date(pubDateStr).toISOString() : new Date().toISOString();

    // Content preference: content:encoded > description
    const contentEncoded = $item.find('content\\:encoded, encoded').text();
    const description = $item.find('description').text();
    const rawHtml = contentEncoded || description || '';

    // Extract categories
    const categories: string[] = [];
    $item.find('category').each((_, cat) => {
      const c = cheerio.load(cat).text().trim();
      if (c && !categories.includes(c)) categories.push(c);
    });

    // Extract featured image: enclosure url or media:content or first img in html
    let featuredImageUrl: string | undefined = undefined;
    const enclosure = $item.find('enclosure[type^="image"]').attr('url');
    const mediaContent = $item.find('media\\:content[medium="image"], media\\:content, media\\:thumbnail').attr('url');

    if (enclosure) {
      featuredImageUrl = BlockBuilder.resolveUrl(enclosure, baseUrl);
    } else if (mediaContent) {
      featuredImageUrl = BlockBuilder.resolveUrl(mediaContent, baseUrl);
    } else {
      const imgMatch = rawHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1]) {
        featuredImageUrl = BlockBuilder.resolveUrl(imgMatch[1], baseUrl);
      }
    }

    // Blocks
    const blocks = BlockBuilder.htmlToBlocks(rawHtml, baseUrl);
    const rawText = BlockBuilder.blocksToPlainText(blocks);
    const excerpt = rawText.substring(0, 300).trim();

    return {
      externalId: guid,
      url,
      title,
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

  private parseAtomEntry($entry: cheerio.Cheerio<any>, url: string, baseUrl: string): ParsedArticle {
    const title = $entry.find('title').text().trim();
    const guid = $entry.find('id').text().trim() || url;
    const author = $entry.find('author > name').text().trim() || 'Tech Columnist';
    const pubDateStr = $entry.find('published, updated').first().text().trim();
    const publishedAt = pubDateStr ? new Date(pubDateStr).toISOString() : new Date().toISOString();

    const content = $entry.find('content').text();
    const summary = $entry.find('summary').text();
    const rawHtml = content || summary || '';

    const categories: string[] = [];
    $entry.find('category').each((_, cat) => {
      const term = cheerio.load(cat)('category').attr('term') || cheerio.load(cat)('category').attr('label');
      if (term && !categories.includes(term)) categories.push(term);
    });

    let featuredImageUrl: string | undefined = undefined;
    const imgMatch = rawHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      featuredImageUrl = BlockBuilder.resolveUrl(imgMatch[1], baseUrl);
    }

    const blocks = BlockBuilder.htmlToBlocks(rawHtml, baseUrl);
    const rawText = BlockBuilder.blocksToPlainText(blocks);
    const excerpt = rawText.substring(0, 300).trim();

    return {
      externalId: guid,
      url,
      title,
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
