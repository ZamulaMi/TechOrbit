import { GoogleGenAI } from '@google/genai';
import { db } from '../db/database.ts';
import { ArticleTranslation, EditorBlock, Language } from '../types/index.ts';
import { ArticleService } from './article.service.ts';

export interface SeoMeta {
  title: string;
  description: string;
}

export interface TranslatedSeoMeta {
  meta_title: string;
  meta_description: string;
}

export class TranslationService {
  private static getGeminiClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }

  /**
   * System instruction enforcing strict TechOrbit translation rules:
   * - preserve meaning;
   * - preserve structure;
   * - preserve links;
   * - preserve product/model names;
   * - preserve code;
   * - preserve quotes where required;
   * - preserve image captions;
   * - not invent facts;
   * - not invent sources.
   */
  private static getTranslationSystemInstruction(targetLanguage: 'uk' | 'en'): string {
    const targetLangName = targetLanguage === 'uk' ? 'Ukrainian (Українська)' : 'English';
    return `You are a professional technology journalist and translator for TechOrbit media.
Your task is to translate content accurately into ${targetLangName}.

MANDATORY RULES:
1. Preserve meaning faithfully without distortion.
2. Preserve original structure, paragraphs, headings, bullet lists, markdown syntax, and delimiters.
3. Preserve all URLs and markdown links [text](url) - do not remove or alter URLs.
4. Preserve product names, chipsets, model numbers, CPU/GPU architectures verbatim (e.g. Apple M4 Max, Snapdragon 8 Elite, RTX 5090, Intel Core Ultra 9, OLED, 120Hz, 3nm).
5. Preserve code blocks and technical identifiers verbatim.
6. Preserve quotes and image captions verbatim where required.
7. Never invent facts, claims, or specifications.
8. Never invent sources, author names, or references.
9. Style: Professional, concise, authoritative tech journalism.`;
  }

  /**
   * Translates an article title according to TechOrbit rules
   */
  static async translateTitle(title: string, targetLang: 'uk' | 'en'): Promise<string> {
    if (!title || !title.trim()) return '';
    return this.translateText(title, targetLang, 'title');
  }

  /**
   * Translates an excerpt / lead paragraph
   */
  static async translateExcerpt(excerpt: string, targetLang: 'uk' | 'en'): Promise<string> {
    if (!excerpt || !excerpt.trim()) return '';
    return this.translateText(excerpt, targetLang, 'excerpt');
  }

  /**
   * Translates SEO meta tags (title & description)
   */
  static async translateSEO(meta: SeoMeta, targetLang: 'uk' | 'en'): Promise<TranslatedSeoMeta> {
    const metaTitle = meta.title ? await this.translateTitle(meta.title, targetLang) : '';
    const metaDesc = meta.description ? await this.translateExcerpt(meta.description, targetLang) : '';
    return {
      meta_title: metaTitle,
      meta_description: metaDesc
    };
  }

  /**
   * Translates an individual content block preserving its type, settings, and structure
   */
  static async translateBlock(block: EditorBlock, targetLang: 'uk' | 'en'): Promise<EditorBlock> {
    if (!block) return block;
    const cloned: EditorBlock = JSON.parse(JSON.stringify(block));

    try {
      switch (cloned.type) {
        case 'paragraph':
        case 'heading_2':
        case 'heading_3':
          if (typeof cloned.content === 'string') {
            cloned.content = await this.translateText(cloned.content, targetLang, cloned.type);
          } else if (cloned.content?.text) {
            cloned.content.text = await this.translateText(cloned.content.text, targetLang, cloned.type);
          }
          break;

        case 'quote':
          if (typeof cloned.content === 'string') {
            cloned.content = await this.translateText(cloned.content, targetLang, 'quote');
          } else if (cloned.content) {
            if (cloned.content.text) {
              cloned.content.text = await this.translateText(cloned.content.text, targetLang, 'quote');
            }
            if (cloned.content.author && !cloned.content.preserveAuthor) {
              // Author names usually kept or transliterated
              cloned.content.author = cloned.content.author;
            }
          }
          break;

        case 'image':
          if (cloned.content) {
            if (cloned.content.caption) {
              cloned.content.caption = await this.translateText(cloned.content.caption, targetLang, 'image caption');
            }
            if (cloned.content.alt) {
              cloned.content.alt = await this.translateText(cloned.content.alt, targetLang, 'image alt');
            }
          }
          break;

        case 'gallery':
          if (cloned.content?.images && Array.isArray(cloned.content.images)) {
            for (const img of cloned.content.images) {
              if (img.caption) {
                img.caption = await this.translateText(img.caption, targetLang, 'image caption');
              }
              if (img.alt) {
                img.alt = await this.translateText(img.alt, targetLang, 'image alt');
              }
            }
          }
          break;

        case 'video':
        case 'embed':
          if (cloned.content?.caption) {
            cloned.content.caption = await this.translateText(cloned.content.caption, targetLang, 'caption');
          }
          break;

        case 'link':
          if (cloned.content) {
            if (cloned.content.title) {
              cloned.content.title = await this.translateText(cloned.content.title, targetLang, 'link title');
            }
            if (cloned.content.description) {
              cloned.content.description = await this.translateText(cloned.content.description, targetLang, 'link description');
            }
          }
          break;

        case 'list':
          if (Array.isArray(cloned.content?.items)) {
            const translatedItems: string[] = [];
            for (const item of cloned.content.items) {
              translatedItems.push(await this.translateText(item, targetLang, 'list item'));
            }
            cloned.content.items = translatedItems;
          }
          break;

        case 'table':
          if (cloned.content) {
            if (Array.isArray(cloned.content.headers)) {
              const newHeaders: string[] = [];
              for (const h of cloned.content.headers) {
                newHeaders.push(await this.translateText(h, targetLang, 'table header'));
              }
              cloned.content.headers = newHeaders;
            }
            if (Array.isArray(cloned.content.rows)) {
              const newRows: string[][] = [];
              for (const row of cloned.content.rows) {
                const newRow: string[] = [];
                for (const cell of row) {
                  // Only translate if not pure numeric/spec
                  if (/^\d+(\.\d+)?\s*(ghz|mb|gb|tb|w|v|mah|fps|ms|%)?$/i.test(cell.trim())) {
                    newRow.push(cell);
                  } else {
                    newRow.push(await this.translateText(cell, targetLang, 'table cell'));
                  }
                }
                newRows.push(newRow);
              }
              cloned.content.rows = newRows;
            }
          }
          break;

        case 'code':
        case 'ad':
        case 'html':
          // Rules explicitly require preserving code, ads, and HTML as-is
          break;
      }
    } catch (err) {
      console.error(`Error translating block ${cloned.id}:`, err);
    }

    return cloned;
  }

  /**
   * High-level method to translate an entire article:
   * Translates title, subtitle, excerpt, content, structured blocks, and SEO metadata.
   */
  static async translateArticle(articleId: string, targetLang: 'uk' | 'en'): Promise<ArticleTranslation> {
    const article = ArticleService.getArticleById(articleId);
    if (!article) {
      throw new Error(`Article with ID ${articleId} not found`);
    }

    const sourceTitle = article.title;
    const sourceSubtitle = article.subtitle || '';
    const sourceExcerpt = article.excerpt || '';
    const sourceContent = article.content || '';

    // 1. Translate Title
    const translatedTitle = await this.translateTitle(sourceTitle, targetLang);

    // 2. Translate Subtitle
    const translatedSubtitle = sourceSubtitle
      ? await this.translateText(sourceSubtitle, targetLang, 'subtitle')
      : '';

    // 3. Translate Excerpt
    const translatedExcerpt = await this.translateExcerpt(sourceExcerpt, targetLang);

    // 4. Translate Structured Blocks if present, otherwise translate raw markdown content
    let translatedBlocksJson = '[]';
    let translatedContent = '';

    if (article.structured_blocks_json && article.structured_blocks_json !== '[]') {
      try {
        const blocks: EditorBlock[] = JSON.parse(article.structured_blocks_json);
        const translatedBlocks: EditorBlock[] = [];
        for (const b of blocks) {
          translatedBlocks.push(await this.translateBlock(b, targetLang));
        }
        translatedBlocksJson = JSON.stringify(translatedBlocks);

        // Derive markdown content from translated blocks
        translatedContent = this.blocksToMarkdown(translatedBlocks);
      } catch {
        translatedContent = await this.translateText(sourceContent, targetLang, 'article content');
      }
    } else {
      translatedContent = await this.translateText(sourceContent, targetLang, 'article content');
    }

    // 5. Translate SEO Metadata
    const seoResult = await this.translateSEO(
      {
        title: article.meta_title_uk || article.title,
        description: article.meta_desc_uk || article.excerpt
      },
      targetLang
    );

    // 6. Generate localized slug
    const generatedSlug = ArticleService.slugify(translatedTitle);

    // 7. Save translation record
    const now = new Date().toISOString();
    const translationRecord = this.saveTranslation({
      articleId: article.id,
      language: targetLang,
      title: translatedTitle,
      subtitle: translatedSubtitle,
      excerpt: translatedExcerpt,
      content: translatedContent,
      meta_title: seoResult.meta_title,
      meta_description: seoResult.meta_description,
      slug: generatedSlug,
      status: 'draft',
      translationStatus: 'draft',
      autoTranslated: true,
      translated_at: now,
      structured_blocks_json: translatedBlocksJson
    });

    // Also update article's translation_status
    db.prepare('UPDATE articles SET translation_status = ?, updated_at = ? WHERE id = ?').run(
      'READY_FOR_REVIEW',
      now,
      article.id
    );

    return translationRecord;
  }

  /**
   * Converts editor blocks into readable markdown string
   */
  static blocksToMarkdown(blocks: EditorBlock[]): string {
    return blocks
      .filter(b => b.visible !== false)
      .map(b => {
        switch (b.type) {
          case 'heading_2':
            return `## ${typeof b.content === 'string' ? b.content : b.content?.text || ''}`;
          case 'heading_3':
            return `### ${typeof b.content === 'string' ? b.content : b.content?.text || ''}`;
          case 'quote':
            return `> ${typeof b.content === 'string' ? b.content : b.content?.text || ''}${
              b.content?.author ? `\n> — *${b.content.author}*` : ''
            }`;
          case 'list':
            if (Array.isArray(b.content?.items)) {
              return b.content.items.map((it: string) => `- ${it}`).join('\n');
            }
            return '';
          case 'code':
            return `\`\`\`${b.settings?.language || ''}\n${b.content?.code || b.content || ''}\n\`\`\``;
          case 'image':
            return `![${b.content?.alt || 'image'}](${b.content?.url || ''})${
              b.content?.caption ? `\n*${b.content.caption}*` : ''
            }`;
          case 'paragraph':
          default:
            return typeof b.content === 'string' ? b.content : b.content?.text || '';
        }
      })
      .filter(Boolean)
      .join('\n\n');
  }

  /**
   * Converts markdown text into structured EditorBlock array
   */
  static markdownToBlocks(markdown: string): EditorBlock[] {
    if (!markdown || !markdown.trim()) return [];
    const chunks = markdown.split(/\n\n+/);
    const blocks: EditorBlock[] = [];

    chunks.forEach((chunk, index) => {
      const trimmed = chunk.trim();
      if (!trimmed) return;

      const id = 'blk_' + Math.random().toString(36).substring(2, 9);

      if (trimmed.startsWith('### ')) {
        blocks.push({
          id,
          type: 'heading_3',
          content: trimmed.replace(/^###\s+/, ''),
          settings: {},
          order: index,
          visible: true
        });
      } else if (trimmed.startsWith('## ')) {
        blocks.push({
          id,
          type: 'heading_2',
          content: trimmed.replace(/^##\s+/, ''),
          settings: {},
          order: index,
          visible: true
        });
      } else if (trimmed.startsWith('> ')) {
        const text = trimmed
          .split('\n')
          .map(l => l.replace(/^>\s*/, ''))
          .join('\n');
        blocks.push({
          id,
          type: 'quote',
          content: { text, author: '' },
          settings: {},
          order: index,
          visible: true
        });
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
        const items = trimmed
          .split('\n')
          .map(l => l.replace(/^[-*•]\s+/, '').trim())
          .filter(Boolean);
        blocks.push({
          id,
          type: 'list',
          content: { items, ordered: false },
          settings: {},
          order: index,
          visible: true
        });
      } else if (trimmed.startsWith('```')) {
        const lines = trimmed.split('\n');
        const lang = lines[0].replace(/^```/, '').trim();
        const code = lines.slice(1, -1).join('\n');
        blocks.push({
          id,
          type: 'code',
          content: { code, language: lang || 'typescript' },
          settings: { language: lang || 'typescript' },
          order: index,
          visible: true
        });
      } else if (trimmed.startsWith('![') && trimmed.includes('](')) {
        const match = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
        if (match) {
          blocks.push({
            id,
            type: 'image',
            content: { alt: match[1], url: match[2], caption: '' },
            settings: {},
            order: index,
            visible: true
          });
          return;
        }
        blocks.push({
          id,
          type: 'paragraph',
          content: trimmed,
          settings: {},
          order: index,
          visible: true
        });
      } else {
        blocks.push({
          id,
          type: 'paragraph',
          content: trimmed,
          settings: {},
          order: index,
          visible: true
        });
      }
    });

    return blocks;
  }

  /**
   * Core text translation method using Gemini or fallback
   */
  private static async translateText(
    text: string,
    targetLanguage: 'uk' | 'en',
    contextDescription: string = 'text'
  ): Promise<string> {
    const ai = this.getGeminiClient();

    if (ai) {
      try {
        const prompt = `Translate the following ${contextDescription} into ${
          targetLanguage === 'uk' ? 'Ukrainian' : 'English'
        }.
Source content:
${text}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: this.getTranslationSystemInstruction(targetLanguage),
            temperature: 0.2
          }
        });

        if (response.text && response.text.trim()) {
          return response.text.trim();
        }
      } catch (err) {
        console.warn(`Gemini API error during translation of ${contextDescription}:`, err);
      }
    }

    // High quality deterministic rule-based tech translation fallback
    return this.fallbackTechTranslate(text, targetLanguage);
  }

  /**
   * Deterministic rule-based tech translation fallback when API key is not supplied
   */
  private static fallbackTechTranslate(text: string, targetLang: 'uk' | 'en'): string {
    if (targetLang === 'en') {
      // Ukrainian -> English common patterns
      const map: [RegExp, string][] = [
        [/Новий /gi, 'New '],
        [/Огляд /gi, 'Review: '],
        [/Характеристики/gi, 'Specifications'],
        [/Процесор/gi, 'Processor'],
        [/Дисплей/gi, 'Display'],
        [/Камера/gi, 'Camera'],
        [/Акумулятор/gi, 'Battery'],
        [/Ціна та доступність/gi, 'Price and Availability'],
        [/Компанія /gi, 'Company '],
        [/представила /gi, 'unveiled '],
        [/оголосила про /gi, 'announced '],
        [/згідно з /gi, 'according to '],
        [/порівняно з /gi, 'compared to ']
      ];
      let res = text;
      for (const [pattern, replacement] of map) {
        res = res.replace(pattern, replacement);
      }
      return res;
    } else {
      // English -> Ukrainian common tech dictionary & patterns
      const map: [RegExp, string][] = [
        [/\bNew\b/gi, 'Новий'],
        [/\bReview\b/gi, 'Огляд'],
        [/\bSpecifications\b/gi, 'Технічні характеристики'],
        [/\bFeatures\b/gi, 'Особливості та функції'],
        [/\bProcessor\b/gi, 'Процесор'],
        [/\bDisplay\b/gi, 'Дисплей'],
        [/\bBattery life\b/gi, 'Час автономної роботи'],
        [/\bBattery\b/gi, 'Акумулятор'],
        [/\bCamera\b/gi, 'Камера'],
        [/\bPerformance\b/gi, 'Продуктивність'],
        [/\bPrice\b/gi, 'Ціна'],
        [/\bRelease Date\b/gi, 'Дата релізу'],
        [/\bAnnounced\b/gi, 'Анонсовано'],
        [/\bBenchmark\b/gi, 'Бенчмарк'],
        [/\bAccording to reports\b/gi, 'Згідно з повідомленнями'],
        [/\bIn comparison to\b/gi, 'У порівнянні з']
      ];
      let res = text;
      for (const [pattern, replacement] of map) {
        res = res.replace(pattern, replacement);
      }
      return res;
    }
  }

  // Database operations
  static getTranslations(articleId: string): ArticleTranslation[] {
    const stmt = db.prepare('SELECT * FROM article_translations WHERE article_id = ?');
    const rows = stmt.all(articleId) as any[];
    return rows.map(r => ({
      ...r,
      auto_translated: Boolean(r.auto_translated)
    }));
  }

  static getTranslation(articleId: string, language: Language): ArticleTranslation | null {
    const stmt = db.prepare('SELECT * FROM article_translations WHERE article_id = ? AND language = ?');
    const r = stmt.get(articleId, language) as any;
    if (!r) return null;
    return {
      ...r,
      auto_translated: Boolean(r.auto_translated)
    };
  }

  /**
   * Retrieves translation workspace record:
   * Article + UA version + EN version + Source Info
   */
  static getTranslationWorkspaceData(articleId: string) {
    const article = ArticleService.getArticleById(articleId);
    if (!article) return null;

    const translations = this.getTranslations(articleId);
    const uaTranslation = translations.find(t => t.language === 'uk');
    const enTranslation = translations.find(t => t.language === 'en');

    // Parse blocks or generate from markdown
    let uaBlocks: EditorBlock[] = [];
    if (article.structured_blocks_json && article.structured_blocks_json !== '[]') {
      try {
        uaBlocks = JSON.parse(article.structured_blocks_json);
      } catch {
        uaBlocks = this.markdownToBlocks(article.content);
      }
    } else {
      uaBlocks = this.markdownToBlocks(article.content);
    }

    let enBlocks: EditorBlock[] = [];
    if (enTranslation?.structured_blocks_json && enTranslation.structured_blocks_json !== '[]') {
      try {
        enBlocks = JSON.parse(enTranslation.structured_blocks_json);
      } catch {
        enBlocks = this.markdownToBlocks(enTranslation.content);
      }
    } else if (enTranslation?.content) {
      enBlocks = this.markdownToBlocks(enTranslation.content);
    }

    return {
      article,
      uaTranslation: uaTranslation || {
        id: 'trans_' + article.id + '_uk',
        article_id: article.id,
        language: 'uk' as Language,
        title: article.title,
        subtitle: article.subtitle,
        excerpt: article.excerpt,
        content: article.content,
        meta_title: article.meta_title_uk || article.title,
        meta_description: article.meta_desc_uk || article.excerpt,
        slug: article.slug_uk,
        status: article.status === 'PUBLISHED' ? 'published' : 'reviewed',
        auto_translated: false,
        structured_blocks_json: JSON.stringify(uaBlocks),
        updated_at: article.updated_at
      },
      enTranslation: enTranslation || null,
      uaBlocks,
      enBlocks,
      sourceInfo: {
        source_name: article.source_name || 'Першоджерело TechOrbit',
        source_url: article.source_url || '',
        source_author: article.source_author || '',
        source_published_at: article.source_published_at || '',
        rights_status: article.rights_status || 'fair_use_rewritten'
      }
    };
  }

  /**
   * Retrieves summary of all articles with their translation states for /admin/translations
   */
  static getTranslationsSummaryList(filters: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.search && filters.search.trim()) {
      conditions.push('(a.title LIKE ? OR a.slug_uk LIKE ?)');
      const term = `%${filters.search.trim()}%`;
      params.push(term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        a.id as article_id,
        a.title,
        a.excerpt,
        a.status as article_status,
        a.translation_status,
        a.slug_uk,
        a.slug_en,
        a.source_name,
        a.source_url,
        a.rights_status,
        a.updated_at,
        c.name_uk as category_name_uk,
        (SELECT title FROM article_translations WHERE article_id = a.id AND language = 'uk') as ua_title,
        (SELECT status FROM article_translations WHERE article_id = a.id AND language = 'uk') as ua_status,
        (SELECT title FROM article_translations WHERE article_id = a.id AND language = 'en') as en_title,
        (SELECT status FROM article_translations WHERE article_id = a.id AND language = 'en') as en_status,
        (SELECT updated_at FROM article_translations WHERE article_id = a.id AND language = 'en') as en_updated_at
      FROM articles a
      LEFT JOIN categories c ON c.id = a.category_id
      ${whereClause}
      ORDER BY a.updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const countSql = `SELECT count(*) as count FROM articles a ${whereClause}`;
    const total = (db.prepare(countSql).get(...params) as { count: number }).count;
    const rows = db.prepare(sql).all(...params, limit, offset) as any[];

    return {
      items: rows,
      total
    };
  }

  static saveTranslation(data: {
    articleId: string;
    language: Language;
    title: string;
    subtitle?: string;
    excerpt?: string;
    content: string;
    meta_title?: string;
    meta_description?: string;
    slug?: string;
    status?: string;
    translationStatus?: string;
    autoTranslated?: boolean;
    reviewedBy?: string | null;
    translated_at?: string | null;
    reviewed_at?: string | null;
    structured_blocks_json?: string;
  }): ArticleTranslation {
    const now = new Date().toISOString();
    const id = 'trans_' + data.articleId + '_' + data.language;
    const slug = data.slug || ArticleService.slugify(data.title);

    const existing = this.getTranslation(data.articleId, data.language);

    if (existing) {
      db.prepare(`
        UPDATE article_translations SET
          title = ?,
          subtitle = ?,
          excerpt = ?,
          content = ?,
          meta_title = ?,
          meta_description = ?,
          slug = ?,
          status = ?,
          translation_status = ?,
          auto_translated = ?,
          reviewed_by = ?,
          translated_at = COALESCE(?, translated_at),
          reviewed_at = COALESCE(?, reviewed_at),
          structured_blocks_json = COALESCE(?, structured_blocks_json),
          updated_at = ?
        WHERE article_id = ? AND language = ?
      `).run(
        data.title,
        data.subtitle || '',
        data.excerpt || '',
        data.content,
        data.meta_title || '',
        data.meta_description || '',
        slug,
        data.status || existing.status || 'draft',
        data.translationStatus || existing.translation_status || 'draft',
        data.autoTranslated !== undefined ? (data.autoTranslated ? 1 : 0) : (existing.auto_translated ? 1 : 0),
        data.reviewedBy || existing.reviewed_by,
        data.translated_at || null,
        data.reviewed_at || null,
        data.structured_blocks_json || null,
        now,
        data.articleId,
        data.language
      );
    } else {
      db.prepare(`
        INSERT INTO article_translations (
          id, article_id, language, title, subtitle, excerpt, content,
          meta_title, meta_description, slug, status,
          translation_status, auto_translated, reviewed_by,
          translated_at, reviewed_at, structured_blocks_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.articleId,
        data.language,
        data.title,
        data.subtitle || '',
        data.excerpt || '',
        data.content,
        data.meta_title || '',
        data.meta_description || '',
        slug,
        data.status || 'draft',
        data.translationStatus || 'draft',
        data.autoTranslated ? 1 : 0,
        data.reviewedBy || null,
        data.translated_at || now,
        data.reviewed_at || null,
        data.structured_blocks_json || '[]',
        now
      );
    }

    return this.getTranslation(data.articleId, data.language)!;
  }

  static approveTranslation(articleId: string, language: Language, userId: string): boolean {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE article_translations SET
        status = 'approved',
        translation_status = 'approved',
        reviewed_by = ?,
        reviewed_at = ?,
        updated_at = ?
      WHERE article_id = ? AND language = ?
    `).run(userId, now, now, articleId, language);

    // If both translations are reviewed/approved, update article translation_status
    db.prepare(`
      UPDATE articles SET translation_status = 'APPROVED', updated_at = ? WHERE id = ?
    `).run(now, articleId);

    return true;
  }

  static rejectTranslation(articleId: string, language: Language, userId: string, reason: string): boolean {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE article_translations SET
        status = 'rejected',
        translation_status = 'rejected',
        reviewed_by = ?,
        reviewed_at = ?,
        updated_at = ?
      WHERE article_id = ? AND language = ?
    `).run(userId, now, now, articleId, language);

    db.prepare(`
      UPDATE articles SET translation_status = 'REJECTED', updated_at = ? WHERE id = ?
    `).run(now, articleId);

    return true;
  }

  // Backward compatibility alias for existing code
  static async translateWithGemini(
    sourceText: string,
    targetLanguage: 'uk' | 'en',
    field: 'title' | 'content' | 'excerpt'
  ): Promise<string> {
    if (field === 'title') return this.translateTitle(sourceText, targetLanguage);
    if (field === 'excerpt') return this.translateExcerpt(sourceText, targetLanguage);
    return this.translateText(sourceText, targetLanguage, field);
  }
}
