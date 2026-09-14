import { GoogleGenAI } from '@google/genai';
import { db } from '../db/database.ts';
import { ArticleTranslation, Language } from '../types/index.ts';
import { ArticleService } from './article.service.ts';

export class TranslationService {
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

  static saveTranslation(data: {
    articleId: string;
    language: Language;
    title: string;
    subtitle?: string;
    excerpt?: string;
    content: string;
    slug?: string;
    translationStatus?: 'pending' | 'draft' | 'reviewed' | 'published';
    autoTranslated?: boolean;
    reviewedBy?: string | null;
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
          slug = ?,
          translation_status = ?,
          auto_translated = ?,
          reviewed_by = ?,
          updated_at = ?
        WHERE article_id = ? AND language = ?
      `).run(
        data.title,
        data.subtitle || '',
        data.excerpt || '',
        data.content,
        slug,
        data.translationStatus || existing.translation_status,
        data.autoTranslated !== undefined ? (data.autoTranslated ? 1 : 0) : (existing.auto_translated ? 1 : 0),
        data.reviewedBy || existing.reviewed_by,
        now,
        data.articleId,
        data.language
      );
    } else {
      db.prepare(`
        INSERT INTO article_translations (
          id, article_id, language, title, subtitle, excerpt, content, slug,
          translation_status, auto_translated, reviewed_by, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.articleId,
        data.language,
        data.title,
        data.subtitle || '',
        data.excerpt || '',
        data.content,
        slug,
        data.translationStatus || 'draft',
        data.autoTranslated ? 1 : 0,
        data.reviewedBy || null,
        now
      );
    }

    return this.getTranslation(data.articleId, data.language)!;
  }

  // AI-powered translation using Google Gemini API if key is present
  static async translateWithGemini(
    sourceText: string,
    targetLanguage: 'uk' | 'en',
    field: 'title' | 'content' | 'excerpt'
  ): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return `[Translation pipeline configured. Gemini API key required for live AI execution.]\n\n${sourceText}`;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const targetLangName = targetLanguage === 'uk' ? 'Ukrainian (Українська)' : 'English';

      const prompt = `You are a professional technology journalist and translator for the tech publication TechOrbit.
Translate the following ${field} into natural, high-grade ${targetLangName}.
Preserve technical product names, GPU/CPU architectures, model names, specs, numbers, and markdown formatting accurately. Do not add conversational fluff.

Source content:
${sourceText}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      return response.text || sourceText;
    } catch (err: any) {
      console.error('Gemini translation error:', err);
      return sourceText;
    }
  }
}
