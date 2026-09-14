import { ParserType } from '../types/index.ts';

export interface ParsedRawArticle {
  externalId: string;
  url: string;
  title: string;
  excerpt?: string;
  rawContent: string;
  author?: string;
  publishedAt?: string;
  featuredImageUrl?: string;
  categories?: string[];
}

export class SourceParserService {
  static parseRssXml(xmlString: string): ParsedRawArticle[] {
    const items: ParsedRawArticle[] = [];
    const itemMatches = xmlString.match(/<item[\s\S]*?<\/item>/gi) || [];

    for (const itemXml of itemMatches) {
      const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/title>/i);
      const title = (titleMatch ? titleMatch[1] || titleMatch[2] : '').trim();

      const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/link>/i);
      const url = (linkMatch ? linkMatch[1] || linkMatch[2] : '').trim();

      const guidMatch = itemXml.match(/<guid.*?>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/guid>/i);
      const guid = (guidMatch ? guidMatch[1] || guidMatch[2] : url).trim();

      const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i);
      const desc = (descMatch ? descMatch[1] || descMatch[2] : '').trim();

      const creatorMatch = itemXml.match(/<dc:creator>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/dc:creator>/i);
      const author = (creatorMatch ? creatorMatch[1] || creatorMatch[2] : 'Tech Source').trim();

      const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i);
      const pubDate = pubDateMatch ? pubDateMatch[1] : new Date().toISOString();

      if (title && url) {
        items.push({
          externalId: guid || url,
          url,
          title,
          excerpt: desc.replace(/<[^>]*>?/gm, '').substring(0, 300),
          rawContent: desc,
          author,
          publishedAt: pubDate
        });
      }
    }

    return items;
  }
}
