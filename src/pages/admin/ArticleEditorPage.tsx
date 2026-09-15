import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { api } from '../../api/client.ts';
import { Article, ArticleVersion, ArticleTranslation, Category, Author, Source, ArticleStatus, EditorBlock } from '../../types.ts';
import { RichBlockEditor } from '../../components/admin/RichBlockEditor.tsx';
import { PublishChecklist } from '../../components/admin/PublishChecklist.tsx';
import { ArticlePreviewModal } from '../../components/admin/ArticlePreviewModal.tsx';
import {
  Save,
  ArrowLeft,
  Sparkles,
  History,
  RotateCcw,
  CheckCircle,
  Eye,
  Globe,
  Image as ImageIcon,
  ShieldCheck,
  AlertCircle,
  LayoutGrid,
  FileCode,
  Search,
  ExternalLink
} from 'lucide-react';

export function ArticleEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();

  // Primary fields
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<ArticleStatus>('DRAFT');
  const [categoryId, setCategoryId] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [rightsStatus, setRightsStatus] = useState<Article['rights_status']>('fair_use_rewritten');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceAuthor, setSourceAuthor] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [slugUk, setSlugUk] = useState('');
  const [slugEn, setSlugEn] = useState('');
  const [changeReason, setChangeReason] = useState('Редакційні правки');

  // SEO fields
  const [metaTitleUk, setMetaTitleUk] = useState('');
  const [metaDescUk, setMetaDescUk] = useState('');
  const [metaTitleEn, setMetaTitleEn] = useState('');
  const [metaDescEn, setMetaDescEn] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [robots, setRobots] = useState('index, follow');
  const [ogImageUrl, setOgImageUrl] = useState('');

  // Structured blocks
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [editorMode, setEditorMode] = useState<'blocks' | 'markdown'>('blocks');

  // Translation (EN) tab
  const [activeTab, setActiveTab] = useState<'uk' | 'en'>('uk');
  const [enTitle, setEnTitle] = useState('');
  const [enSubtitle, setEnSubtitle] = useState('');
  const [enExcerpt, setEnExcerpt] = useState('');
  const [enContent, setEnContent] = useState('');
  const [enBlocks, setEnBlocks] = useState<EditorBlock[]>([]);
  const [hasEnTranslation, setHasEnTranslation] = useState(false);

  // Aux state
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [versions, setVersions] = useState<ArticleVersion[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load article, categories, authors, versions
  const loadData = async () => {
    try {
      const [cats, auths] = await Promise.all([
        api.admin.getCategories(),
        api.admin.getAuthors()
      ]);
      setCategories(cats);
      setAuthors(auths);

      if (!isNew && id) {
        const [art, vers, trans] = await Promise.all([
          api.admin.getArticle(id),
          api.admin.getVersions(id),
          api.admin.getTranslations(id)
        ]);

        setTitle(art.title);
        setSubtitle(art.subtitle || '');
        setExcerpt(art.excerpt || '');
        setContent(art.content || '');
        setStatus(art.status);
        setCategoryId(art.category_id || '');
        setAuthorId(art.author_id || '');
        setFeaturedImageUrl(art.featured_image_url || '');
        setRightsStatus(art.rights_status);
        setSourceUrl(art.source_url || '');
        setSourceAuthor(art.source_author || '');
        setSourceName(art.source_name || '');
        setSlugUk(art.slug_uk);
        setSlugEn(art.slug_en || '');
        setMetaTitleUk(art.meta_title_uk || '');
        setMetaDescUk(art.meta_desc_uk || '');
        setMetaTitleEn(art.meta_title_en || '');
        setMetaDescEn(art.meta_desc_en || '');
        setCanonicalUrl(art.canonical_url || '');
        setRobots(art.robots || 'index, follow');
        setOgImageUrl(art.og_image_url || '');
        setVersions(vers);

        // Parse structured blocks
        if (art.structured_blocks_json && art.structured_blocks_json !== '[]') {
          try {
            setBlocks(JSON.parse(art.structured_blocks_json));
          } catch {
            setBlocks(convertMarkdownToBlocks(art.content || ''));
          }
        } else if (art.content) {
          setBlocks(convertMarkdownToBlocks(art.content));
        }

        const enTranslation = trans.find(t => t.language === 'en');
        if (enTranslation) {
          setHasEnTranslation(true);
          setEnTitle(enTranslation.title);
          setEnSubtitle(enTranslation.subtitle || '');
          setEnExcerpt(enTranslation.excerpt || '');
          setEnContent(enTranslation.content || '');
          if (enTranslation.slug) setSlugEn(enTranslation.slug);
          if (enTranslation.meta_title) setMetaTitleEn(enTranslation.meta_title);
          if (enTranslation.meta_description) setMetaDescEn(enTranslation.meta_description);

          if (enTranslation.structured_blocks_json && enTranslation.structured_blocks_json !== '[]') {
            try {
              setEnBlocks(JSON.parse(enTranslation.structured_blocks_json));
            } catch {
              setEnBlocks(convertMarkdownToBlocks(enTranslation.content || ''));
            }
          } else if (enTranslation.content) {
            setEnBlocks(convertMarkdownToBlocks(enTranslation.content));
          }
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Помилка завантаження статті' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  function convertMarkdownToBlocks(md: string): EditorBlock[] {
    const lines = md.split('\n\n');
    return lines
      .map(line => line.trim())
      .filter(Boolean)
      .map((line, idx) => {
        const blkId = 'blk_' + idx + '_' + Math.random().toString(36).substring(2, 6);
        if (line.startsWith('### ')) {
          return { id: blkId, type: 'heading_3', content: line.replace('### ', ''), settings: {}, order: idx, visible: true };
        }
        if (line.startsWith('## ')) {
          return { id: blkId, type: 'heading_2', content: line.replace('## ', ''), settings: {}, order: idx, visible: true };
        }
        if (line.startsWith('> ')) {
          return { id: blkId, type: 'quote', content: { text: line.replace('> ', ''), author: '' }, settings: {}, order: idx, visible: true };
        }
        return { id: blkId, type: 'paragraph', content: line, settings: {}, order: idx, visible: true };
      });
  }

  function convertBlocksToMarkdown(blks: EditorBlock[]): string {
    return blks
      .filter(b => b.visible !== false)
      .map(b => {
        if (b.type === 'heading_2') return `## ${typeof b.content === 'string' ? b.content : b.content?.text}`;
        if (b.type === 'heading_3') return `### ${typeof b.content === 'string' ? b.content : b.content?.text}`;
        if (b.type === 'quote') return `> ${typeof b.content === 'string' ? b.content : b.content?.text}`;
        if (b.type === 'image') return `![${b.content?.alt || ''}](${b.content?.url || ''})\n*${b.content?.caption || ''}*`;
        if (b.type === 'code') return `\`\`\`${b.content?.language || 'typescript'}\n${typeof b.content === 'string' ? b.content : b.content?.code}\n\`\`\``;
        if (b.type === 'list') return (b.content?.items || []).map((it: string) => `- ${it}`).join('\n');
        return typeof b.content === 'string' ? b.content : b.content?.text || '';
      })
      .join('\n\n');
  }

  const handleBlocksChange = (newBlocks: EditorBlock[]) => {
    setBlocks(newBlocks);
    // keep content in sync
    setContent(convertBlocksToMarkdown(newBlocks));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    // Sync markdown and blocks
    const finalContent = editorMode === 'blocks' ? convertBlocksToMarkdown(blocks) : content;
    const finalBlocks = editorMode === 'blocks' ? blocks : convertMarkdownToBlocks(content);

    try {
      if (isNew) {
        const created = await api.admin.createArticle({
          title,
          subtitle,
          excerpt,
          content: finalContent,
          status,
          category_id: categoryId || undefined,
          author_id: authorId || undefined,
          featured_image_url: featuredImageUrl || undefined,
          rights_status: rightsStatus,
          source_url: sourceUrl || undefined,
          source_author: sourceAuthor || undefined,
          canonical_url: canonicalUrl || undefined,
          robots: robots || 'index, follow',
          og_image_url: ogImageUrl || undefined
        });

        // Save translation if English fields were provided
        if (enTitle) {
          await api.admin.saveTranslation(created.id, {
            language: 'en',
            title: enTitle,
            subtitle: enSubtitle,
            excerpt: enExcerpt,
            content: enContent,
            slug: slugEn || undefined,
            meta_title: metaTitleEn,
            meta_description: metaDescEn,
            translation_status: 'draft',
            structured_blocks_json: JSON.stringify(enBlocks)
          });
        }

        setMessage({ type: 'success', text: 'Статтю успішно створено!' });
        setTimeout(() => navigate(`/admin/articles/${created.id}/edit`), 800);
      } else if (id) {
        await api.admin.updateArticle(id, {
          title,
          subtitle,
          excerpt,
          content: finalContent,
          status,
          category_id: categoryId || undefined,
          author_id: authorId || undefined,
          featured_image_url: featuredImageUrl || undefined,
          rights_status: rightsStatus,
          source_url: sourceUrl || undefined,
          source_author: sourceAuthor || undefined,
          slug_uk: slugUk || undefined,
          slug_en: slugEn || undefined,
          structured_blocks_json: JSON.stringify(finalBlocks),
          meta_title_uk: metaTitleUk || title,
          meta_title_en: metaTitleEn || enTitle,
          meta_desc_uk: metaDescUk || excerpt,
          meta_desc_en: metaDescEn || enExcerpt,
          canonical_url: canonicalUrl || undefined,
          robots: robots || 'index, follow',
          og_image_url: ogImageUrl || undefined,
          changeReason: changeReason || 'Редакційні правки'
        });

        // Save English translation if available
        if (enTitle) {
          await api.admin.saveTranslation(id, {
            language: 'en',
            title: enTitle,
            subtitle: enSubtitle,
            excerpt: enExcerpt,
            content: enBlocks.length > 0 ? convertBlocksToMarkdown(enBlocks) : enContent,
            slug: slugEn || undefined,
            meta_title: metaTitleEn,
            meta_description: metaDescEn,
            translation_status: 'draft',
            structured_blocks_json: JSON.stringify(enBlocks)
          });
        }

        // Refresh versions list
        const vers = await api.admin.getVersions(id);
        setVersions(vers);

        setMessage({ type: 'success', text: 'Зміни успішно збережено та записано нову версію!' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Помилка збереження' });
    } finally {
      setSaving(false);
    }
  };

  const handleAiTranslate = async () => {
    if (!id || isNew) {
      alert('Будь ласка, спочатку збережіть статтю, щоб запустити AI-переклад');
      return;
    }

    setTranslating(true);
    setMessage(null);
    try {
      const res = await api.admin.translateWithAi(id, 'en');
      if (res.translation) {
        setEnTitle(res.translation.title);
        setEnSubtitle(res.translation.subtitle || '');
        setEnExcerpt(res.translation.excerpt);
        setEnContent(res.translation.content);
        if (res.translation.slug) setSlugEn(res.translation.slug);
        if (res.translation.meta_title) setMetaTitleEn(res.translation.meta_title);
        if (res.translation.meta_description) setMetaDescEn(res.translation.meta_description);

        if (res.translation.structured_blocks_json) {
          try {
            setEnBlocks(JSON.parse(res.translation.structured_blocks_json));
          } catch {
            setEnBlocks(convertMarkdownToBlocks(res.translation.content));
          }
        }
        setHasEnTranslation(true);
        setActiveTab('en');
        setMessage({
          type: 'success',
          text: 'AI-переклад Gemini успішно згенеровано та розміщено у вкладці English!'
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Помилка AI перекладу' });
    } finally {
      setTranslating(false);
    }
  };

  const handleRollback = async (versionId: string, versionNumber: number) => {
    if (!id) return;
    if (!window.confirm(`Відкотити статтю до версії #${versionNumber}? Поточний текст буде замінено змістом тієї версії.`)) {
      return;
    }

    try {
      const res = await api.admin.rollbackVersion(id, versionId);
      if (res.article) {
        setTitle(res.article.title);
        setExcerpt(res.article.excerpt);
        setContent(res.article.content);
        setBlocks(convertMarkdownToBlocks(res.article.content));
        setMessage({ type: 'success', text: `Успішно відкочено до версії #${versionNumber}!` });
        const vers = await api.admin.getVersions(id);
        setVersions(vers);
      }
    } catch (err: any) {
      alert(err.message || 'Помилка відкату версії');
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Редактор статті">
        <div className="py-20 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <span>Завантаження матеріалу...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={isNew ? 'Створення нової статті' : `Редагування: ${title || 'Матеріал'}`}
      subtitle={!isNew ? `ID: ${id} • Стан: ${status}` : 'Заповніть інформацію для публікації або збережіть як чернетку'}
    >
      <form onSubmit={handleSave} className="space-y-6">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/admin/articles"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>До списку статей</span>
          </Link>

          <div className="flex items-center gap-2.5">
            {!isNew && (
              <>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors border border-slate-700"
                  id="preview-draft-btn"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Превʼю (Desktop/Mobile)</span>
                </button>

                <Link
                  to="/admin/translations"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Центр перекладів</span>
                </Link>

                <button
                  type="button"
                  onClick={handleAiTranslate}
                  disabled={translating}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${translating ? 'animate-spin' : ''}`} />
                  <span>{translating ? 'Переклад через Gemini...' : 'AI Переклад (UA → EN)'}</span>
                </button>
              </>
            )}

            {!isNew && slugUk && status === 'PUBLISHED' && (
              <Link
                to={`/uk/article/${slugUk}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors border border-slate-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>На сайті</span>
              </Link>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Збереження...' : 'Зберегти статтю'}</span>
            </button>
          </div>
        </div>

        {/* Feedback Message */}
        {message && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Language Tabs Selector */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('uk')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                activeTab === 'uk'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>Українська версія (UA)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('en')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                activeTab === 'en'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>English Translation (EN)</span>
              {hasEnTranslation && <span className="text-[10px] px-1.5 rounded bg-indigo-900 text-indigo-200">Active</span>}
            </button>
          </div>

          {/* Editor Mode: Blocks vs Markdown */}
          {activeTab === 'uk' && (
            <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  if (editorMode === 'markdown') {
                    setBlocks(convertMarkdownToBlocks(content));
                  }
                  setEditorMode('blocks');
                }}
                className={`flex items-center space-x-1 px-3 py-1 rounded transition ${
                  editorMode === 'blocks'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Блоки ({blocks.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editorMode === 'blocks') {
                    setContent(convertBlocksToMarkdown(blocks));
                  }
                  setEditorMode('markdown');
                }}
                className={`flex items-center space-x-1 px-3 py-1 rounded transition ${
                  editorMode === 'markdown'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Markdown</span>
              </button>
            </div>
          )}
        </div>

        {/* MAIN EDITOR & SIDEBAR LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-8 space-y-4">
            {activeTab === 'uk' ? (
              /* UKRAINIAN CONTENT FIELDS */
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Заголовок статті (UA) *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Введіть заголовок..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Підзаголовок / Лід (необов'язково)
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={e => setSubtitle(e.target.value)}
                    placeholder="Коротке розширене пояснення..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Короткий опис / Анотація (Excerpt) *
                  </label>
                  <textarea
                    rows={3}
                    value={excerpt}
                    onChange={e => setExcerpt(e.target.value)}
                    placeholder="Вступний абзац для стрічки та пошукових систем..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed"
                    required
                  />
                </div>

                {/* Structured Blocks or Markdown View */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                    <span>{editorMode === 'blocks' ? 'Редактор блоків контенту' : 'Markdown сирий текст'} *</span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      Підтримує параграфи, H2, H3, цитати, зображення, списки, таблиці, код та рекламу
                    </span>
                  </label>

                  {editorMode === 'blocks' ? (
                    <RichBlockEditor
                      blocks={blocks}
                      onChange={handleBlocksChange}
                      lang="uk"
                    />
                  ) : (
                    <textarea
                      rows={14}
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="Введіть основний зміст статті..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
                      required
                    />
                  )}
                </div>

                {/* SEO Meta Fields */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
                    <Search className="w-4 h-4 text-emerald-400" />
                    <span>SEO Метадані (Пошукова оптимізація UA)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Meta Title (UA)</label>
                      <input
                        type="text"
                        value={metaTitleUk}
                        onChange={e => setMetaTitleUk(e.target.value)}
                        placeholder={title || 'SEO Заголовок...'}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Slug URL (UA)</label>
                      <input
                        type="text"
                        value={slugUk}
                        onChange={e => setSlugUk(e.target.value)}
                        placeholder="chpu-posylannya-statti"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-cyan-400 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Meta Description (UA)</label>
                    <textarea
                      rows={2}
                      value={metaDescUk}
                      onChange={e => setMetaDescUk(e.target.value)}
                      placeholder={excerpt || 'Короткий SEO опис для пошукових систем...'}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>

                {!isNew && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Причина змін для версіонування (Change Reason)
                    </label>
                    <input
                      type="text"
                      value={changeReason}
                      onChange={e => setChangeReason(e.target.value)}
                      placeholder="Опишіть, що було змінено (наприклад: додано деталі бенчмарків)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>
            ) : (
              /* ENGLISH TRANSLATION FIELDS */
              <div className="bg-slate-900 border border-indigo-900/40 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-xl text-xs text-indigo-300 flex items-center justify-between">
                  <span>Переклад англійською мовою. Використовується для міжнародної версії TechOrbit (/en/).</span>
                  <button
                    type="button"
                    onClick={handleAiTranslate}
                    disabled={translating}
                    className="text-xs text-indigo-400 hover:underline font-bold"
                  >
                    Згенерувати через Gemini AI →
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Article Title (EN)
                  </label>
                  <input
                    type="text"
                    value={enTitle}
                    onChange={e => setEnTitle(e.target.value)}
                    placeholder="English headline..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Article Subtitle (EN)
                  </label>
                  <input
                    type="text"
                    value={enSubtitle}
                    onChange={e => setEnSubtitle(e.target.value)}
                    placeholder="English subtitle..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Short Excerpt (EN)
                  </label>
                  <textarea
                    rows={3}
                    value={enExcerpt}
                    onChange={e => setEnExcerpt(e.target.value)}
                    placeholder="English summary..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
                  />
                </div>

                {/* English Blocks Editor */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    English Content Blocks ({enBlocks.length})
                  </label>
                  <RichBlockEditor
                    blocks={enBlocks}
                    onChange={setEnBlocks}
                    lang="en"
                  />
                </div>

                {/* English SEO */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-indigo-300">
                    SEO Meta Information (EN)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Meta Title (EN)</label>
                      <input
                        type="text"
                        value={metaTitleEn}
                        onChange={e => setMetaTitleEn(e.target.value)}
                        placeholder="SEO Title (EN)..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Slug URL (EN)</label>
                      <input
                        type="text"
                        value={slugEn}
                        onChange={e => setSlugEn(e.target.value)}
                        placeholder="english-article-slug"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-indigo-400 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Meta Description (EN)</label>
                    <textarea
                      rows={2}
                      value={metaDescEn}
                      onChange={e => setMetaDescEn(e.target.value)}
                      placeholder="SEO Description (EN)..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Metadata, Checklist, Rights, Versions */}
          <div className="lg:col-span-4 space-y-5">
            {/* Status & Category */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Публікація & Рубрика
              </h4>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Статус публікації</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as ArticleStatus)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="DRAFT">Чернетка (DRAFT)</option>
                  <option value="IMPORTED">Імпортовано (IMPORTED)</option>
                  <option value="TRANSLATED">Перекладено (TRANSLATED)</option>
                  <option value="PENDING_REVIEW">Очікує модерації (PENDING_REVIEW)</option>
                  <option value="APPROVED">Схвалено (APPROVED)</option>
                  <option value="PUBLISHED">Опубліковано (PUBLISHED)</option>
                  <option value="ARCHIVED">В архіві (ARCHIVED)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Рубрика (Категорія)</label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Без рубрики --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name_uk}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Автор / Редактор</label>
                <select
                  value={authorId}
                  onChange={e => setAuthorId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Редакція TechOrbit --</option>
                  {authors.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* PRE-PUBLISH CHECKLIST */}
            <PublishChecklist
              article={{
                title,
                excerpt,
                content,
                category_id: categoryId,
                author_id: authorId,
                featured_image_url: featuredImageUrl,
                slug_uk: slugUk,
                slug_en: slugEn,
                meta_title_uk: metaTitleUk,
                meta_desc_uk: metaDescUk,
                rights_status: rightsStatus,
                translation_status: hasEnTranslation ? 'COMPLETED' : 'PENDING'
              }}
              blocks={blocks}
              hasEnTranslation={hasEnTranslation}
              onFixField={(field) => {
                const el = document.querySelector(`[name="${field}"]`) as HTMLElement;
                if (el) el.focus();
              }}
            />

            {/* Featured Image */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Головне зображення (Cover)</span>
              </h4>

              <div>
                <input
                  type="url"
                  value={featuredImageUrl}
                  onChange={e => setFeaturedImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {featuredImageUrl && (
                <div className="aspect-[16/9] rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                  <img
                    src={featuredImageUrl}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* SEO, Canonical & Indexing Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-emerald-400" />
                <span>SEO, Canonical & Індексація</span>
              </h4>

              {/* Canonical Warning & Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Канонічний URL (Canonical)
                </label>
                <input
                  type="text"
                  value={canonicalUrl}
                  onChange={e => setCanonicalUrl(e.target.value)}
                  placeholder="Автоматично: Self-referencing URL"
                  className={`w-full bg-slate-950 border rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none ${
                    canonicalUrl.includes('wylsa.com')
                      ? 'border-rose-500 text-rose-300'
                      : 'border-slate-800 focus:border-emerald-500'
                  }`}
                />
                {canonicalUrl.includes('wylsa.com') ? (
                  <p className="text-[10px] text-rose-400 font-medium">
                    Увага! За правилами TechOrbit, канонічне посилання ніколи не повинно вести на домен-донор (wylsa.com). TechOrbit функціонує як незалежний сайт з власними URL.
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500">
                    За замовчуванням кожна опублікована стаття має self-referencing canonical на свій TechOrbit URL.
                  </p>
                )}
              </div>

              {/* Robots Directive */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Robots індексація
                </label>
                <select
                  value={robots}
                  onChange={e => setRobots(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="index, follow">index, follow (Відкрито для пошуку)</option>
                  <option value="noindex, follow">noindex, follow (Приховати з видачі)</option>
                  <option value="noindex, nofollow">noindex, nofollow (Повна заборона)</option>
                </select>
                <p className="text-[10px] text-slate-500">
                  Чернетки (Draft) та черга перевірки автоматично отримують noindex.
                </p>
              </div>

              {/* Custom OG Image Override */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Спеціальне OpenGraph зображення (опціонально)
                </label>
                <input
                  type="url"
                  value={ogImageUrl}
                  onChange={e => setOgImageUrl(e.target.value)}
                  placeholder="URL для соціальних мереж"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500">
                  Якщо не вказано, використовується головне зображення статті.
                </p>
              </div>
            </div>

            {/* Attribution & Rights */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Права та Першоджерело</span>
              </h4>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Статус прав</label>
                <select
                  value={rightsStatus}
                  onChange={e => setRightsStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="fair_use_rewritten">Fair Use (Редакційна переробка)</option>
                  <option value="original">Оригінальний матеріал TechOrbit</option>
                  <option value="syndicated">Синдикована стаття (Ліцензія)</option>
                  <option value="press_release">Офіційний пресреліз компанії</option>
                  <option value="raw_imported">Необроблений імпорт</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Назва джерела</label>
                <input
                  type="text"
                  value={sourceName}
                  onChange={e => setSourceName(e.target.value)}
                  placeholder="The Verge, Wylsacom, Bloomberg..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">URL першоджерела</label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={e => setSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Автор оригіналу</label>
                <input
                  type="text"
                  value={sourceAuthor}
                  onChange={e => setSourceAuthor(e.target.value)}
                  placeholder="Автор першоджерела"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* VERSION HISTORY & ROLLBACK */}
            {!isNew && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Історія версій ({versions.length})</span>
                </h4>

                <div className="max-h-56 overflow-y-auto space-y-2 divide-y divide-slate-800/60">
                  {versions.map(v => (
                    <div key={v.id} className="pt-2 first:pt-0 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-400">Версія #{v.version_number}</span>
                        <button
                          type="button"
                          onClick={() => handleRollback(v.id, v.version_number)}
                          title="Відкотити до цієї версії"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Відкотити</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        {v.change_reason || 'Редакційні правки'}
                      </p>
                      <div className="text-[10px] text-slate-500">
                        {new Date(v.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Preview Modal */}
      {!isNew && id && (
        <ArticlePreviewModal
          articleId={id}
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          initialLang={activeTab}
        />
      )}
    </AdminLayout>
  );
}
