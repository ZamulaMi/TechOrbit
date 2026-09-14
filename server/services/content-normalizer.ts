import crypto from 'crypto';
import { FieldDiff, BlockDiff, StructuredDiff, ChangeEventType, ChangeSeverity } from '../types/index.ts';

export class ContentNormalizer {
  /**
   * Normalizes text by removing non-breaking spaces, zero-width characters,
   * excessive indentation, and collapsing consecutive whitespace.
   */
  static normalizeText(text?: string | null): string {
    if (!text) return '';
    return text
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width chars
      .replace(/\u00A0/g, ' ') // non-breaking space -> regular space
      .replace(/[\r\n]+/g, '\n') // normalize newlines
      .replace(/[ \t]+/g, ' ') // collapse inline spaces
      .replace(/^[ \t]+|[ \t]+$/gm, '') // trim each line
      .trim();
  }

  /**
   * Normalizes URLs by removing tracking parameters and hash fragments.
   */
  static normalizeUrl(rawUrl?: string | null): string {
    if (!rawUrl) return '';
    try {
      const parsed = new URL(rawUrl.trim());
      const trackingParams = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'fbclid',
        'gclid',
        'yclid',
        'ref',
        'source',
        '_ga',
        'mc_eid',
        'mc_cid',
        'zen_source',
        'igshid'
      ];
      for (const p of trackingParams) {
        parsed.searchParams.delete(p);
      }
      parsed.hash = '';
      let pathname = parsed.pathname;
      if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.substring(0, pathname.length - 1);
      }
      parsed.pathname = pathname;
      return parsed.toString();
    } catch {
      return (rawUrl || '').trim();
    }
  }

  /**
   * Strips HTML formatting variations, comments, and empty wrapper tags.
   */
  static normalizeHtml(html?: string | null): string {
    if (!html) return '';
    return html
      .replace(/<!--[\s\S]*?-->/g, '') // remove HTML comments
      .replace(/<(strong|b)>/gi, '<strong>')
      .replace(/<\/(strong|b)>/gi, '</strong>')
      .replace(/<(em|i)>/gi, '<em>')
      .replace(/<\/(em|i)>/gi, '</em>')
      .replace(/<p>\s*(&nbsp;|\s)*<\/p>/gi, '') // remove empty paragraphs
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Computes a SHA-256 hash over normalized fields.
   */
  static computeHash(inputs: (string | null | undefined)[]): string {
    const combined = inputs
      .map(s => this.normalizeText(s || ''))
      .filter(Boolean)
      .join('::');
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Compares an old state (from source_snapshots or article) with a new parsed state,
   * returning whether a semantic change occurred, the structured diff, change type, and severity.
   */
  static buildDiff(
    oldData: {
      title?: string | null;
      subtitle?: string | null;
      excerpt?: string | null;
      content?: string | null;
      author?: string | null;
      category?: string | null;
      featured_image_url?: string | null;
      tags?: string[];
      links?: string[];
      blocks?: any[];
    },
    newData: {
      title: string;
      subtitle?: string | null;
      excerpt?: string | null;
      content: string;
      author?: string | null;
      category?: string | null;
      featured_image_url?: string | null;
      tags?: string[];
      links?: string[];
      blocks?: any[];
    }
  ): {
    hasChanged: boolean;
    changeType: ChangeEventType;
    severity: ChangeSeverity;
    summary: string;
    diff: StructuredDiff;
  } {
    const normOldTitle = this.normalizeText(oldData.title);
    const normNewTitle = this.normalizeText(newData.title);
    const titleChanged = normOldTitle !== normNewTitle;

    const normOldSubtitle = this.normalizeText(oldData.subtitle);
    const normNewSubtitle = this.normalizeText(newData.subtitle);
    const subtitleChanged = normOldSubtitle !== normNewSubtitle;

    const normOldExcerpt = this.normalizeText(oldData.excerpt);
    const normNewExcerpt = this.normalizeText(newData.excerpt);
    const excerptChanged = normOldExcerpt !== normNewExcerpt;

    const normOldContent = this.normalizeText(oldData.content);
    const normNewContent = this.normalizeText(newData.content);
    const contentChanged = normOldContent !== normNewContent;

    const normOldAuthor = this.normalizeText(oldData.author);
    const normNewAuthor = this.normalizeText(newData.author);
    const authorChanged = normOldAuthor !== normNewAuthor;

    const normOldCat = this.normalizeText(oldData.category);
    const normNewCat = this.normalizeText(newData.category);
    const categoryChanged = normOldCat !== normNewCat;

    const normOldImage = this.normalizeUrl(oldData.featured_image_url);
    const normNewImage = this.normalizeUrl(newData.featured_image_url);
    const imageChanged = normOldImage !== normNewImage;

    const oldTags = (oldData.tags || []).map(t => this.normalizeText(t)).filter(Boolean);
    const newTags = (newData.tags || []).map(t => this.normalizeText(t)).filter(Boolean);
    const tagsChanged = JSON.stringify(oldTags.sort()) !== JSON.stringify(newTags.sort());

    const oldLinks = (oldData.links || []).map(l => this.normalizeUrl(l)).filter(Boolean);
    const newLinks = (newData.links || []).map(l => this.normalizeUrl(l)).filter(Boolean);
    const linksChanged = JSON.stringify(oldLinks.sort()) !== JSON.stringify(newLinks.sort());

    // Block-level diff
    const oldBlocks: any[] = oldData.blocks || [];
    const newBlocks: any[] = newData.blocks || [];
    const blockDiffs: BlockDiff[] = [];

    let addedBlocks = 0;
    let removedBlocks = 0;
    let changedBlocks = 0;
    let unchangedBlocks = 0;

    const maxLen = Math.max(oldBlocks.length, newBlocks.length);
    for (let i = 0; i < maxLen; i++) {
      const oBlock = oldBlocks[i];
      const nBlock = newBlocks[i];

      if (!oBlock && nBlock) {
        addedBlocks++;
        blockDiffs.push({
          index: i,
          type: nBlock.type || 'paragraph',
          status: 'added',
          newBlock: nBlock
        });
      } else if (oBlock && !nBlock) {
        removedBlocks++;
        blockDiffs.push({
          index: i,
          type: oBlock.type || 'paragraph',
          status: 'removed',
          oldBlock: oBlock
        });
      } else if (oBlock && nBlock) {
        const oText = this.normalizeText(oBlock.text || oBlock.url || oBlock.code || JSON.stringify(oBlock));
        const nText = this.normalizeText(nBlock.text || nBlock.url || nBlock.code || JSON.stringify(nBlock));

        if (oBlock.type !== nBlock.type || oText !== nText) {
          changedBlocks++;
          blockDiffs.push({
            index: i,
            type: nBlock.type || oBlock.type,
            status: 'changed',
            oldBlock: oBlock,
            newBlock: nBlock
          });
        } else {
          unchangedBlocks++;
          blockDiffs.push({
            index: i,
            type: oBlock.type,
            status: 'unchanged',
            oldBlock: oBlock,
            newBlock: nBlock
          });
        }
      }
    }

    const hasChanged =
      titleChanged ||
      subtitleChanged ||
      excerptChanged ||
      contentChanged ||
      authorChanged ||
      categoryChanged ||
      imageChanged ||
      tagsChanged ||
      linksChanged;

    const structuredDiff: StructuredDiff = {
      title: { oldValue: oldData.title || '', newValue: newData.title, changed: titleChanged },
      subtitle: { oldValue: oldData.subtitle || '', newValue: newData.subtitle || '', changed: subtitleChanged },
      excerpt: { oldValue: oldData.excerpt || '', newValue: newData.excerpt || '', changed: excerptChanged },
      content: { oldValue: oldData.content || '', newValue: newData.content, changed: contentChanged },
      author: { oldValue: oldData.author || '', newValue: newData.author || '', changed: authorChanged },
      category: { oldValue: oldData.category || '', newValue: newData.category || '', changed: categoryChanged },
      featured_image_url: { oldValue: oldData.featured_image_url || '', newValue: newData.featured_image_url || '', changed: imageChanged },
      tags: { oldValue: oldTags, newValue: newTags, changed: tagsChanged },
      links: { oldValue: oldLinks, newValue: newLinks, changed: linksChanged },
      blocks: blockDiffs,
      stats: {
        addedBlocks,
        removedBlocks,
        changedBlocks,
        unchangedBlocks
      }
    };

    // Determine changeType
    const changedFields: string[] = [];
    if (titleChanged) changedFields.push('Заголовок');
    if (subtitleChanged) changedFields.push('Підзаголовок');
    if (contentChanged) changedFields.push(`Текст статті (${changedBlocks + addedBlocks} блоків)`);
    if (excerptChanged) changedFields.push('Опис');
    if (imageChanged) changedFields.push('Головне фото');
    if (authorChanged) changedFields.push('Автор');
    if (categoryChanged) changedFields.push('Категорія');
    if (linksChanged) changedFields.push('Посилання');

    let changeType: ChangeEventType = 'CONTENT_CHANGED';
    let severity: ChangeSeverity = 'low';

    if (changedFields.length > 1) {
      changeType = 'MULTIPLE_CHANGES';
      severity = titleChanged || contentChanged ? 'high' : 'medium';
    } else if (titleChanged) {
      changeType = 'TITLE_CHANGED';
      severity = 'medium';
    } else if (contentChanged) {
      changeType = 'CONTENT_CHANGED';
      severity = 'high';
    } else if (imageChanged) {
      changeType = 'IMAGE_CHANGED';
      severity = 'low';
    } else if (authorChanged) {
      changeType = 'AUTHOR_CHANGED';
      severity = 'low';
    } else if (categoryChanged) {
      changeType = 'CATEGORY_CHANGED';
      severity = 'low';
    } else if (linksChanged) {
      changeType = 'LINK_CHANGED';
      severity = 'low';
    }

    const summary = hasChanged
      ? `Оновлено: ${changedFields.join(', ')}`
      : 'Істотних змін контенту не виявлено';

    return {
      hasChanged,
      changeType,
      severity,
      summary,
      diff: structuredDiff
    };
  }
}
