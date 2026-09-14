import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client.ts';
import { Article, Category, Language } from '../../types.ts';
import { ArrowLeft, Clock, User, Cpu } from 'lucide-react';

interface CategoryPageProps {
  currentLang: Language;
  categories: Category[];
}

export function CategoryPage({ currentLang, categories }: CategoryPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const matchedCat = categories.find(c => c.slug_uk === slug || c.slug_en === slug);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.public
      .getArticles({
        lang: currentLang,
        category: slug,
        limit: 20
      })
      .then(res => setArticles(res.articles))
      .catch(err => console.error('Failed to load category articles', err))
      .finally(() => setLoading(false));
  }, [slug, currentLang]);

  const catName = matchedCat
    ? currentLang === 'uk'
      ? matchedCat.name_uk
      : matchedCat.name_en
    : slug;
  const catDesc = matchedCat
    ? currentLang === 'uk'
      ? matchedCat.description_uk
      : matchedCat.description_en
    : '';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        <div>
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors mb-3">
            <ArrowLeft className="w-4 h-4" />
            <span>{currentLang === 'uk' ? 'Усі новини' : 'All Stories'}</span>
          </Link>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
            <h1 className="text-2xl sm:text-3xl font-black text-white">{catName}</h1>
            {catDesc && <p className="text-xs text-slate-400 mt-1 max-w-2xl">{catDesc}</p>}
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs">Завантаження новин рубрики...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
            <Cpu className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">У цій рубриці наразі немає публікацій</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {articles.map(art => {
              const artSlug = currentLang === 'uk' ? art.slug_uk : art.slug_en;
              return (
                <div
                  key={art.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all flex flex-col group"
                >
                  <Link to={`/article/${artSlug}`} className="aspect-[16/9] block overflow-hidden bg-slate-950">
                    <img
                      src={
                        art.featured_image_url ||
                        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=450&fit=crop&q=80'
                      }
                      alt={art.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <Link to={`/article/${artSlug}`}>
                        <h3 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors line-clamp-2">
                          {art.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-slate-400 line-clamp-2">{art.excerpt}</p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                      <span>{art.author_name || 'TechOrbit'}</span>
                      <span>{new Date(art.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
