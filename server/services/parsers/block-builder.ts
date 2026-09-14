import * as cheerio from 'cheerio';
import { ContentBlock } from './types.ts';

export class BlockBuilder {
  /**
   * Sanitizes dirty HTML by removing dangerous tags, tracking scripts, and inline event handlers.
   */
  static sanitizeHtml(html: string): string {
    if (!html) return '';
    const $ = cheerio.load(html, { xmlMode: false });

    // Remove script, style, iframe, object, embed, noscript, svg, form, input
    $(
      'script, style, iframe, object, embed, noscript, svg, form, input, button, select, textarea, link, meta'
    ).remove();

    // Remove known ad and tracker classes/ids
    $(
      '[class*="banner"], [class*="advert"], [class*="promo"], [id*="banner"], [id*="advert"], [class*="share"], [class*="social"], [class*="related-posts"]'
    ).remove();

    // Remove inline event attributes (onclick, onload, onerror, etc.)
    $('*').each((_, el) => {
      const attribs = (el as any).attribs || {};
      for (const attr of Object.keys(attribs)) {
        if (attr.startsWith('on') || attr === 'data-track' || attr === 'data-gtm') {
          $(el).removeAttr(attr);
        }
      }
    });

    return $('body').html() || '';
  }

  /**
   * Parses HTML body into structured content blocks (heading, paragraph, image, quote, list, etc.)
   */
  static htmlToBlocks(html: string, baseUrl?: string): ContentBlock[] {
    if (!html) return [];
    const sanitized = this.sanitizeHtml(html);
    const $ = cheerio.load(sanitized);
    const blocks: ContentBlock[] = [];

    // Traverse root elements or main container
    const rootElements = $('body').children().length > 0 ? $('body').children() : $('*');

    rootElements.each((_, el) => {
      const tagName = (el as any).tagName?.toLowerCase();
      const $el = $(el);

      if (!tagName) return;

      // Headings
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        const text = $el.text().trim();
        if (text) {
          const level = parseInt(tagName.substring(1), 10);
          blocks.push({
            type: 'heading',
            level: Math.min(Math.max(level, 2), 4),
            text
          });
        }
        return;
      }

      // Paragraphs
      if (tagName === 'p') {
        // Check if paragraph contains an img
        const img = $el.find('img').first();
        if (img.length > 0 && $el.text().trim().length < 20) {
          const src = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src');
          if (src) {
            blocks.push({
              type: 'image',
              url: this.resolveUrl(src, baseUrl),
              alt: img.attr('alt') || '',
              caption: $el.text().trim() || img.attr('title') || ''
            });
            return;
          }
        }

        const text = $el.text().trim();
        if (text && text.length > 2) {
          blocks.push({
            type: 'paragraph',
            text
          });
        }
        return;
      }

      // Images / Figures
      if (tagName === 'figure' || tagName === 'img') {
        const img = tagName === 'img' ? $el : $el.find('img').first();
        const src = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src') || img.attr('data-original');
        if (src) {
          const caption = $el.find('figcaption').text().trim() || img.attr('alt') || '';
          blocks.push({
            type: 'image',
            url: this.resolveUrl(src, baseUrl),
            alt: img.attr('alt') || caption,
            caption
          });
        }
        return;
      }

      // Blockquotes
      if (tagName === 'blockquote') {
        const text = $el.text().trim();
        if (text) {
          const author = $el.find('cite').text().trim();
          blocks.push({
            type: 'quote',
            text: text.replace(author, '').trim(),
            author: author || undefined
          });
        }
        return;
      }

      // Lists
      if (tagName === 'ul' || tagName === 'ol') {
        const items: string[] = [];
        $el.find('li').each((_, li) => {
          const t = $(li).text().trim();
          if (t) items.push(t);
        });
        if (items.length > 0) {
          blocks.push({
            type: 'list',
            ordered: tagName === 'ol',
            items
          });
        }
        return;
      }

      // Code blocks
      if (tagName === 'pre') {
        const code = $el.text();
        const langClass = $el.find('code').attr('class') || '';
        const langMatch = langClass.match(/language-(\w+)/);
        if (code.trim()) {
          blocks.push({
            type: 'code',
            code,
            language: langMatch ? langMatch[1] : undefined
          });
        }
        return;
      }

      // Fallback: If it's a div or section, inspect text or children
      if (['div', 'section', 'article'].includes(tagName)) {
        // If div has direct text without child elements
        if ($el.children().length === 0) {
          const text = $el.text().trim();
          if (text.length > 20) {
            blocks.push({ type: 'paragraph', text });
          }
        } else {
          // Recursive sub-blocks
          const subBlocks = this.htmlToBlocks($el.html() || '', baseUrl);
          blocks.push(...subBlocks);
        }
      }
    });

    // If no blocks were created but there is plain text, fallback to paragraphs
    if (blocks.length === 0) {
      const text = $('body').text().trim();
      if (text) {
        const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
        for (const p of paragraphs) {
          blocks.push({ type: 'paragraph', text: p });
        }
      }
    }

    return blocks;
  }

  /**
   * Helper to turn relative URLs into absolute URLs
   */
  static resolveUrl(relativeUrl: string, baseUrl?: string): string {
    if (!relativeUrl) return '';
    if (!baseUrl) return relativeUrl;
    try {
      return new URL(relativeUrl, baseUrl).toString();
    } catch {
      return relativeUrl;
    }
  }

  /**
   * Generates clean plain text from structured blocks or HTML.
   */
  static blocksToPlainText(blocks: ContentBlock[]): string {
    return blocks
      .map(b => {
        if (b.type === 'heading' || b.type === 'paragraph') return b.text || '';
        if (b.type === 'quote') return `"${b.text || ''}" ${b.author ? '— ' + b.author : ''}`;
        if (b.type === 'list') return (b.items || []).map(i => `• ${i}`).join('\n');
        if (b.type === 'image') return `[Image: ${b.alt || b.caption || b.url}]`;
        if (b.type === 'code') return b.code || '';
        return '';
      })
      .filter(t => t.trim().length > 0)
      .join('\n\n');
  }

  /**
   * Converts structured blocks to clean semantic HTML.
   */
  static blocksToHtml(blocks: ContentBlock[]): string {
    return blocks
      .map(b => {
        if (b.type === 'heading') {
          const level = b.level || 2;
          return `<h${level}>${escapeHtml(b.text || '')}</h${level}>`;
        }
        if (b.type === 'paragraph') {
          return `<p>${escapeHtml(b.text || '')}</p>`;
        }
        if (b.type === 'image') {
          const caption = b.caption ? `<figcaption>${escapeHtml(b.caption)}</figcaption>` : '';
          return `<figure><img src="${escapeHtml(b.url || '')}" alt="${escapeHtml(b.alt || '')}" />${caption}</figure>`;
        }
        if (b.type === 'quote') {
          const cite = b.author ? `<cite>${escapeHtml(b.author)}</cite>` : '';
          return `<blockquote><p>${escapeHtml(b.text || '')}</p>${cite}</blockquote>`;
        }
        if (b.type === 'list') {
          const tag = b.ordered ? 'ol' : 'ul';
          const items = (b.items || []).map(i => `<li>${escapeHtml(i)}</li>`).join('');
          return `<${tag}>${items}</${tag}>`;
        }
        if (b.type === 'code') {
          return `<pre><code class="language-${escapeHtml(b.language || 'text')}">${escapeHtml(b.code || '')}</code></pre>`;
        }
        return '';
      })
      .filter(h => h.length > 0)
      .join('\n');
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
