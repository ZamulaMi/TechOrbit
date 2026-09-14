import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { VersionHistoryModal } from '../../components/admin/VersionHistoryModal.tsx';
import { api } from '../../api/client.ts';
import { Article, Source, Category } from '../../types.ts';
import {
  CheckSquare,
  CheckCircle,
  XCircle,
  Eye,
  Send,
  ExternalLink,
  Edit,
  ShieldAlert,
  Clock,
  Sparkles,
  GitCompare,
  Languages,
  History,
  Search,
  Filter,
  Layers,
  ArrowRight,
  FileCheck
} from 'lucide-react';

export function ReviewQueuePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    'new_articles' | 'updated_articles' | 'translations_pending' | 'publishing_ready'
  >('new_articles');

  const [queueData, setQueueData] = useState<{
    newArticles: Article[];
    updatedArticles: Article[];
    translationsPending: Article[];
    publishingReady: Article[];
    counts: {
      newArticles: number;
      updatedArticles: number;
      translationsPending: number;
      publishingReady: number;
    };
  }>({
    newArticles: [],
    updatedArticles: [],
    translationsPending: [],
    publishingReady: [],
    counts: {
      newArticles: 0,
      updatedArticles: 0,
      translationsPending: 0,
      publishingReady: 0
    }
  });

  const [sources, setSources] = useState<Source[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [rejectingArticle, setRejectingArticle] = useState<Article | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewArticle, setPreviewArticle] = useState<Article | null>(null);
  const [versionHistoryArticle, setVersionHistoryArticle] = useState<Article | null>(null);

  // Feedback & Operations
  const [message, setMessage] = useState('');
  const [translatingId, setTranslatingId] = useState<string | null>(null);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const [res, sourcesRes, categoriesRes] = await Promise.all([
        api.admin.getReviewQueue({
          sourceId: sourceFilter !== 'ALL' ? sourceFilter : undefined,
          categoryId: categoryFilter !== 'ALL' ? categoryFilter : undefined,
          search: searchQuery.trim() || undefined
        }),
        api.admin.getSources(),
        api.public.getCategories()
      ]);

      setQueueData(res);
      setSources(sourcesRes);
      setCategories(categoriesRes);
    } catch (err) {
      console.error('Failed to load review queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [sourceFilter, categoryFilter, searchQuery]);

  const handleApprove = async (art: Article) => {
    try {
      await api.admin.approveArticle(art.id);
      setMessage(`Матеріал "${art.title.substring(0, 35)}..." схвалено до публікації!`);
      await loadQueue();
    } catch (err: any) {
      alert(err.message || 'Помилка схвалення');
    }
  };

  const handlePublish = async (art: Article) => {
    try {
      await api.admin.publishArticle(art.id);
      setMessage(`Матеріал "${art.title.substring(0, 35)}..." опубліковано на TechOrbit!`);
      await loadQueue();
    } catch (err: any) {
      alert(err.message || 'Помилка публікації');
    }
  };

  const handleReject = async (e: FormEvent) => {
    e.preventDefault();
    if (!rejectingArticle) return;

    try {
      await api.admin.rejectArticle(rejectingArticle.id, rejectReason);
      setMessage(`Матеріал "${rejectingArticle.title.substring(0, 35)}..." відхилено в архів.`);
      setRejectingArticle(null);
      setRejectReason('');
      await loadQueue();
    } catch (err: any) {
      alert(err.message || 'Помилка відхилення');
    }
  };

  const handleAiTranslate = async (art: Article) => {
    setTranslatingId(art.id);
    try {
      const res = await api.admin.translateWithAi(art.id, 'uk');
      setMessage(`ШІ-переклад для "${art.title.substring(0, 30)}..." створено та переведено в статус READY_FOR_REVIEW.`);
      await loadQueue();
    } catch (err: any) {
      alert(err.message || 'Помилка перекладу');
    } finally {
      setTranslatingId(null);
    }
  };

  // Active items by tab
  const currentList =
    activeTab === 'new_articles'
      ? queueData.newArticles
      : activeTab === 'updated_articles'
      ? queueData.updatedArticles
      : activeTab === 'translations_pending'
      ? queueData.translationsPending
      : queueData.publishingReady;

  return (
    <AdminLayout
      title="Черга модерації та рецензування (Review Queue)"
      subtitle="Центр схвалення матеріалів, оновлень, перекладів та публікації"
      onRefresh={loadQueue}
      refreshing={loading}
    >
      <div className="space-y-6">
        {message && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{message}</span>
            </div>
            <button type="button" onClick={() => setMessage('')} className="font-bold hover:underline">
              ✕
            </button>
          </div>
        )}

        {/* SECTION TABS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('new_articles')}
            className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
              activeTab === 'new_articles'
                ? 'bg-slate-900 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Нові матеріали
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-bold text-xs">
                {queueData.counts.newArticles}
              </span>
            </div>
            <p className="font-bold text-white text-sm">PENDING_REVIEW</p>
            <p className="text-[11px] text-slate-400 mt-1">Очікують первинної перевірки редактора</p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('updated_articles')}
            className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
              activeTab === 'updated_articles'
                ? 'bg-slate-900 border-amber-500 shadow-md ring-1 ring-amber-500/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Оновлення з джерел
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono font-bold text-xs">
                {queueData.counts.updatedArticles}
              </span>
            </div>
            <p className="font-bold text-white text-sm">UPDATE_PENDING</p>
            <p className="text-[11px] text-slate-400 mt-1">Зміни в першоджерелі очікують диф-рев'ю</p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('translations_pending')}
            className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
              activeTab === 'translations_pending'
                ? 'bg-slate-900 border-blue-500 shadow-md ring-1 ring-blue-500/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Очікують перекладу
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-mono font-bold text-xs">
                {queueData.counts.translationsPending}
              </span>
            </div>
            <p className="font-bold text-white text-sm">TRANSLATION_QUEUE</p>
            <p className="text-[11px] text-slate-400 mt-1">Матеріали на вичитці або AI-перекладі</p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('publishing_ready')}
            className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
              activeTab === 'publishing_ready'
                ? 'bg-slate-900 border-purple-500 shadow-md ring-1 ring-purple-500/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Готові до релізу
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 font-mono font-bold text-xs">
                {queueData.counts.publishingReady}
              </span>
            </div>
            <p className="font-bold text-white text-sm">APPROVED / DRAFT</p>
            <p className="text-[11px] text-slate-400 mt-1">Схвалені матеріали готові до виходу наживо</p>
          </button>
        </div>

        {/* FILTERS & SEARCH */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Фільтри черги:</span>
            </div>

            {/* Source */}
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300"
            >
              <option value="ALL">Всі джерела (All Sources)</option>
              {sources.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Category */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300"
            >
              <option value="ALL">Всі категорії</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name_uk}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Пошук за заголовком або описом..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 w-56 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <span className="text-slate-400 font-medium">
            Матеріалів у секції: <strong className="text-white">{currentList.length}</strong>
          </span>
        </div>

        {/* ARTICLES LIST */}
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs">Завантаження черги рецензування...</p>
          </div>
        ) : currentList.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="font-bold text-white text-sm">Ця секція черги порожня</h3>
            <p className="text-xs text-slate-400">
              Всі матеріали цієї категорії перевірено або відсутні для модерації.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentList.map(art => {
              const hasPendingChanges = (art as any).pending_changes_count > 0 || art.status === 'UPDATE_PENDING';

              return (
                <div
                  key={art.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 hover:border-slate-700 transition-all shadow-lg"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={art.status} />

                      {hasPendingChanges && (
                        <Link
                          to="/admin/changes"
                          className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 hover:bg-amber-500/30 transition-colors"
                        >
                          <GitCompare className="w-3 h-3" />
                          <span>Є оновлення з джерела!</span>
                        </Link>
                      )}

                      <span className="text-xs font-semibold text-emerald-400">
                        {art.category_name_uk || 'Без рубрики'}
                      </span>

                      {art.source_name && (
                        <span className="text-[11px] text-slate-400">
                          Джерело: <strong className="text-slate-200">{art.source_name}</strong>
                        </span>
                      )}

                      {art.translation_status && (
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          Переклад: {art.translation_status}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-base text-white truncate max-w-2xl">
                      {art.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed max-w-3xl">
                      {art.excerpt}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                      <span>Автор: {art.author_name || art.source_author || 'TechOrbit Team'}</span>
                      <span>•</span>
                      <span>Створено: {new Date(art.created_at).toLocaleString()}</span>
                      {art.source_url && (
                        <>
                          <span>•</span>
                          <a
                            href={art.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-emerald-400 flex items-center gap-1"
                          >
                            <span>Оригінал</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ACTION CONTROLS */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* View Preview */}
                    <button
                      type="button"
                      onClick={() => setPreviewArticle(art)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs transition-colors"
                      title="Швидкий попередній перегляд"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Version history */}
                    <button
                      type="button"
                      onClick={() => setVersionHistoryArticle(art)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs transition-colors"
                      title="Історія версій та відкати"
                    >
                      <History className="w-4 h-4" />
                    </button>

                    {/* If Update Pending -> Diff button */}
                    {hasPendingChanges && (
                      <Link
                        to="/admin/changes"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-colors"
                      >
                        <GitCompare className="w-3.5 h-3.5" />
                        <span>Diff & Merge</span>
                      </Link>
                    )}

                    {/* Edit & Translate link */}
                    <Link
                      to={`/admin/articles/${art.id}/edit`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Редагувати</span>
                    </Link>

                    {/* AI Translate button */}
                    <button
                      type="button"
                      disabled={translatingId === art.id}
                      onClick={() => handleAiTranslate(art)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-colors"
                      title="Автоматичний ШІ-переклад на українську"
                    >
                      <Languages className="w-3.5 h-3.5" />
                      <span>{translatingId === art.id ? 'Переклад...' : 'ШІ-переклад'}</span>
                    </button>

                    {/* Approve button */}
                    {art.status !== 'APPROVED' && art.status !== 'PUBLISHED' && (
                      <button
                        type="button"
                        onClick={() => handleApprove(art)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-sm"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Схвалити</span>
                      </button>
                    )}

                    {/* Publish button */}
                    {art.status !== 'PUBLISHED' && (
                      <button
                        type="button"
                        onClick={() => handlePublish(art)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm shadow-emerald-600/20"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Опублікувати</span>
                      </button>
                    )}

                    {/* Reject button */}
                    <button
                      type="button"
                      onClick={() => setRejectingArticle(art)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Відхилити в архів / чернетки"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* REJECT MODAL */}
        {rejectingArticle && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <h3 className="font-bold text-white text-sm">Відхилити матеріал</h3>
              <p className="text-xs text-slate-400">
                Вкажіть причину відхилення статті "{rejectingArticle.title.substring(0, 40)}...".
              </p>

              <form onSubmit={handleReject} className="space-y-3">
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Зауваження для редактора (наприклад: низька якість першоджерела, застаріла інформація)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  required
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectingArticle(null)}
                    className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                  >
                    Відхилити
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ARTICLE PREVIEW MODAL */}
        {previewArticle && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400">
                    Попередній перегляд статті
                  </span>
                  <h3 className="font-bold text-white text-sm truncate max-w-xl">
                    {previewArticle.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewArticle(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
                >
                  Закрити
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                {previewArticle.featured_image_url && (
                  <img
                    src={previewArticle.featured_image_url}
                    alt={previewArticle.title}
                    className="w-full h-64 object-cover rounded-xl border border-slate-800"
                  />
                )}

                <h1 className="text-xl font-black text-white">{previewArticle.title}</h1>

                {previewArticle.subtitle && (
                  <p className="text-sm font-medium text-slate-300 italic">
                    {previewArticle.subtitle}
                  </p>
                )}

                {previewArticle.excerpt && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed font-sans">
                    {previewArticle.excerpt}
                  </div>
                )}

                <div
                  className="prose prose-invert prose-sm max-w-none text-slate-200 border-t border-slate-800 pt-4"
                  dangerouslySetInnerHTML={{ __html: previewArticle.content }}
                />
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Статус: <strong className="text-white">{previewArticle.status}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const id = previewArticle.id;
                      setPreviewArticle(null);
                      navigate(`/admin/articles/${id}/edit`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                  >
                    Перейти в редактор
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleApprove(previewArticle);
                      setPreviewArticle(null);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                  >
                    Схвалити зараз
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VERSION HISTORY MODAL */}
        {versionHistoryArticle && (
          <VersionHistoryModal
            articleId={versionHistoryArticle.id}
            articleTitle={versionHistoryArticle.title}
            isOpen={true}
            onClose={() => setVersionHistoryArticle(null)}
            onVersionRestored={() => {
              loadQueue();
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}
