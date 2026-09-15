import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Award, Star, Sparkles, CheckCircle, ArrowRight, ShieldCheck, Cpu, Sliders } from 'lucide-react';
import { api } from '../../api/client.ts';
import { Article, Category, Language } from '../../types.ts';

interface ReviewsPageProps {
  currentLang: Language;
  categories: Category[];
}

export function ReviewsPage({ currentLang, categories }: ReviewsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reviews, setReviews] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedCategory = searchParams.get('category') || '';
  const sortBy = (searchParams.get('sortBy') as 'latest' | 'popular') || 'latest';

  useEffect(() => {
    loadReviews();
  }, [selectedCategory, sortBy, currentLang]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await api.public.getArticles({
        category: selectedCategory || undefined,
        type: 'review',
        sortBy,
        lang: currentLang,
        limit: 18
      });
      setReviews(res.articles);
    } catch (err) {
      console.error('Failed to load reviews', err);
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
    setSearchParams(params);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-10">
      {/* Editorial Header */}
      <div className="space-y-4 border-b border-slate-800 pb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider">
          <Link to={`/${currentLang}`} className="hover:underline">
            {currentLang === 'uk' ? 'Головна' : 'Home'}
          </Link>
          <span>/</span>
          <span>{currentLang === 'uk' ? 'Лабораторні огляди' : 'TechOrbit Reviews'}</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight flex items-center gap-3">
              <Award className="w-9 h-9 md:w-11 h-11 text-emerald-400" />
              <span>{currentLang === 'uk' ? 'Незалежні огляди та тести' : 'Independent Hardware Reviews'}</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              {currentLang === 'uk'
                ? 'Реальний досвід експлуатації, лабораторні вимірювання автономності, теплові камери та чесний вердикт редакції без комерційного впливу брендів.'
                : 'Real-world testing, display colorimeter data, battery benchmarks, and honest editorial scores completely free of brand sponsorships.'}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800/80 p-3 rounded-2xl text-xs font-mono text-slate-300">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-white">TechOrbit Standard</div>
              <div className="text-[11px] text-slate-400">10-Point Independent Matrix</div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => handleCategorySelect('')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            !selectedCategory
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-950/40'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
          }`}
        >
          {currentLang === 'uk' ? 'Всі протестовані пристрої' : 'All Tested Devices'}
        </button>
        {categories.map(cat => {
          const slug = currentLang === 'uk' ? cat.slug_uk : cat.slug_en;
          const isSelected = selectedCategory === slug;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(slug)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-950/40'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              {currentLang === 'uk' ? cat.name_uk : cat.name_en}
            </button>
          );
        })}
      </div>

      {/* Reviews Showcase */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-slate-900/60 rounded-3xl border border-slate-800 p-5 space-y-4 animate-pulse">
              <div className="w-full h-56 bg-slate-800 rounded-2xl" />
              <div className="h-6 bg-slate-800 rounded w-2/3" />
              <div className="h-4 bg-slate-800 rounded w-full" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 space-y-3">
          <Award className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">
            {currentLang === 'uk' ? 'Оглядів у цій рубриці поки немає' : 'No hardware reviews found in this category'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {currentLang === 'uk'
              ? 'Наші редактори готують нові тести та огляди гаджетів.'
              : 'Our editorial team is currently testing new devices in the lab.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {reviews.map(review => {
            const slug = currentLang === 'uk' ? review.slug_uk : review.slug_en;
            const score = review.review_score || 9.2;
            const catName = currentLang === 'uk' ? review.category_name_uk : review.category_name_en;

            return (
              <article
                key={review.id}
                className="group flex flex-col bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden hover:border-emerald-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-950/30"
              >
                {/* Visual Cover with Score Stamp */}
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
                  {review.featured_image_url ? (
                    <img
                      src={review.featured_image_url}
                      alt={review.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                      <Cpu className="w-12 h-12" />
                    </div>
                  )}

                  {/* Editorial Score Stamp */}
                  <div className="absolute top-4 right-4 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md border border-emerald-500/40 rounded-2xl w-14 h-14 shadow-lg shadow-black/60">
                    <span className="text-emerald-400 font-black text-lg tracking-tight leading-none">
                      {score.toFixed(1)}
                    </span>
                    <span className="text-[9px] uppercase font-mono text-slate-400 mt-0.5">/10</span>
                  </div>

                  {catName && (
                    <span className="absolute top-4 left-4 px-3 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md text-slate-200 border border-slate-700/60 font-mono text-xs font-bold">
                      {catName}
                    </span>
                  )}
                </div>

                {/* Content Box */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    {review.subtitle && (
                      <p className="text-xs text-emerald-400 font-mono font-medium line-clamp-1">
                        {review.subtitle}
                      </p>
                    )}

                    <h2 className="text-lg md:text-xl font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                      <Link to={`/${currentLang}/article/${slug}`}>{review.title}</Link>
                    </h2>

                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {review.excerpt}
                    </p>
                  </div>

                  {/* Highlights & Link */}
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{currentLang === 'uk' ? 'Лабораторний тест' : 'Lab Tested'}</span>
                    </div>

                    <Link
                      to={`/${currentLang}/article/${slug}`}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors group-hover:bg-emerald-600 group-hover:text-white"
                    >
                      <span>{currentLang === 'uk' ? 'Читати вердикт' : 'Full Verdict'}</span>
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
