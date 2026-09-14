import React, { useState } from 'react';
import {
  Type,
  Heading2,
  Heading3,
  Quote,
  Image as ImageIcon,
  Images,
  Video,
  Code2,
  List as ListIcon,
  Table as TableIcon,
  ExternalLink,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Tv,
  FileCode,
  Check,
  Globe
} from 'lucide-react';
import { EditorBlock } from '../../types.ts';

interface RichBlockEditorProps {
  blocks: EditorBlock[];
  onChange: (blocks: EditorBlock[]) => void;
  onTranslateBlock?: (block: EditorBlock, targetLang: 'uk' | 'en') => Promise<EditorBlock>;
  lang?: 'uk' | 'en';
  readOnly?: boolean;
}

export const RichBlockEditor: React.FC<RichBlockEditorProps> = ({
  blocks,
  onChange,
  onTranslateBlock,
  lang = 'uk',
  readOnly = false
}) => {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);

  const blockTypeOptions = [
    { type: 'paragraph', label: 'Абзац (Текст)', icon: Type, desc: 'Звичайний текстовий параграф' },
    { type: 'heading_2', label: 'Заголовок H2', icon: Heading2, desc: 'Розділ статті' },
    { type: 'heading_3', label: 'Підзаголовок H3', icon: Heading3, desc: 'Підрозділ статті' },
    { type: 'quote', label: 'Цитата', icon: Quote, desc: 'Цитата експерта або спікера' },
    { type: 'image', label: 'Зображення', icon: ImageIcon, desc: 'Одне фото з підписом' },
    { type: 'gallery', label: 'Галерея', icon: Images, desc: 'Серія зображень / слайдер' },
    { type: 'video', label: 'Відео', icon: Video, desc: 'YouTube або пряме MP4 відео' },
    { type: 'embed', label: 'Вбудований віджет', icon: Globe, desc: 'Twitter / соцмережі' },
    { type: 'link', label: 'Посилання / Картка', icon: ExternalLink, desc: 'Виділений лінк на джерело' },
    { type: 'list', label: 'Список', icon: ListIcon, desc: 'Маркований або нумерований список' },
    { type: 'table', label: 'Таблиця характеристик', icon: TableIcon, desc: 'Порівняння або специфікації' },
    { type: 'code', label: 'Блок коду', icon: Code2, desc: 'Програмний код із підсвіткою' },
    { type: 'ad', label: 'Рекламний блок', icon: Tv, desc: 'Місце під банер (in-feed / responsive)' },
    { type: 'html', label: 'Власний HTML', icon: FileCode, desc: 'Кастомний код розмітки' }
  ];

  const handleAddBlock = (type: EditorBlock['type'], index?: number) => {
    const newId = 'blk_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    let initialContent: any = '';

    switch (type) {
      case 'paragraph':
      case 'heading_2':
      case 'heading_3':
        initialContent = '';
        break;
      case 'quote':
        initialContent = { text: '', author: '' };
        break;
      case 'image':
        initialContent = { url: '', alt: '', caption: '' };
        break;
      case 'gallery':
        initialContent = { images: [{ url: '', alt: '', caption: '' }] };
        break;
      case 'video':
        initialContent = { url: '', caption: '', provider: 'youtube' };
        break;
      case 'embed':
        initialContent = { url: '', code: '', caption: '' };
        break;
      case 'link':
        initialContent = { url: '', title: '', description: '' };
        break;
      case 'list':
        initialContent = { items: [''], ordered: false };
        break;
      case 'table':
        initialContent = {
          headers: ['Параметр', 'Значення'],
          rows: [['Процесор', 'Apple M4'], ['ОЗП', '16 ГБ']]
        };
        break;
      case 'code':
        initialContent = { code: '', language: 'typescript' };
        break;
      case 'ad':
        initialContent = { slotId: 'in_article_1', position: 'in_article', format: 'banner' };
        break;
      case 'html':
        initialContent = { rawHtml: '' };
        break;
    }

    const newBlock: EditorBlock = {
      id: newId,
      type,
      content: initialContent,
      settings: {},
      order: index !== undefined ? index : blocks.length,
      visible: true
    };

    let updated: EditorBlock[] = [];
    if (index !== undefined && index >= 0 && index <= blocks.length) {
      updated = [...blocks.slice(0, index), newBlock, ...blocks.slice(index)];
    } else {
      updated = [...blocks, newBlock];
    }

    // re-index order
    updated = updated.map((b, i) => ({ ...b, order: i }));
    onChange(updated);
    setActiveBlockId(newId);
    setShowAddMenu(false);
    setInsertAtIndex(null);
  };

  const handleUpdateBlockContent = (id: string, newContent: any) => {
    const updated = blocks.map(b => (b.id === id ? { ...b, content: newContent } : b));
    onChange(updated);
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const copy = [...blocks];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const reordered = copy.map((b, i) => ({ ...b, order: i }));
    onChange(reordered);
  };

  const handleDuplicateBlock = (index: number) => {
    const orig = blocks[index];
    const cloned: EditorBlock = {
      ...JSON.parse(JSON.stringify(orig)),
      id: 'blk_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      order: index + 1
    };

    const updated = [...blocks.slice(0, index + 1), cloned, ...blocks.slice(index + 1)].map((b, i) => ({
      ...b,
      order: i
    }));
    onChange(updated);
  };

  const handleToggleVisible = (id: string) => {
    const updated = blocks.map(b => (b.id === id ? { ...b, visible: !b.visible } : b));
    onChange(updated);
  };

  const handleDeleteBlock = (id: string) => {
    const updated = blocks.filter(b => b.id !== id).map((b, i) => ({ ...b, order: i }));
    onChange(updated);
  };

  const handleAITranslateSingleBlock = async (block: EditorBlock) => {
    if (!onTranslateBlock) return;
    setTranslatingId(block.id);
    try {
      const target = lang === 'uk' ? 'en' : 'uk';
      const translated = await onTranslateBlock(block, target);
      const updated = blocks.map(b => (b.id === block.id ? translated : b));
      onChange(updated);
    } catch (err) {
      console.error('Failed to translate block:', err);
    } finally {
      setTranslatingId(null);
    }
  };

  return (
    <div className="space-y-4" id="rich-block-editor">
      {/* Editor Toolbar Header */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Блоків: {blocks.length}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300">
            {lang.toUpperCase()}
          </span>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              setInsertAtIndex(blocks.length);
              setShowAddMenu(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm transition"
            id="add-block-main-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Додати блок</span>
          </button>
        )}
      </div>

      {/* Add Block Modal / Drawer Menu */}
      {showAddMenu && (
        <div className="p-4 bg-white dark:bg-slate-850 border-2 border-cyan-500/40 rounded-xl shadow-lg space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Оберіть тип блоку для вставки
            </h4>
            <button
              type="button"
              onClick={() => setShowAddMenu(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-2 py-1 rounded"
            >
              Скасувати
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {blockTypeOptions.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => handleAddBlock(opt.type as any, insertAtIndex ?? blocks.length)}
                  className="flex flex-col items-start p-2.5 rounded-lg border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/60 hover:border-cyan-500 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20 text-left transition group"
                >
                  <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 mb-1">
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-semibold">{opt.label}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {blocks.length === 0 && (
        <div className="text-center py-12 px-4 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
          <Type className="w-10 h-10 text-slate-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
            Немає структурних блоків
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
            Додайте перший параграф, підзаголовок чи зображення для формування редакційної структури статті.
          </p>
          {!readOnly && (
            <button
              type="button"
              onClick={() => {
                setInsertAtIndex(0);
                setShowAddMenu(true);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Створити перший блок</span>
            </button>
          )}
        </div>
      )}

      {/* Block List */}
      <div className="space-y-3">
        {blocks.map((block, index) => {
          const isVisible = block.visible !== false;
          const isTranslating = translatingId === block.id;

          return (
            <div
              key={block.id}
              className={`border rounded-xl transition-all duration-150 ${
                isVisible
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  : 'bg-slate-100/70 dark:bg-slate-950/60 border-dashed border-slate-300 dark:border-slate-800 opacity-60'
              } ${activeBlockId === block.id ? 'ring-2 ring-cyan-500/40 border-cyan-500' : ''}`}
            >
              {/* Block Header Controls */}
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-850/50 rounded-t-xl text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-[10px] text-slate-400">#{index + 1}</span>
                  <span className="inline-flex items-center space-x-1 font-semibold text-slate-700 dark:text-slate-300">
                    {block.type === 'paragraph' && <Type className="w-3.5 h-3.5 text-blue-500" />}
                    {block.type === 'heading_2' && <Heading2 className="w-3.5 h-3.5 text-indigo-500" />}
                    {block.type === 'heading_3' && <Heading3 className="w-3.5 h-3.5 text-purple-500" />}
                    {block.type === 'quote' && <Quote className="w-3.5 h-3.5 text-amber-500" />}
                    {block.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />}
                    {block.type === 'gallery' && <Images className="w-3.5 h-3.5 text-teal-500" />}
                    {block.type === 'video' && <Video className="w-3.5 h-3.5 text-red-500" />}
                    {block.type === 'embed' && <Globe className="w-3.5 h-3.5 text-cyan-500" />}
                    {block.type === 'link' && <ExternalLink className="w-3.5 h-3.5 text-sky-500" />}
                    {block.type === 'list' && <ListIcon className="w-3.5 h-3.5 text-amber-600" />}
                    {block.type === 'table' && <TableIcon className="w-3.5 h-3.5 text-emerald-600" />}
                    {block.type === 'code' && <Code2 className="w-3.5 h-3.5 text-violet-500" />}
                    {block.type === 'ad' && <Tv className="w-3.5 h-3.5 text-pink-500" />}
                    {block.type === 'html' && <FileCode className="w-3.5 h-3.5 text-rose-500" />}
                    <span className="capitalize">{block.type.replace('_', ' ')}</span>
                  </span>
                  {!isVisible && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                      Приховано
                    </span>
                  )}
                </div>

                {!readOnly && (
                  <div className="flex items-center space-x-1">
                    {onTranslateBlock && (
                      <button
                        type="button"
                        onClick={() => handleAITranslateSingleBlock(block)}
                        disabled={isTranslating}
                        title="Перекласти блок за допомогою AI"
                        className="p-1 rounded text-slate-400 hover:text-cyan-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isTranslating ? 'animate-spin text-cyan-500' : ''}`} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleMoveBlock(index, 'up')}
                      disabled={index === 0}
                      title="Вгору"
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveBlock(index, 'down')}
                      disabled={index === blocks.length - 1}
                      title="Вниз"
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateBlock(index)}
                      title="Дублювати"
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleVisible(block.id)}
                      title={isVisible ? 'Приховати' : 'Показати'}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-amber-500" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBlock(block.id)}
                      title="Видалити"
                      className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Block Content Inputs */}
              <div className="p-3.5" onClick={() => setActiveBlockId(block.id)}>
                {/* Paragraph */}
                {block.type === 'paragraph' && (
                  <textarea
                    rows={3}
                    disabled={readOnly}
                    value={typeof block.content === 'string' ? block.content : block.content?.text || ''}
                    onChange={e => handleUpdateBlockContent(block.id, e.target.value)}
                    placeholder="Введіть текст параграфа..."
                    className="w-full text-sm leading-relaxed bg-transparent border-0 focus:ring-0 p-0 text-slate-900 dark:text-slate-100 resize-y outline-none"
                  />
                )}

                {/* Heading 2 */}
                {block.type === 'heading_2' && (
                  <input
                    type="text"
                    disabled={readOnly}
                    value={typeof block.content === 'string' ? block.content : block.content?.text || ''}
                    onChange={e => handleUpdateBlockContent(block.id, e.target.value)}
                    placeholder="Заголовок H2..."
                    className="w-full text-lg font-bold bg-transparent border-0 focus:ring-0 p-0 text-slate-900 dark:text-slate-100 outline-none"
                  />
                )}

                {/* Heading 3 */}
                {block.type === 'heading_3' && (
                  <input
                    type="text"
                    disabled={readOnly}
                    value={typeof block.content === 'string' ? block.content : block.content?.text || ''}
                    onChange={e => handleUpdateBlockContent(block.id, e.target.value)}
                    placeholder="Підзаголовок H3..."
                    className="w-full text-base font-semibold bg-transparent border-0 focus:ring-0 p-0 text-slate-900 dark:text-slate-100 outline-none"
                  />
                )}

                {/* Quote */}
                {block.type === 'quote' && (
                  <div className="border-l-4 border-amber-500 pl-3 py-1 space-y-2">
                    <textarea
                      rows={2}
                      disabled={readOnly}
                      value={typeof block.content === 'string' ? block.content : block.content?.text || ''}
                      onChange={e =>
                        handleUpdateBlockContent(block.id, {
                          ...(typeof block.content === 'object' ? block.content : {}),
                          text: e.target.value
                        })
                      }
                      placeholder="Текст цитати..."
                      className="w-full italic text-sm bg-transparent border-0 focus:ring-0 p-0 text-slate-800 dark:text-slate-200 outline-none"
                    />
                    <input
                      type="text"
                      disabled={readOnly}
                      value={typeof block.content === 'object' ? block.content.author || '' : ''}
                      onChange={e =>
                        handleUpdateBlockContent(block.id, {
                          ...(typeof block.content === 'object' ? block.content : { text: block.content }),
                          author: e.target.value
                        })
                      }
                      placeholder="Автор цитати (напр. Стів Джобс або аналітик Bloomberg)"
                      className="w-full text-xs text-slate-500 dark:text-slate-400 bg-transparent border-0 focus:ring-0 p-0 outline-none"
                    />
                  </div>
                )}

                {/* Image */}
                {block.type === 'image' && (
                  <div className="space-y-2.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={block.content?.url || ''}
                        onChange={e =>
                          handleUpdateBlockContent(block.id, { ...block.content, url: e.target.value })
                        }
                        placeholder="URL зображення (https://...)"
                        className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                      <input
                        type="text"
                        disabled={readOnly}
                        value={block.content?.alt || ''}
                        onChange={e =>
                          handleUpdateBlockContent(block.id, { ...block.content, alt: e.target.value })
                        }
                        placeholder="Alt текст"
                        className="w-1/3 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={block.content?.caption || ''}
                      onChange={e =>
                        handleUpdateBlockContent(block.id, { ...block.content, caption: e.target.value })
                      }
                      placeholder="Підпис під зображенням (джерело/опис)..."
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    {block.content?.url && (
                      <div className="relative rounded-lg overflow-hidden max-h-48 border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
                        <img
                          src={block.content.url}
                          alt={block.content.alt || 'preview'}
                          className="w-full h-40 object-cover"
                          onError={e => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Gallery */}
                {block.type === 'gallery' && (
                  <div className="space-y-2">
                    <span className="text-xs text-slate-500">Зображення в галереї:</span>
                    {(block.content?.images || []).map((img: any, iIndex: number) => (
                      <div key={iIndex} className="flex gap-2 items-center">
                        <input
                          type="text"
                          disabled={readOnly}
                          value={img.url || ''}
                          onChange={e => {
                            const newImgs = [...(block.content?.images || [])];
                            newImgs[iIndex] = { ...newImgs[iIndex], url: e.target.value };
                            handleUpdateBlockContent(block.id, { ...block.content, images: newImgs });
                          }}
                          placeholder="Image URL"
                          className="flex-1 text-xs px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          disabled={readOnly}
                          value={img.caption || ''}
                          onChange={e => {
                            const newImgs = [...(block.content?.images || [])];
                            newImgs[iIndex] = { ...newImgs[iIndex], caption: e.target.value };
                            handleUpdateBlockContent(block.id, { ...block.content, images: newImgs });
                          }}
                          placeholder="Підпис"
                          className="w-1/3 text-xs px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => {
                              const newImgs = block.content?.images.filter((_: any, idx: number) => idx !== iIndex);
                              handleUpdateBlockContent(block.id, { ...block.content, images: newImgs });
                            }}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          const newImgs = [...(block.content?.images || []), { url: '', alt: '', caption: '' }];
                          handleUpdateBlockContent(block.id, { ...block.content, images: newImgs });
                        }}
                        className="text-xs text-cyan-600 hover:text-cyan-700 font-medium inline-flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Додати фото до галереї</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Video & Embed */}
                {(block.type === 'video' || block.type === 'embed') && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      disabled={readOnly}
                      value={block.content?.url || block.content?.code || ''}
                      onChange={e =>
                        handleUpdateBlockContent(block.id, { ...block.content, url: e.target.value })
                      }
                      placeholder={block.type === 'video' ? 'YouTube / Vimeo / MP4 URL' : 'URL або код вставки...'}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      disabled={readOnly}
                      value={block.content?.caption || ''}
                      onChange={e =>
                        handleUpdateBlockContent(block.id, { ...block.content, caption: e.target.value })
                      }
                      placeholder="Підпис відео..."
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                )}

                {/* Link */}
                {block.type === 'link' && (
                  <div className="space-y-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800">
                    <input
                      type="text"
                      disabled={readOnly}
                      value={block.content?.title || ''}
                      onChange={e =>
                        handleUpdateBlockContent(block.id, { ...block.content, title: e.target.value })
                      }
                      placeholder="Заголовок картки посилання..."
                      className="w-full text-xs font-semibold px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <input
                      type="text"
                      disabled={readOnly}
                      value={block.content?.url || ''}
                      onChange={e =>
                        handleUpdateBlockContent(block.id, { ...block.content, url: e.target.value })
                      }
                      placeholder="URL адреса (https://...)"
                      className="w-full text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-cyan-600"
                    />
                    <textarea
                      rows={2}
                      disabled={readOnly}
                      value={block.content?.description || ''}
                      onChange={e =>
                        handleUpdateBlockContent(block.id, { ...block.content, description: e.target.value })
                      }
                      placeholder="Короткий опис посилання..."
                      className="w-full text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                )}

                {/* List */}
                {block.type === 'list' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs font-medium text-slate-500">Пункти списку:</span>
                      <label className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <input
                          type="checkbox"
                          disabled={readOnly}
                          checked={Boolean(block.content?.ordered)}
                          onChange={e =>
                            handleUpdateBlockContent(block.id, { ...block.content, ordered: e.target.checked })
                          }
                          className="rounded text-cyan-600"
                        />
                        <span>Нумерований (1, 2, 3)</span>
                      </label>
                    </div>

                    {(block.content?.items || ['']).map((item: string, itIdx: number) => (
                      <div key={itIdx} className="flex items-center space-x-2">
                        <span className="text-xs text-slate-400 w-5">
                          {block.content?.ordered ? `${itIdx + 1}.` : '•'}
                        </span>
                        <input
                          type="text"
                          disabled={readOnly}
                          value={item}
                          onChange={e => {
                            const newItems = [...(block.content?.items || [])];
                            newItems[itIdx] = e.target.value;
                            handleUpdateBlockContent(block.id, { ...block.content, items: newItems });
                          }}
                          placeholder={`Пункт #${itIdx + 1}`}
                          className="flex-1 text-xs px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = block.content?.items.filter((_: any, idx: number) => idx !== itIdx);
                              handleUpdateBlockContent(block.id, { ...block.content, items: newItems });
                            }}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = [...(block.content?.items || []), ''];
                          handleUpdateBlockContent(block.id, { ...block.content, items: newItems });
                        }}
                        className="text-xs text-cyan-600 hover:text-cyan-700 font-medium inline-flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Додати пункт списку</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Table */}
                {block.type === 'table' && (
                  <div className="space-y-2 overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          {(block.content?.headers || []).map((h: string, hIdx: number) => (
                            <th key={hIdx} className="p-1">
                              <input
                                type="text"
                                disabled={readOnly}
                                value={h}
                                onChange={e => {
                                  const newH = [...(block.content?.headers || [])];
                                  newH[hIdx] = e.target.value;
                                  handleUpdateBlockContent(block.id, { ...block.content, headers: newH });
                                }}
                                className="w-full font-bold px-1.5 py-1 rounded bg-slate-100 dark:bg-slate-800"
                              />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(block.content?.rows || []).map((row: string[], rIdx: number) => (
                          <tr key={rIdx} className="border-b border-slate-100 dark:border-slate-800">
                            {row.map((cell: string, cIdx: number) => (
                              <td key={cIdx} className="p-1">
                                <input
                                  type="text"
                                  disabled={readOnly}
                                  value={cell}
                                  onChange={e => {
                                    const newRows = [...(block.content?.rows || [])];
                                    newRows[rIdx] = [...newRows[rIdx]];
                                    newRows[rIdx][cIdx] = e.target.value;
                                    handleUpdateBlockContent(block.id, { ...block.content, rows: newRows });
                                  }}
                                  className="w-full px-1.5 py-1 rounded bg-slate-50 dark:bg-slate-850"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!readOnly && (
                      <div className="flex space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const colCount = block.content?.headers?.length || 2;
                            const newRow = new Array(colCount).fill('');
                            handleUpdateBlockContent(block.id, {
                              ...block.content,
                              rows: [...(block.content?.rows || []), newRow]
                            });
                          }}
                          className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
                        >
                          + Додати рядок
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Code Block */}
                {block.type === 'code' && (
                  <div className="space-y-2 bg-slate-950 rounded-lg p-3 font-mono text-xs">
                    <div className="flex justify-between items-center text-slate-400 pb-1 border-b border-slate-800">
                      <span>Код:</span>
                      <select
                        disabled={readOnly}
                        value={block.content?.language || block.settings?.language || 'typescript'}
                        onChange={e =>
                          handleUpdateBlockContent(block.id, {
                            ...block.content,
                            language: e.target.value
                          })
                        }
                        className="bg-slate-900 text-slate-200 rounded px-2 py-0.5 border border-slate-800 text-[11px]"
                      >
                        <option value="typescript">TypeScript</option>
                        <option value="javascript">JavaScript</option>
                        <option value="bash">Bash / Shell</option>
                        <option value="json">JSON</option>
                        <option value="python">Python</option>
                        <option value="html">HTML</option>
                      </select>
                    </div>
                    <textarea
                      rows={4}
                      disabled={readOnly}
                      value={typeof block.content === 'string' ? block.content : block.content?.code || ''}
                      onChange={e =>
                        handleUpdateBlockContent(block.id, {
                          ...(typeof block.content === 'object' ? block.content : {}),
                          code: e.target.value
                        })
                      }
                      placeholder="// Вставте фрагмент коду тут..."
                      className="w-full bg-transparent text-emerald-400 font-mono text-xs border-0 focus:ring-0 p-0 outline-none resize-y"
                    />
                  </div>
                )}

                {/* Advertisement */}
                {block.type === 'ad' && (
                  <div className="p-3 rounded-lg border-2 border-dashed border-pink-400/40 bg-pink-50/30 dark:bg-pink-950/20 text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Tv className="w-4 h-4 text-pink-500" />
                      <div>
                        <span className="font-semibold">Рекламний плейсхолдер:</span>{' '}
                        <span className="font-mono text-slate-500">{block.content?.slotId || 'in_article_1'}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 text-[10px] font-medium">
                      Auto-Inject Ads
                    </span>
                  </div>
                )}

                {/* Custom HTML */}
                {block.type === 'html' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400">
                      <span>Увага: Сирий HTML код виконується в ізольованому контейнері</span>
                    </div>
                    <textarea
                      rows={3}
                      disabled={readOnly}
                      value={typeof block.content === 'string' ? block.content : block.content?.rawHtml || ''}
                      onChange={e =>
                        handleUpdateBlockContent(block.id, {
                          ...(typeof block.content === 'object' ? block.content : {}),
                          rawHtml: e.target.value
                        })
                      }
                      placeholder="<div>...</div>"
                      className="w-full font-mono text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                )}
              </div>

              {/* In-between Insert Trigger Button */}
              {!readOnly && (
                <div className="relative flex justify-center -mb-2.5 z-10">
                  <button
                    type="button"
                    onClick={() => {
                      setInsertAtIndex(index + 1);
                      setShowAddMenu(true);
                    }}
                    className="opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity px-2 py-0.5 rounded-full bg-cyan-600 hover:bg-cyan-700 text-white text-[10px] shadow flex items-center space-x-1"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>Вставити блок тут</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
