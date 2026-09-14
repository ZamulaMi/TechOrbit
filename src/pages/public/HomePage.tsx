import { useState, useEffect } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import { Clock, User, ArrowRight, Sparkles, ExternalLink, Flame, ShieldAlert, Cpu } from 'lucide-react';
import { api } from '../../api/client.ts';
import { Article, Category, Language, AdSlot } from '../../types.ts';

interface HomePageProps {
  currentLang: Language;
  categories: Category[];
}

export function HomePage({ currentLang, categories }: HomePageProps) {
  const { lang } = useParams<{ lang?: string }>();
  const activeLang: Language = lang === 'en' || lang === 'uk' ? lang : currentLang;

  const [searchParams] = useSearchParams();
  const searchFilter = searchParams.get('q') || '';

  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [ads, setAds] = useState<AdSlot[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [articlesData, adsData] = await Promise.all([
        api.public.getArticles({
          lang: activeLang,
          category: activeCategory !== 'all' ? activeCategory : undefined,
          search: searchFilter || undefined,
          limit: 12
        }),
        api.public.getAds()
      ]);
      setArticles(articlesData.articles);
      setTotal(articlesData.total);
      setAds(adsData);
    } catch (err) {
      console.error('Failed to load articles', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeLang, activeCategory, searchFilter]);

  const heroArticle = articles.length > 0 ? articles[0] : null;
  const secondaryArticles = articles.length > 1 ? articles.slice(1, 4) : [];
  const feedArticles = articles.length > 4 ? articles.slice(4) : [];

  const headerAd = ads.find(a => a.position === 'header_leaderboard' && a.is_active);
  const sidebarAd = ads.find(a => a.position === 'sidebar' && a.is_active);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Optional Leaderboard Ad */}
      {headerAd && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                Спонсорський блок
              </span>
              <span className="font-medium text-slate-300">{headerAd.name}</span>
            </div>
            {headerAd.fallback_link && (
              <a
                href={headerAd.fallback_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                <span>Дізнатися більше</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeCategory === 'all'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {currentLang === 'uk' ? 'Всі новини' : 'All Stories'}
          </button>
          {categories.map(cat => {
            const name = currentLang === 'uk' ? cat.name_uk : cat.name_en;
            const slug = currentLang === 'uk' ? cat.slug_uk : cat.slug_en;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(slug)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeCategory === slug
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>

        {searchFilter && (
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
            <span>
              Результати пошуку для: <strong className="text-emerald-400">"{searchFilter}"</strong> ({total} знайдено)
            </span>
            <Link to="/" className="text-slate-400 hover:text-white underline">
              Скинути фільтр
            </Link>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs">Завантаження новин TechOrbit...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="py-20 text-center bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
            <Cpu className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-200">Матеріалів не знайдено</h3>
            <p className="text-xs text-slate-400 mt-1">
              У цій рубриці наразі немає опублікованих статей. Спробуйте іншу категорію або налаштуйте парсер в CMS.
            </p>
          </div>
        ) : (
          <>
            {/* HERO SECTION */}
            {heroArticle && activeCategory === 'all' && !searchFilter && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-slate-900/80 border border-slate-800 rounded-2xl p-6 lg:p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80 text-xs font-semibold">
                      <Flame className="w-3.5 h-3.5" />
                      {currentLang === 'uk' ? 'Головний матеріал' : 'Featured Story'}
                    </span>
                    {heroArticle.category_name_uk && (
                      <span className="text-xs font-medium text-slate-400">
                        {currentLang === 'uk' ? heroArticle.category_name_uk : heroArticle.category_name_en}
                      </span>
                    )}
                  </div>

                  <Link to={`/article/${currentLang === 'uk' ? heroArticle.slug_uk : heroArticle.slug_en}`}>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white group-hover:text-emerald-400 transition-colors leading-tight">
                      {heroArticle.title}
                    </h2>
                  </Link>

                  <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">
                    {heroArticle.excerpt}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{heroArticle.author_name || 'Редакція TechOrbit'}</span>
                    </div>
                    {heroArticle.source_name && (
                      <div className="flex items-center gap-1 text-slate-400">
                        <span>Першоджерело:</span>
                        <span className="font-semibold text-slate-300">{heroArticle.source_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(heroArticle.created_at).toLocaleDateString(currentLang === 'uk' ? 'uk-UA' : 'en-US')}</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <Link
                    to={`/article/${currentLang === 'uk' ? heroArticle.slug_uk : heroArticle.slug_en}`}
                    className="block rounded-xl overflow-hidden aspect-[16/10] bg-slate-950 relative border border-slate-800"
                  >
                    <img
                      src={
                        heroArticle.featured_image_url ||
                        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&h=680&fit=crop&q=80'
                      }
                      alt={heroArticle.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </Link>
                </div>
              </div>
            )}

            {/* SECONDARY STORIES 3-COL */}
            {secondaryArticles.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>{currentLang === 'uk' ? 'В центрі уваги' : 'Trending Headlines'}</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {secondaryArticles.map(art => {
                    const slug = currentLang === 'uk' ? art.slug_uk : art.slug_en;
                    return (
                      <div
                        key={art.id}
                        className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all group flex flex-col"
                      >
                        <Link to={`/article/${slug}`} className="aspect-[16/9] block overflow-hidden bg-slate-950">
                          <img
                            src={
                              art.featured_image_url ||
                              'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&h=450&fit=crop&q=80'
                            }
                            alt={art.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </Link>
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                              {currentLang === 'uk' ? art.category_name_uk : art.category_name_en}
                            </span>
                            <Link to={`/article/${slug}`}>
                              <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors line-clamp-2">
                                {art.title}
                              </h4>
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
              </div>
            )}

            {/* FEED SECTION WITH SIDEBAR */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
              {/* Main List */}
              <div className="lg:col-span-8 space-y-6">
                <h3 className="text-base font-bold text-white">
                  {currentLang === 'uk' ? 'Свіжі публікації' : 'Latest Feed'}
                </h3>

                <div className="divide-y divide-slate-800/80">
                  {articles.map(art => {
                    const slug = currentLang === 'uk' ? art.slug_uk : art.slug_en;
                    return (
                      <article key={art.id} className="py-5 first:pt-0 flex flex-col sm:flex-row gap-5 group">
                        <Link
                          to={`/article/${slug}`}
                          className="sm:w-48 aspect-[16/10] shrink-0 rounded-lg overflow-hidden bg-slate-950 border border-slate-800"
                        >
                          <img
                            src={
                              art.featured_image_url ||
                              'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=380&fit=crop&q=80'
                            }
                            alt={art.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </Link>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-emerald-400">
                              {currentLang === 'uk' ? art.category_name_uk : art.category_name_en}
                            </span>
                            {art.source_name && (
                              <span className="text-[11px] text-slate-500">
                                via {art.source_name}
                              </span>
                            )}
                          </div>

                          <Link to={`/article/${slug}`}>
                            <h4 className="font-bold text-base text-white group-hover:text-emerald-400 transition-colors leading-snug">
                              {art.title}
                            </h4>
                          </Link>

                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{art.excerpt}</p>

                          <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                            <span>{art.author_name || 'TechOrbit'}</span>
                            <span>•</span>
                            <span>{new Date(art.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-4 space-y-6">
                {/* About widget */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-emerald-500 flex items-center justify-center text-white">
                      <Cpu className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-sm text-white">TechOrbit Media</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Спеціалізований агрегатор та редакційна система для моніторингу новин технологій зі США, Європи та Азії з автентичним перекладом і фактчекінгом.
                  </p>
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-emerald-400 font-medium">
                    100% перевірені першоджерела за принципом Fair Use
                  </div>
                </div>

                {/* Sidebar Ad Slot */}
                {sidebarAd && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2">
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      Реклама
                    </span>
                    <h5 className="text-xs font-bold text-slate-200">{sidebarAd.name}</h5>
                    {sidebarAd.fallback_image_url && (
                      <a href={sidebarAd.fallback_link || '#'} target="_blank" rel="noreferrer" className="block pt-1">
                        <img
                          src={sidebarAd.fallback_image_url}
                          alt="Ad sponsor"
                          className="rounded-lg w-full object-cover"
                        />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
