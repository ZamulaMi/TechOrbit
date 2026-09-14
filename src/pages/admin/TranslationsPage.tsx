import React, { useState, useEffect } from 'react';
import {
  Languages,
  Sparkles,
  CheckCircle,
  XCircle,
  Eye,
  Save,
  RotateCw,
  Search,
  ExternalLink,
  ArrowRight,
  Shield,
  Layers,
  FileText,
  Clock,
  AlertCircle
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { Article, ArticleTranslation, EditorBlock } from '../../types.ts';
import { RichBlockEditor } from '../../components/admin/RichBlockEditor.tsx';
import { ArticlePreviewModal } from '../../components/admin/ArticlePreviewModal.tsx';
import { SourceAttribution } from '../../components/article/SourceAttribution.tsx';

export const TranslationsPage: React.FC = () => {
  // Master list state
  const [translationsList, setTranslationsList] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected article for translation workspace
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [workspaceData, setWorkspaceData] = useState<{
    article: Article;
    uaTranslation: ArticleTranslation;
    enTranslation: ArticleTranslation | null;
    uaBlocks: EditorBlock[];
    enBlocks: EditorBlock[];
    sourceInfo: any;
  } | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(false);

  // Active view pane: 'split' (UA + EN side-by-side) or 'source' or 'en'
  const [activeTab, setActiveTab] = useState<'split' | 'source' | 'ua' | 'en'>('split');

  // Form states for EN translation editing
  const [enTitle, setEnTitle] = useState<string>('');
  const [enSubtitle, setEnSubtitle] = useState<string>('');
  const [enExcerpt, setEnExcerpt] = useState<string>('');
  const [enSlug, setEnSlug] = useState<string>('');
  const [enMetaTitle, setEnMetaTitle] = useState<string>('');
  const [enMetaDesc, setEnMetaDesc] = useState<string>('');
  const [enBlocks, setEnBlocks] = useState<EditorBlock[]>([]);

  // Action states
  const [isTranslatingAll, setIsTranslatingAll] = useState<boolean>(false);
  const [isTranslatingSeo, setIsTranslatingSeo] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [previewLang, setPreviewLang] = useState<'uk' | 'en'>('en');
  const [rejectReason, setRejectReason] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadTranslationsList();
  }, [statusFilter, searchQuery]);

  const loadTranslationsList = async () => {
    setLoadingList(true);
    try {
      const res = await api.admin.getAllTranslations({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined
      });
      setTranslationsList(res.items || []);

      // If nothing selected and items exist, pick the first one
      if (!selectedArticleId && res.items?.length > 0) {
        loadWorkspace(res.items[0].id);
      }
    } catch (err) {
      console.error('Failed to load translations list:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const loadWorkspace = async (articleId: string) => {
    setSelectedArticleId(articleId);
    setLoadingWorkspace(true);
    setFeedbackMessage(null);
    try {
      const data = await api.admin.getTranslationWorkspace(articleId);
      setWorkspaceData(data);

      // Populate English editing state
      const en = data.enTranslation;
      setEnTitle(en?.title || '');
      setEnSubtitle(en?.subtitle || '');
      setEnExcerpt(en?.excerpt || '');
      setEnSlug(en?.slug || data.article.slug_en || '');
      setEnMetaTitle(en?.meta_title || '');
      setEnMetaDesc(en?.meta_description || '');
      setEnBlocks(data.enBlocks || []);
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Помилка завантаження статті' });
    } finally {
      setLoadingWorkspace(false);
    }
  };

  const handleTranslateAllAi = async () => {
    if (!selectedArticleId) return;
    setIsTranslatingAll(true);
    setFeedbackMessage(null);
    try {
      const res = await api.admin.translateWithAi(selectedArticleId, 'en');
      if (res.success && res.translation) {
        setEnTitle(res.translation.title);
        setEnSubtitle(res.translation.subtitle || '');
        setEnExcerpt(res.translation.excerpt);
        setEnSlug(res.translation.slug);
        setEnMetaTitle(res.translation.meta_title || '');
        setEnMetaDesc(res.translation.meta_description || '');

        let parsedBlocks: EditorBlock[] = [];
        try {
          parsedBlocks = JSON.parse(res.translation.structured_blocks_json || '[]');
        } catch {
          parsedBlocks = [];
        }
        setEnBlocks(parsedBlocks);

        setFeedbackMessage({
          type: 'success',
          text: 'Переклад Gemini успішно згенеровано зі збереженням структури та термінології!'
        });
        loadTranslationsList();
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Помилка генерації перекладу' });
    } finally {
      setIsTranslatingAll(false);
    }
  };

  const handleTranslateSingleBlock = async (block: EditorBlock, targetLang: 'uk' | 'en'): Promise<EditorBlock> => {
    if (!selectedArticleId) return block;
    const res = await api.admin.translateBlock(selectedArticleId, block, targetLang);
    return res.block;
  };

  const handleTranslateSeo = async () => {
    if (!selectedArticleId || !workspaceData) return;
    setIsTranslatingSeo(true);
    try {
      const res = await api.admin.translateSeo(
        selectedArticleId,
        {
          title: workspaceData.article.meta_title_uk || workspaceData.article.title,
          description: workspaceData.article.meta_desc_uk || workspaceData.article.excerpt
        },
        'en'
      );
      if (res.success && res.seo) {
        setEnMetaTitle(res.seo.meta_title);
        setEnMetaDesc(res.seo.meta_description);
        setFeedbackMessage({ type: 'success', text: 'SEO мета-теги перекладено' });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message });
    } finally {
      setIsTranslatingSeo(false);
    }
  };

  const handleSaveTranslationDraft = async () => {
    if (!selectedArticleId) return;
    setIsSaving(true);
    try {
      await api.admin.saveTranslation(selectedArticleId, {
        language: 'en',
        title: enTitle,
        subtitle: enSubtitle,
        excerpt: enExcerpt,
        slug: enSlug,
        meta_title: enMetaTitle,
        meta_description: enMetaDesc,
        structured_blocks_json: JSON.stringify(enBlocks),
        content: enBlocks.map(b => (typeof b.content === 'string' ? b.content : b.content?.text || '')).join('\n\n'),
        status: 'draft',
        translation_status: 'draft',
        auto_translated: false
      });
      setFeedbackMessage({ type: 'success', text: 'Чернетку перекладу успішно збережено' });
      loadTranslationsList();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedArticleId) return;
    try {
      // First save current edits
      await handleSaveTranslationDraft();
      await api.admin.approveTranslation(selectedArticleId, 'en');
      setFeedbackMessage({ type: 'success', text: 'Англійський переклад схвалено для публікації!' });
      loadTranslationsList();
      loadWorkspace(selectedArticleId);
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message });
    }
  };

  const handleReject = async () => {
    if (!selectedArticleId) return;
    try {
      await api.admin.rejectTranslation(selectedArticleId, 'en', rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
      setFeedbackMessage({ type: 'success', text: 'Переклад відхилено та повернуто на доопрацювання' });
      loadTranslationsList();
      loadWorkspace(selectedArticleId);
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6" id="translations-workspace">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2.5">
            <Languages className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
            <span>Центр перекладів та адаптації (UA / EN)</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Двомовний редакційний воркспейс TechOrbit з інтеграцією штучного інтелекту Gemini та ручною верифікацією
          </p>
        </div>

        {selectedArticleId && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                setPreviewLang('en');
                setShowPreviewModal(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition shadow-sm"
              id="preview-en-btn"
            >
              <Eye className="w-4 h-4 text-slate-400" />
              <span>Превʼю EN</span>
            </button>
            <button
              type="button"
              onClick={handleTranslateAllAi}
              disabled={isTranslatingAll}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white transition shadow-sm disabled:opacity-50"
              id="ai-translate-all-btn"
            >
              <Sparkles className={`w-4 h-4 ${isTranslatingAll ? 'animate-spin' : ''}`} />
              <span>{isTranslatingAll ? 'AI перекладає...' : 'Перекласти через Gemini'}</span>
            </button>
            <button
              type="button"
              onClick={handleSaveTranslationDraft}
              disabled={isSaving}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 transition shadow-sm"
              id="save-translation-btn"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Збереження...' : 'Зберегти'}</span>
            </button>
            <button
              type="button"
              onClick={handleApprove}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
              id="approve-translation-btn"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Схвалити</span>
            </button>
            <button
              type="button"
              onClick={() => setShowRejectModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 transition"
              id="reject-translation-btn"
            >
              <XCircle className="w-4 h-4" />
              <span>Відхилити</span>
            </button>
          </div>
        )}
      </div>

      {/* Feedback banner */}
      {feedbackMessage && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between animate-in fade-in duration-200 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 font-semibold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Layout Grid: Sidebar List + Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Queue & Articles List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Черга перекладів</h3>
              <span className="text-xs text-slate-500">{translationsList.length} статей</span>
            </div>

            {/* Filter and Search */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Пошук статті..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'all', label: 'Всі' },
                  { id: 'READY_FOR_REVIEW', label: 'На перевірку' },
                  { id: 'IN_PROGRESS', label: 'В роботі' },
                  { id: 'COMPLETED', label: 'Схвалено' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition ${
                      statusFilter === tab.id
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Article Cards List */}
            <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              {loadingList ? (
                <div className="py-12 text-center text-xs text-slate-400">Завантаження черги...</div>
              ) : translationsList.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">Немає статей у черзі</div>
              ) : (
                translationsList.map(item => {
                  const isSelected = selectedArticleId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => loadWorkspace(item.id)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 ring-1 ring-cyan-500/50'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] uppercase font-semibold text-cyan-600 dark:text-cyan-400">
                          {item.category_name_uk || 'Новини'}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            item.translation_status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : item.translation_status === 'READY_FOR_REVIEW'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {item.translation_status}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">
                        {item.title}
                      </h4>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{item.author_name || 'TO'}</span>
                        <span className="flex items-center space-x-1">
                          <span className={item.has_en ? 'text-emerald-500 font-bold' : 'text-slate-400'}>
                            EN {item.has_en ? '✓' : '—'}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Active Translation Workspace */}
        <div className="lg:col-span-8 space-y-4">
          {loadingWorkspace ? (
            <div className="py-24 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <RotateCw className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Завантаження робочого простору перекладу...</p>
            </div>
          ) : !workspaceData ? (
            <div className="py-24 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <Languages className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Оберіть статтю з черги ліворуч
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Ви зможете переглянути першоджерело, відредагувати адаптацію на українську та англійську мови, а також перевірити чекліст якості.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Workspace Navigation Tabs */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-sm">
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('split')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      activeTab === 'split'
                        ? 'bg-cyan-600 text-white shadow'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Подвійний екран (UA | EN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('source')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      activeTab === 'source'
                        ? 'bg-cyan-600 text-white shadow'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Першоджерело
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ua')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      activeTab === 'ua'
                        ? 'bg-cyan-600 text-white shadow'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Українська (UA)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('en')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      activeTab === 'en'
                        ? 'bg-cyan-600 text-white shadow'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Англійська (EN)
                  </button>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono hidden sm:block">
                  ID: {workspaceData.article.id.substring(0, 10)}...
                </div>
              </div>

              {/* TAB 1: SOURCE DETAILS */}
              {activeTab === 'source' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-cyan-600" />
                    <span>Дані про першоджерело та автора</span>
                  </h3>
                  <SourceAttribution article={workspaceData.article} language="uk" />
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Оригінальний URL:
                    </span>
                    <p className="text-xs font-mono text-cyan-600 dark:text-cyan-400 break-all">
                      <a href={workspaceData.article.source_url} target="_blank" rel="noreferrer" className="hover:underline">
                        {workspaceData.article.source_url || 'Джерело не вказано'}
                      </a>
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: SPLIT SCREEN (UA vs EN) OR TAB 3 / 4 */}
              {(activeTab === 'split' || activeTab === 'ua' || activeTab === 'en') && (
                <div className={`grid gap-4 ${activeTab === 'split' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
                  {/* Left Side: UKRAINIAN REFERENCE */}
                  {(activeTab === 'split' || activeTab === 'ua') && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                          UKRAINIAN (Головна мова)
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          /uk/article/{workspaceData.article.slug_uk}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Заголовок (UA):</label>
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white">
                            {workspaceData.article.title}
                          </div>
                        </div>

                        {workspaceData.article.subtitle && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Підзаголовок (UA):</label>
                            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300">
                              {workspaceData.article.subtitle}
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Короткий опис (Excerpt):</label>
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                            {workspaceData.article.excerpt}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            Структурні блоки ({workspaceData.uaBlocks.length}):
                          </label>
                          <div className="max-h-[500px] overflow-y-auto space-y-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            {workspaceData.uaBlocks.map((blk, bi) => (
                              <div key={blk.id || bi} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                                <span className="text-[10px] font-mono text-cyan-600 uppercase font-semibold">
                                  #{bi + 1} {blk.type}
                                </span>
                                <p className="text-slate-800 dark:text-slate-200 line-clamp-3">
                                  {typeof blk.content === 'string'
                                    ? blk.content
                                    : blk.content?.text || JSON.stringify(blk.content)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Right Side: ENGLISH TRANSLATION EDITING */}
                  {(activeTab === 'split' || activeTab === 'en') && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300">
                          ENGLISH (Адаптація)
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          /en/article/{enSlug || 'slug-preview'}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            English Title:
                          </label>
                          <input
                            type="text"
                            value={enTitle}
                            onChange={e => setEnTitle(e.target.value)}
                            placeholder="Enter English title..."
                            className="w-full text-sm font-bold p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            English Subtitle:
                          </label>
                          <input
                            type="text"
                            value={enSubtitle}
                            onChange={e => setEnSubtitle(e.target.value)}
                            placeholder="Enter English subtitle..."
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            English Excerpt:
                          </label>
                          <textarea
                            rows={3}
                            value={enExcerpt}
                            onChange={e => setEnExcerpt(e.target.value)}
                            placeholder="Enter English excerpt..."
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            English Slug:
                          </label>
                          <input
                            type="text"
                            value={enSlug}
                            onChange={e => setEnSlug(e.target.value)}
                            placeholder="apple-m4-chip-announcement"
                            className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-cyan-600 dark:text-cyan-400"
                          />
                        </div>

                        {/* SEO Section with Translate SEO button */}
                        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              SEO Meta Information (EN)
                            </span>
                            <button
                              type="button"
                              onClick={handleTranslateSeo}
                              disabled={isTranslatingSeo}
                              className="text-[11px] text-cyan-600 hover:text-cyan-700 font-medium flex items-center space-x-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>{isTranslatingSeo ? 'Перекладаємо...' : 'AI Translate SEO'}</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            value={enMetaTitle}
                            onChange={e => setEnMetaTitle(e.target.value)}
                            placeholder="SEO Meta Title (60 chars max)"
                            className="w-full text-xs p-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                          />
                          <textarea
                            rows={2}
                            value={enMetaDesc}
                            onChange={e => setEnMetaDesc(e.target.value)}
                            placeholder="SEO Meta Description (160 chars max)"
                            className="w-full text-xs p-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                          />
                        </div>

                        {/* Block Editor for English Blocks */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            Редактор англійських блоків ({enBlocks.length}):
                          </label>
                          <RichBlockEditor
                            blocks={enBlocks}
                            onChange={setEnBlocks}
                            onTranslateBlock={handleTranslateSingleBlock}
                            lang="en"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {selectedArticleId && (
        <ArticlePreviewModal
          articleId={selectedArticleId}
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          initialLang={previewLang}
        />
      )}

      {/* Reject Translation Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-rose-500" />
              <span>Відхилити переклад</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Вкажіть причину відхилення перекладу для журналіста чи повторної обробки системою:
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Наприклад: Неточний переклад технічних термінів M4 neural engine або пропущені цитати..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-3.5 py-1.5 rounded-lg text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium"
              >
                Підтвердити відхилення
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
