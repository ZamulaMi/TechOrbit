import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client.ts';
import { Article, Category, Language } from '../../types.ts';
import { ArrowLeft, Clock, Eye, Cpu, Flame, ArrowRight, FolderTree } from 'lucide-react';

interface CategoryPageProps {
  currentLang: Language;
  categories: Category[];
}

export function CategoryPage({ currentLang, categories }: CategoryPageProps) {
  const { slug, category, lang } = useParams<{ slug?: string; category?: string; lang?: string }>();
  const activeLang: Language = lang === 'en' || lang === 'uk' ? lang : currentLang;
  const categorySlug = category || slug || '';

  const [searchParams, setSearchParams] = useSearchParams();
  const sortBy = (searchParams.get('sortBy') as 'latest' | 'popular') || 'latest';

  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const matchedCat = categories.find(c => c.slug_uk === categorySlug || c.slug_en === categorySlug);

  useEffect(() => {
    if (!categorySlug) return;
    setLoading(true);
    api.public
      .getArticles({
        lang: activeLang,
        category: categorySlug,
        sortBy,
        limit: 24
      })
      .then(res => {
        setArticles(res.articles);
        setTotal(res.total);
      })
      .catch(err => console.error('Failed to load category articles', err))
      .finally(() => setLoading(false));
  }, [categorySlug, activeLang, sortBy]);

  const catName = matchedCat
    ? activeLang === 'uk'
      ? matchedCat.name_uk
      : matchedCat.name_en
    : categorySlug;
  const catDesc = matchedCat
    ? activeLang === 'uk'
      ? matchedCat.description_uk
      : matchedCat.description_en
    : '';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        {/* Breadcrumb & Category Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider">
            <Link to={`/${activeLang}`} className="hover:underline">
              {activeLang === 'uk' ? 'Головна' : 'Home'}
            </Link>
            <span>/</span>
            <span>{activeLang === 'uk' ? 'Рубрика' : 'Category'}</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-mono text-emerald-400 uppercase font-semibold">
                  {articles.length} матеріалів
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">{catName}</h1>
              {catDesc && <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">{catDesc}</p>}
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs font-medium self-start md:self-auto font-mono">
              <button
                onClick={() => setSearchParams({ sortBy: 'latest' })}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  sortBy === 'latest' ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{activeLang === 'uk' ? 'Найновіші' : 'Latest'}</span>
              </button>
              <button
                onClick={() => setSearchParams({ sortBy: 'popular' })}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  sortBy === 'popular' ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>{activeLang === 'uk' ? 'Популярні' : 'Popular'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-72 bg-slate-900/60 border border-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 p-8 space-y-3">
            <Cpu className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-base font-bold text-slate-200">
              {activeLang === 'uk' ? 'У цій рубриці наразі немає публікацій' : 'No articles published in this category yet'}
            </p>
            <Link
              to={`/${activeLang}`}
              className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
            >
              {activeLang === 'uk' ? 'Повернутися на головну' : 'Back to Home'}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map(art => {
              const artSlug = activeLang === 'uk' ? art.slug_uk : art.slug_en;
              return (
                <article
                  key={art.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all duration-300 hover:shadow-xl flex flex-col group"
                >
                  <Link to={`/${activeLang}/article/${artSlug}`} className="aspect-video block overflow-hidden bg-slate-950 relative">
                    {art.featured_image_url ? (
                      <img
                        src={art.featured_image_url}
                        alt={art.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-700">
                        <Cpu className="w-10 h-10" />
                      </div>
                    )}
                    {art.review_score && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-bold font-mono text-xs">
                        ★ {art.review_score.toFixed(1)}
                      </span>
                    )}
                  </Link>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span>
                          {new Date(art.published_at || art.created_at).toLocaleDateString(
                            activeLang === 'uk' ? 'uk-UA' : 'en-US',
                            { month: 'short', day: 'numeric', year: 'numeric' }
                          )}
                        </span>
                        {art.views_count > 0 && <span>• {art.views_count} views</span>}
                      </div>

                      <h3 className="font-bold text-base text-white group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                        <Link to={`/${activeLang}/article/${artSlug}`}>{art.title}</Link>
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{art.excerpt}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-500">{art.author_name || 'TechOrbit'}</span>
                      <Link
                        to={`/${activeLang}/article/${artSlug}`}
                        className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                      >
                        <span>{activeLang === 'uk' ? 'Читати' : 'Read'}</span>
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
    </div>
  );
}
