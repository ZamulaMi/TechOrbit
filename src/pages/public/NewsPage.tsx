import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Newspaper, Calendar, Clock, ArrowRight, Filter, Flame, Eye, Sparkles } from 'lucide-react';
import { api } from '../../api/client.ts';
import { Article, Category, Language } from '../../types.ts';

interface NewsPageProps {
  currentLang: Language;
  categories: Category[];
}

export function NewsPage({ currentLang, categories }: NewsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const selectedCategory = searchParams.get('category') || '';
  const sortBy = (searchParams.get('sortBy') as 'latest' | 'popular') || 'latest';
  const page = parseInt(searchParams.get('page') || '1') || 1;
  const limit = 12;

  useEffect(() => {
    loadNews();
  }, [selectedCategory, sortBy, page, currentLang]);

  const loadNews = async () => {
    setLoading(true);
    try {
      const res = await api.public.getArticles({
        category: selectedCategory || undefined,
        type: 'news',
        sortBy,
        lang: currentLang,
        limit,
        offset: (page - 1) * limit
      });
      setArticles(res.articles);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load news', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (catSlug: string) => {
    const params = new URLSearchParams(searchParams);
    if (catSlug) {
      params.set('category', catSlug);
    } else {
      params.delete('category');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleSortChange = (newSort: 'latest' | 'popular') => {
    const params = new URLSearchParams(searchParams);
    params.set('sortBy', newSort);
    params.set('page', '1');
    setSearchParams(params);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-8">
      {/* Breadcrumb & Heading */}
      <div className="space-y-3 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider">
          <Link to={`/${currentLang}`} className="hover:underline">
            {currentLang === 'uk' ? 'Головна' : 'Home'}
          </Link>
          <span>/</span>
          <span>{currentLang === 'uk' ? 'Свіжі новини' : 'Tech News'}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <Newspaper className="w-8 h-8 text-emerald-400" />
              <span>{currentLang === 'uk' ? 'Стрічка технологічних новин' : 'Technology News Feed'}</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              {currentLang === 'uk'
                ? 'Щоденні оновлення індустрії, релізи гаджетів, події у світі штучного інтелекту та перевірені першоджерела.'
                : 'Daily tech intelligence, mobile hardware debuts, artificial intelligence releases, and curated primary coverage.'}
            </p>
          </div>

          {/* Sort tabs */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-medium self-start md:self-auto">
            <button
              onClick={() => handleSortChange('latest')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                sortBy === 'latest' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{currentLang === 'uk' ? 'Найновіші' : 'Latest'}</span>
            </button>
            <button
              onClick={() => handleSortChange('popular')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                sortBy === 'popular' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentLang === 'uk' ? 'Популярні' : 'Trending'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => handleCategorySelect('')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
            !selectedCategory
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
          }`}
        >
          {currentLang === 'uk' ? 'Всі новини' : 'All Stories'}
        </button>
        {categories.map(cat => {
          const slug = currentLang === 'uk' ? cat.slug_uk : cat.slug_en;
          const isSelected = selectedCategory === slug;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(slug)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              {currentLang === 'uk' ? cat.name_uk : cat.name_en}
            </button>
          );
        })}
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-4 space-y-4 animate-pulse">
              <div className="w-full h-48 bg-slate-800 rounded-xl" />
              <div className="h-4 bg-slate-800 rounded w-1/3" />
              <div className="h-5 bg-slate-800 rounded w-3/4" />
              <div className="h-3 bg-slate-800 rounded w-full" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 space-y-3">
          <Newspaper className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">
            {currentLang === 'uk' ? 'Новин за цим критерієм не знайдено' : 'No news found matching this criteria'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {currentLang === 'uk'
              ? 'Спробуйте обрати іншу категорію або скинути фільтри.'
              : 'Try selecting a different category or clearing your active filters.'}
          </p>
          <button
            onClick={() => handleCategorySelect('')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
          >
            {currentLang === 'uk' ? 'Скинути фільтр' : 'Reset Filter'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map(article => {
            const slug = currentLang === 'uk' ? article.slug_uk : article.slug_en;
            const catName = currentLang === 'uk' ? article.category_name_uk : article.category_name_en;

            return (
              <article
                key={article.id}
                className="group flex flex-col bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden hover:border-slate-700 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-950/20"
              >
                {/* Media banner */}
                <Link to={`/${currentLang}/article/${slug}`} className="block relative aspect-video overflow-hidden bg-slate-950">
                  {article.featured_image_url ? (
                    <img
                      src={article.featured_image_url}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-700">
                      <Newspaper className="w-12 h-12" />
                    </div>
                  )}

                  {catName && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md text-emerald-400 border border-emerald-800/60 font-mono text-[11px] font-bold">
                      {catName}
                    </span>
                  )}
                </Link>

                {/* Article Info */}
                <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(article.published_at || article.created_at).toLocaleDateString(
                          currentLang === 'uk' ? 'uk-UA' : 'en-US',
                          { month: 'short', day: 'numeric', year: 'numeric' }
                        )}
                      </span>
                      {article.views_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          {article.views_count}
                        </span>
                      )}
                    </div>

                    <h2 className="text-base md:text-lg font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                      <Link to={`/${currentLang}/article/${slug}`}>{article.title}</Link>
                    </h2>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {article.excerpt}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">
                      {article.author_name || (currentLang === 'uk' ? 'Редакція TechOrbit' : 'TechOrbit Editorial')}
                    </span>
                    <Link
                      to={`/${currentLang}/article/${slug}`}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>{currentLang === 'uk' ? 'Читати' : 'Read'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
            <button
              key={pageNum}
              onClick={() => {
                const p = new URLSearchParams(searchParams);
                p.set('page', pageNum.toString());
                setSearchParams(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`w-9 h-9 rounded-xl text-xs font-mono font-semibold transition-colors cursor-pointer ${
                page === pageNum
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {pageNum}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
