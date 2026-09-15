import { useState, useEffect, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Calendar, Eye, ArrowRight, Sparkles, Filter, X } from 'lucide-react';
import { api } from '../../api/client.ts';
import { Article, Category, Language } from '../../types.ts';

interface SearchPageProps {
  currentLang: Language;
  categories: Category[];
}

export function SearchPage({ currentLang, categories }: SearchPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [queryInput, setQueryInput] = useState(initialQuery);
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQueryInput(initialQuery);
    if (initialQuery.trim()) {
      performSearch(initialQuery.trim());
    } else {
      setArticles([]);
      setTotal(0);
    }
  }, [initialQuery, currentLang]);

  const performSearch = async (searchTerm: string) => {
    setLoading(true);
    try {
      const res = await api.public.search(searchTerm, currentLang, 24);
      setArticles(res.articles);
      setTotal(res.total);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (queryInput.trim()) {
      setSearchParams({ q: queryInput.trim() });
    }
  };

  const handleClear = () => {
    setQueryInput('');
    setSearchParams({});
    setArticles([]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-8">
      {/* Header & Search Bar */}
      <div className="space-y-4 max-w-3xl">
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider">
          <Link to={`/${currentLang}`} className="hover:underline">
            {currentLang === 'uk' ? 'Головна' : 'Home'}
          </Link>
          <span>/</span>
          <span>{currentLang === 'uk' ? 'Пошук по базі матеріалів' : 'Content Search'}</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
          {currentLang === 'uk' ? 'Пошук матеріалів та оглядів' : 'Search Articles & Reviews'}
        </h1>

        <form onSubmit={handleSubmit} className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={queryInput}
            onChange={e => setQueryInput(e.target.value)}
            placeholder={
              currentLang === 'uk'
                ? 'Введіть назву гаджета, технологію або ключове слово (напр. Snapdragon, M4, Samsung)...'
                : 'Search gadgets, silicon architectures, or keywords (e.g. Snapdragon, M4, Apple)...'
            }
            className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl pl-12 pr-28 py-3.5 text-sm md:text-base text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 shadow-xl"
            autoFocus
          />
          {queryInput && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-20 p-1 text-slate-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {currentLang === 'uk' ? 'Знайти' : 'Search'}
          </button>
        </form>

        {initialQuery && !loading && (
          <p className="text-xs text-slate-400 font-mono">
            {currentLang === 'uk'
              ? `Знайдено ${total} матеріалів за запитом "${initialQuery}"`
              : `Found ${total} articles for query "${initialQuery}"`}
          </p>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 space-y-4 animate-pulse">
              <div className="w-full h-44 bg-slate-800 rounded-xl" />
              <div className="h-5 bg-slate-800 rounded w-3/4" />
              <div className="h-3 bg-slate-800 rounded w-full" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 && initialQuery ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 space-y-3">
          <Search className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">
            {currentLang === 'uk' ? 'Нічого не знайдено' : 'No results found'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {currentLang === 'uk'
              ? 'Спробуйте використати ширші ключові слова або перевірте правильність написання.'
              : 'Try broader search keywords or check spelling.'}
          </p>
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
                      <Sparkles className="w-10 h-10" />
                    </div>
                  )}

                  {catName && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md text-emerald-400 border border-emerald-800/60 font-mono text-[11px] font-bold">
                      {catName}
                    </span>
                  )}

                  {article.review_score && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-bold font-mono text-xs">
                      ★ {article.review_score.toFixed(1)}
                    </span>
                  )}
                </Link>

                <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                      <span>
                        {new Date(article.published_at || article.created_at).toLocaleDateString(
                          currentLang === 'uk' ? 'uk-UA' : 'en-US',
                          { month: 'short', day: 'numeric', year: 'numeric' }
                        )}
                      </span>
                      {article.views_count > 0 && <span>• {article.views_count} переглядів</span>}
                    </div>

                    <h2 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                      <Link to={`/${currentLang}/article/${slug}`}>{article.title}</Link>
                    </h2>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {article.excerpt}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {article.author_name || 'TechOrbit Team'}
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
    </div>
  );
}
