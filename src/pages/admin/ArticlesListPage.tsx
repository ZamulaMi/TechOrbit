import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { api } from '../../api/client.ts';
import { Article, ArticleStatus, Category, Source } from '../../types.ts';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  CheckCircle,
  Eye,
  ExternalLink,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export function ArticlesListPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [message, setMessage] = useState('');

  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [articlesData, cats, srcs] = await Promise.all([
        api.admin.getArticles({
          status: statusFilter !== 'ALL' ? (statusFilter as ArticleStatus) : undefined,
          categoryId: categoryFilter || undefined,
          search: search || undefined,
          limit: 50
        }),
        api.admin.getCategories(),
        api.admin.getSources()
      ]);

      setArticles(articlesData.articles);
      setTotal(articlesData.total);
      setCategories(cats);
      setSources(srcs);
    } catch (err) {
      console.error('Failed to load articles', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, categoryFilter, search]);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Видалити статтю "${title}"? Цю дію не можна скасувати.`)) return;
    try {
      await api.admin.deleteArticle(id);
      setMessage(`Статтю "${title}" видалено`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Помилка видалення');
    }
  };

  const handleQuickPublish = async (id: string) => {
    try {
      await api.admin.publishArticle(id);
      setMessage('Статтю опубліковано на сайті!');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Помилка публікації');
    }
  };

  const statusTabs = [
    { key: 'ALL', label: 'Всі' },
    { key: 'PENDING_REVIEW', label: 'Модерація' },
    { key: 'PUBLISHED', label: 'Опубліковані' },
    { key: 'APPROVED', label: 'Схвалені' },
    { key: 'TRANSLATED', label: 'Перекладені' },
    { key: 'IMPORTED', label: 'Імпортовані' },
    { key: 'DRAFT', label: 'Чернетки' }
  ];

  return (
    <AdminLayout
      title="Управління статтями"
      subtitle={`Всього знайдено: ${total} матеріалів`}
      onRefresh={loadData}
      refreshing={loading}
    >
      <div className="space-y-5">
        {message && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
            <span>{message}</span>
            <button type="button" onClick={() => setMessage('')} className="font-bold hover:underline">
              ✕
            </button>
          </div>
        )}

        {/* Action & Filter Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800">
            {statusTabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Select Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3 w-full">
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Пошук за назвою або джерелом..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              </div>

              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Всі рубрики</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name_uk}
                  </option>
                ))}
              </select>
            </div>

            <Link
              to="/admin/articles/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shrink-0 shadow-sm shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Додати нову статтю</span>
            </Link>
          </div>
        </div>

        {/* Articles Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Обкладинка & Назва</th>
                  <th className="py-3 px-3 font-semibold">Статус</th>
                  <th className="py-3 px-3 font-semibold">Рубрика</th>
                  <th className="py-3 px-3 font-semibold">Джерело</th>
                  <th className="py-3 px-3 font-semibold">Автор</th>
                  <th className="py-3 px-3 font-semibold">Оновлено</th>
                  <th className="py-3 px-4 font-semibold text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-500" />
                      <span>Завантаження статей...</span>
                    </td>
                  </tr>
                ) : articles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      Статей за обраними критеріями не знайдено.
                    </td>
                  </tr>
                ) : (
                  articles.map(art => (
                    <tr key={art.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-10 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                            {art.featured_image_url ? (
                              <img
                                src={art.featured_image_url}
                                alt={art.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-600">
                                No img
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 max-w-sm">
                            <Link
                              to={`/admin/articles/${art.id}/edit`}
                              className="font-bold text-white hover:text-emerald-400 transition-colors block truncate"
                            >
                              {art.title}
                            </Link>
                            <span className="text-[10px] text-slate-500 font-mono block truncate">
                              /{art.slug_uk}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <StatusBadge status={art.status} />
                      </td>

                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {art.category_name_uk || '—'}
                      </td>

                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {art.source_name ? (
                          <span className="text-slate-300 font-medium">{art.source_name}</span>
                        ) : (
                          <span className="text-slate-600">TechOrbit Direct</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {art.author_name || 'Редакція'}
                      </td>

                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {new Date(art.updated_at).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {art.status !== 'PUBLISHED' && (
                            <button
                              type="button"
                              onClick={() => handleQuickPublish(art.id)}
                              title="Опублікувати на сайті"
                              className="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-400 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}

                          {art.status === 'PUBLISHED' && (
                            <Link
                              to={`/article/${art.slug_uk}`}
                              target="_blank"
                              title="Переглянути на сайті"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          )}

                          <Link
                            to={`/admin/articles/${art.id}/edit`}
                            title="Редагувати матеріал"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDelete(art.id, art.title)}
                            title="Видалити"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
