import { useState, useEffect } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import { Cpu, Sparkles, Filter, ExternalLink, RefreshCw } from 'lucide-react';
import { api } from '../../api/client.ts';
import { Article, Category, Language, HomepageSection as IHomepageSection, AdSlot } from '../../types.ts';
import { HeroSection } from '../../components/homepage/HeroSection.tsx';
import { TwoColumnSection } from '../../components/homepage/TwoColumnSection.tsx';
import { ThreeColumnSection } from '../../components/homepage/ThreeColumnSection.tsx';
import { GridSection } from '../../components/homepage/GridSection.tsx';
import { HorizontalSection } from '../../components/homepage/HorizontalSection.tsx';
import { CompactSection } from '../../components/homepage/CompactSection.tsx';
import { NewsletterSection } from '../../components/homepage/NewsletterSection.tsx';
import { AdBannerSection } from '../../components/homepage/AdBannerSection.tsx';
import { SeoHead } from '../../components/seo/SeoHead.tsx';
import { AdSlotUnit } from '../../components/ads/AdSlotUnit.tsx';

interface HomePageProps {
  currentLang: Language;
  categories: Category[];
}

interface SectionWithArticles {
  section: IHomepageSection;
  articles: Article[];
}

export function HomePage({ currentLang, categories }: HomePageProps) {
  const { lang } = useParams<{ lang?: string }>();
  const activeLang: Language = lang === 'en' || lang === 'uk' ? lang : currentLang;

  const [searchParams] = useSearchParams();
  const searchFilter = searchParams.get('q') || '';

  const [sectionsData, setSectionsData] = useState<SectionWithArticles[]>([]);
  const [ads, setAds] = useState<AdSlot[]>([]);
  const [seoData, setSeoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomepage();
  }, [activeLang]);

  const loadHomepage = async () => {
    setLoading(true);
    try {
      // 1. Fetch configured homepage sections, active ads, and SEO data
      const [configuredSections, activeAds, seoRes] = await Promise.all([
        api.public.getHomepageSections(),
        api.public.getAds(),
        api.public.getSeoGlobal().catch(() => null)
      ]);

      setAds(activeAds);
      setSeoData(seoRes);

      // 2. For each active section, fetch its configured articles from DB
      const activeSections = configuredSections.filter(s => s.is_active);

      const resolvedSections = await Promise.all(
        activeSections.map(async sec => {
          if (sec.section_type === 'newsletter' || sec.section_type === 'advertisement') {
            return { section: sec, articles: [] };
          }

          try {
            const articleRes = await api.public.getArticles({
              lang: activeLang,
              categoryId: sec.category_id || undefined,
              limit: sec.article_count || 6,
              sortBy: sec.sort_by || 'latest',
              type: sec.section_type === 'reviews' ? 'review' : sec.section_type === 'latest_news' ? 'news' : 'all'
            });
            return { section: sec, articles: articleRes.articles };
          } catch (e) {
            console.error(`Failed to load articles for section ${sec.id}`, e);
            return { section: sec, articles: [] };
          }
        })
      );

      setSectionsData(resolvedSections);
    } catch (err) {
      console.error('Failed to load homepage configuration', err);
    } finally {
      setLoading(false);
    }
  };

  const baseUrl = seoData?.baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://techorbit.media');
  const homeTitle = activeLang === 'uk'
    ? 'TechOrbit — Головні новини технологій, гаджетів та штучного інтелекту'
    : 'TechOrbit — Global Tech News, Gadgets & Artificial Intelligence';
  const homeDesc = activeLang === 'uk'
    ? 'Незалежне технологічне медіа України. Актуальні огляди смартфонів, гаджетів, індустрія штучного інтелекту та аналітика.'
    : 'Independent technology publication covering smartphone reviews, breakthrough gadgets, and AI innovation.';

  const homeHreflangs = [
    { lang: 'uk', href: `${baseUrl}/uk` },
    { lang: 'en', href: `${baseUrl}/en` },
    { lang: 'x-default', href: `${baseUrl}/uk` }
  ];

  const homeJsonLd = [
    seoData?.orgJsonLd,
    activeLang === 'uk' ? seoData?.websiteJsonLdUk : seoData?.websiteJsonLdEn
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Dynamic SEO Meta & JSON-LD Structured Data */}
      <SeoHead
        title={homeTitle}
        description={homeDesc}
        canonical={`${baseUrl}/${activeLang}`}
        robots="index, follow"
        ogTitle={homeTitle}
        ogDescription={homeDesc}
        ogUrl={`${baseUrl}/${activeLang}`}
        ogType="website"
        twitterTitle={homeTitle}
        twitterDescription={homeDesc}
        hreflangs={homeHreflangs}
        jsonLd={homeJsonLd}
        lang={activeLang}
      />

      {/* Top Banner Ad Placement */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <AdSlotUnit position="top" lang={activeLang} />
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800/80">
          <Link
            to={`/${activeLang}`}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 cursor-pointer"
          >
            {activeLang === 'uk' ? 'Головна' : 'Home'}
          </Link>
          <Link
            to={`/${activeLang}/news`}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            {activeLang === 'uk' ? 'Новини' : 'News'}
          </Link>
          <Link
            to={`/${activeLang}/reviews`}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            {activeLang === 'uk' ? 'Огляди' : 'Reviews'}
          </Link>
          {categories.map(cat => {
            const name = activeLang === 'uk' ? cat.name_uk : cat.name_en;
            const slug = activeLang === 'uk' ? cat.slug_uk : cat.slug_en;
            return (
              <Link
                key={cat.id}
                to={`/${activeLang}/category/${slug}`}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
              >
                {name}
              </Link>
            );
          })}
        </div>

        {/* Loading skeleton state */}
        {loading ? (
          <div className="space-y-12 py-8 animate-pulse">
            <div className="h-96 bg-slate-900/80 rounded-3xl border border-slate-800" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-slate-900/80 rounded-2xl border border-slate-800" />
              ))}
            </div>
          </div>
        ) : sectionsData.length === 0 ? (
          <div className="py-20 text-center bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 p-8 space-y-3">
            <Cpu className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-slate-200">
              {activeLang === 'uk' ? 'Секції головної сторінки налаштовуються' : 'Homepage sections being configured'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {activeLang === 'uk'
                ? 'Ви можете додати або налаштувати секції в адмін-панелі (Admin → Homepage).'
                : 'Configure or reorder modular sections in the Admin Homepage Builder.'}
            </p>
            <Link
              to="/admin/homepage"
              className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
            >
              Відкрити Homepage Builder
            </Link>
          </div>
        ) : (
          /* Modular Sections Rendered in Configured Order */
          sectionsData.map(({ section, articles }) => {
            const title = activeLang === 'uk' ? section.title_uk : section.title_en;

            // Device responsiveness classes from configuration
            const deviceClass = `${section.desktop_visible ? 'block' : 'hidden md:hidden'} ${
              section.mobile_visible ? 'block' : 'hidden sm:block'
            }`;

            if (section.section_type === 'newsletter') {
              return (
                <div key={section.id} className={deviceClass}>
                  <NewsletterSection currentLang={activeLang} />
                </div>
              );
            }

            if (section.section_type === 'advertisement') {
              const middleAd = ads.find(a => a.is_active && a.position !== 'header_leaderboard');
              return (
                <div key={section.id} className={deviceClass}>
                  <AdBannerSection adSlot={middleAd} />
                </div>
              );
            }

            // Render based on configured layout
            switch (section.layout) {
              case 'hero':
                return (
                  <div key={section.id} className={deviceClass}>
                    <HeroSection title={title} articles={articles} currentLang={activeLang} />
                    <AdSlotUnit position="after_hero" lang={activeLang} />
                  </div>
                );
              case 'two-column':
                return (
                  <div key={section.id} className={deviceClass}>
                    <TwoColumnSection title={title} articles={articles} currentLang={activeLang} />
                  </div>
                );
              case 'three-column':
                return (
                  <div key={section.id} className={deviceClass}>
                    <ThreeColumnSection title={title} articles={articles} currentLang={activeLang} />
                  </div>
                );
              case 'compact':
                return (
                  <div key={section.id} className={deviceClass}>
                    <CompactSection title={title} articles={articles} currentLang={activeLang} />
                  </div>
                );
              case 'horizontal':
              case 'list':
                return (
                  <div key={section.id} className={deviceClass}>
                    <HorizontalSection title={title} articles={articles} currentLang={activeLang} />
                  </div>
                );
              case 'grid':
              default:
                return (
                  <div key={section.id} className={deviceClass}>
                    <GridSection title={title} articles={articles} currentLang={activeLang} />
                  </div>
                );
            }
          })
        )}
      </div>
    </div>
  );
}
