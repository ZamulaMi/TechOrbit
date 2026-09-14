import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Monitor,
  Globe,
  ShieldAlert,
  ExternalLink,
  Calendar,
  User,
  Check,
  Search
} from 'lucide-react';
import { Article, EditorBlock } from '../../types.ts';
import { SourceAttribution } from '../article/SourceAttribution.tsx';
import { api } from '../../api/client.ts';

interface ArticlePreviewModalProps {
  articleId: string;
  isOpen: boolean;
  onClose: () => void;
  initialLang?: 'uk' | 'en';
}

export const ArticlePreviewModal: React.FC<ArticlePreviewModalProps> = ({
  articleId,
  isOpen,
  onClose,
  initialLang = 'uk'
}) => {
  const [lang, setLang] = useState<'uk' | 'en'>(initialLang);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [loading, setLoading] = useState<boolean>(true);
  const [previewData, setPreviewData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && articleId) {
      loadPreview(lang);
    }
  }, [isOpen, articleId, lang]);

  const loadPreview = async (targetLang: 'uk' | 'en') => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.admin.getArticlePreview(articleId, targetLang);
      setPreviewData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const article = previewData?.article;
  const blocks: EditorBlock[] = article?.blocks || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-start p-2 sm:p-4">
      {/* Top Floating Control Bar */}
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3 sticky top-2 z-20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-mono">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>X-Robots-Tag: noindex, nofollow</span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Режим попереднього перегляду чернетки
          </span>
        </div>

        {/* Viewport and Language Switchers */}
        <div className="flex items-center space-x-2">
          {/* Device toggle */}
          <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setDevice('desktop')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition ${
                device === 'desktop' ? 'bg-cyan-600 text-white font-medium shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Десктоп</span>
            </button>
            <button
              type="button"
              onClick={() => setDevice('mobile')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition ${
                device === 'mobile' ? 'bg-cyan-600 text-white font-medium shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Мобільний</span>
            </button>
          </div>

          {/* Language toggle */}
          <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setLang('uk')}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                lang === 'uk' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              UA
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                lang === 'en' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Preview Stage Container */}
      <div
        className={`w-full transition-all duration-300 flex justify-center ${
          device === 'mobile' ? 'max-w-md' : 'max-w-4xl'
        }`}
      >
        <div
          className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden transition-all ${
            device === 'mobile' ? 'p-4 rounded-3xl border-4 border-slate-800' : 'p-6 sm:p-10'
          }`}
        >
          {loading ? (
            <div className="py-24 text-center">
              <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Генерація превʼю...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-rose-500">
              <p className="text-sm font-semibold">{error}</p>
            </div>
          ) : article ? (
            <article className="space-y-6">
              {/* Google SERP Snippet Preview */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left mb-6">
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <Search className="w-3.5 h-3.5" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Пошукове превʼю (Google SERP)</span>
                </div>
                <div className="text-xs text-emerald-700 dark:text-emerald-400 truncate">
                  https://techorbit.ua/{lang}/article/{article.slug}
                </div>
                <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer line-clamp-1">
                  {article.metaTitle || article.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                  {article.metaDesc || article.excerpt}
                </p>
              </div>

              {/* Breadcrumb / Category */}
              <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                <span>{lang === 'uk' ? article.category_name_uk || 'Новини' : article.category_name_en || 'News'}</span>
                <span>•</span>
                <span className="text-slate-400 font-normal">
                  {lang === 'uk' ? 'Чернетка TechOrbit' : 'TechOrbit Draft'}
                </span>
              </div>

              {/* Title & Subtitle */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 leading-tight">
                  {article.title}
                </h1>
                {article.subtitle && (
                  <p className="text-lg text-slate-600 dark:text-slate-300 mt-2 font-light">
                    {article.subtitle}
                  </p>
                )}
              </div>

              {/* Author & Meta Row */}
              <div className="flex items-center justify-between py-3 border-y border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300 flex items-center justify-center font-bold text-xs">
                    {(article.author_name || 'TO').substring(0, 2).toUpperCase()}
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {article.author_name || 'Редакція TechOrbit'}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {new Date(article.published_at || article.created_at || Date.now()).toLocaleDateString(
                      lang === 'uk' ? 'uk-UA' : 'en-US'
                    )}
                  </span>
                </div>
              </div>

              {/* Featured Image */}
              {article.featured_image_url && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
                  <img
                    src={article.featured_image_url}
                    alt={article.title}
                    className="w-full h-auto object-cover max-h-[460px]"
                  />
                </div>
              )}

              {/* Excerpt */}
              {article.excerpt && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border-l-4 border-cyan-500 text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                  {article.excerpt}
                </div>
              )}

              {/* Render Structured Blocks */}
              <div className="space-y-4 py-2">
                {blocks.map(block => {
                  if (block.visible === false) return null;

                  switch (block.type) {
                    case 'heading_2':
                      return (
                        <h2 key={block.id} className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 pt-4">
                          {typeof block.content === 'string' ? block.content : block.content?.text}
                        </h2>
                      );
                    case 'heading_3':
                      return (
                        <h3 key={block.id} className="text-lg font-semibold text-slate-900 dark:text-slate-100 pt-2">
                          {typeof block.content === 'string' ? block.content : block.content?.text}
                        </h3>
                      );
                    case 'quote':
                      return (
                        <blockquote
                          key={block.id}
                          className="p-4 my-3 border-l-4 border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 italic text-slate-800 dark:text-slate-200 rounded-r-xl"
                        >
                          <p className="text-sm sm:text-base">
                            "{typeof block.content === 'string' ? block.content : block.content?.text}"
                          </p>
                          {block.content?.author && (
                            <cite className="block mt-2 text-xs font-semibold not-italic text-slate-500 dark:text-slate-400">
                              — {block.content.author}
                            </cite>
                          )}
                        </blockquote>
                      );
                    case 'image':
                      return (
                        <figure key={block.id} className="my-4">
                          {block.content?.url && (
                            <img
                              src={block.content.url}
                              alt={block.content.alt || ''}
                              className="w-full rounded-xl border border-slate-200 dark:border-slate-800"
                            />
                          )}
                          {block.content?.caption && (
                            <figcaption className="text-center text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                              {block.content.caption}
                            </figcaption>
                          )}
                        </figure>
                      );
                    case 'gallery':
                      return (
                        <div key={block.id} className="grid grid-cols-2 gap-2 my-4">
                          {(block.content?.images || []).map((gImg: any, gi: number) => (
                            <figure key={gi}>
                              <img src={gImg.url} alt="" className="w-full h-36 object-cover rounded-lg" />
                              {gImg.caption && (
                                <figcaption className="text-[11px] text-slate-400 mt-0.5">{gImg.caption}</figcaption>
                              )}
                            </figure>
                          ))}
                        </div>
                      );
                    case 'list':
                      const isOrdered = block.content?.ordered;
                      const ListTag = isOrdered ? 'ol' : 'ul';
                      return (
                        <ListTag
                          key={block.id}
                          className={`pl-6 my-3 space-y-1.5 text-sm text-slate-800 dark:text-slate-200 ${
                            isOrdered ? 'list-decimal' : 'list-disc'
                          }`}
                        >
                          {(block.content?.items || []).map((li: string, lIdx: number) => (
                            <li key={lIdx}>{li}</li>
                          ))}
                        </ListTag>
                      );
                    case 'table':
                      return (
                        <div key={block.id} className="overflow-x-auto my-4">
                          <table className="w-full text-xs text-left border border-slate-200 dark:border-slate-800 rounded-lg">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              <tr>
                                {(block.content?.headers || []).map((h: string, hIdx: number) => (
                                  <th key={hIdx} className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(block.content?.rows || []).map((row: string[], rIdx: number) => (
                                <tr key={rIdx} className="border-b border-slate-100 dark:border-slate-800">
                                  {row.map((c: string, cIdx: number) => (
                                    <td key={cIdx} className="px-3 py-2 text-slate-800 dark:text-slate-200">
                                      {c}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    case 'code':
                      return (
                        <pre
                          key={block.id}
                          className="bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto my-4"
                        >
                          <code>{typeof block.content === 'string' ? block.content : block.content?.code}</code>
                        </pre>
                      );
                    case 'link':
                      return (
                        <div
                          key={block.id}
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 my-4"
                        >
                          <a
                            href={block.content?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-sm text-cyan-600 dark:text-cyan-400 hover:underline flex items-center space-x-1"
                          >
                            <span>{block.content?.title || block.content?.url}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          {block.content?.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              {block.content.description}
                            </p>
                          )}
                        </div>
                      );
                    case 'paragraph':
                    default:
                      const text = typeof block.content === 'string' ? block.content : block.content?.text;
                      return (
                        <p key={block.id} className="text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200">
                          {text}
                        </p>
                      );
                  }
                })}
              </div>

              {/* Source Attribution Component */}
              <SourceAttribution article={article} language={lang} />
            </article>
          ) : null}
        </div>
      </div>
    </div>
  );
};
