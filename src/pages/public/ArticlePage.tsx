import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Clock,
  User,
  ExternalLink,
  ShieldCheck,
  Share2,
  ArrowLeft,
  Globe,
  Award,
  Eye,
  ArrowRight,
  Sparkles,
  Check
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { Article, ArticleTranslation, Language } from '../../types.ts';
import { SourceAttribution } from '../../components/article/SourceAttribution.tsx';

interface ArticlePageProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

export function ArticlePage({ currentLang, onLanguageChange }: ArticlePageProps) {
  const { slug, lang } = useParams<{ slug: string; lang?: string }>();
  const activeLang: Language = lang === 'en' || lang === 'uk' ? lang : currentLang;
  const navigate = useNavigate();

  const [article, setArticle] = useState<Article | null>(null);
  const [translations, setTranslations] = useState<ArticleTranslation[]>([]);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [jsonLd, setJsonLd] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.public
      .getArticle(slug, activeLang)
      .then(res => {
        setArticle(res.article);
        setTranslations(res.translations);
        setJsonLd(res.jsonLd);

        // Fetch related articles
        if (res.article?.id) {
          api.public
            .getRelated(res.article.id, 3, activeLang)
            .then(related => setRelatedArticles(related))
            .catch(() => setRelatedArticles([]));
        }
      })
      .catch(err => {
        console.error('Failed to load article', err);
        setArticle(null);
      })
      .finally(() => setLoading(false));
  }, [slug, activeLang]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLanguageSwitch = (targetLang: Language) => {
    if (targetLang === activeLang) return;
    onLanguageChange(targetLang);

    // Look for translation record slug
    const targetTranslation = translations.find(t => t.language === targetLang);
    const targetSlug =
      targetTranslation?.slug ||
      (targetLang === 'uk' ? article?.slug_uk : article?.slug_en) ||
      slug;

    navigate(`/${targetLang}/article/${targetSlug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono">Завантаження матеріалу TechOrbit...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-[70vh] bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Статтю не знайдено</h2>
        <p className="text-xs text-slate-400 mb-6">
          Матеріал було переміщено або він знаходиться на етапі модерації в редакційній системі.
        </p>
        <Link
          to={`/${activeLang}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Повернутися на головну</span>
        </Link>
      </div>
    );
  }

  // Calculate reading time (approx 180 words/min)
  const wordCount = (article.content || '').split(/\s+/).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 180));
  const paragraphs = article.content ? article.content.split('\n\n') : [];

  return (
    <article className="min-h-screen bg-slate-950 text-slate-100 py-8 md:py-12">
      {/* Inject SEO JSON-LD schema */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {/* Navigation & Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 border-b border-slate-900 pb-4">
          <div className="flex items-center gap-2 font-mono">
            <Link to={`/${activeLang}`} className="hover:text-emerald-400 transition-colors">
              {activeLang === 'uk' ? 'Головна' : 'Home'}
            </Link>
            <span>/</span>
            <Link
              to={article.article_type === 'review' ? `/${activeLang}/reviews` : `/${activeLang}/news`}
              className="hover:text-emerald-400 transition-colors"
            >
              {article.article_type === 'review'
                ? activeLang === 'uk' ? 'Огляди' : 'Reviews'
                : activeLang === 'uk' ? 'Новини' : 'News'}
            </Link>
          </div>

          {/* In-Article Language Switcher */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            <Globe className="w-3.5 h-3.5 text-emerald-400 ml-1" />
            <button
              type="button"
              onClick={() => handleLanguageSwitch('uk')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold font-mono transition-colors cursor-pointer ${
                activeLang === 'uk' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              UA
            </button>
            <button
              type="button"
              onClick={() => handleLanguageSwitch('en')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold font-mono transition-colors cursor-pointer ${
                activeLang === 'en' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Article Header */}
        <header className="space-y-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/80 font-mono">
              {activeLang === 'uk' ? article.category_name_uk : article.category_name_en}
            </span>

            {article.review_score && (
              <span className="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-mono flex items-center gap-1 shadow-sm">
                <Award className="w-3.5 h-3.5" />
                <span>Оцінка редакції: {article.review_score.toFixed(1)}/10</span>
              </span>
            )}

            {article.source_name && (
              <span className="text-xs text-slate-400 font-mono">
                {activeLang === 'uk' ? 'За даними:' : 'Source:'}{' '}
                <span className="font-semibold text-slate-200">{article.source_name}</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">
            {article.title}
          </h1>

          {article.subtitle && (
            <p className="text-base sm:text-xl text-slate-300 font-medium leading-relaxed">
              {article.subtitle}
            </p>
          )}

          {/* Meta Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-3.5 border-y border-slate-800 text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-slate-200">
                  {article.author_name || (activeLang === 'uk' ? 'Редакція TechOrbit' : 'TechOrbit Editorial')}
                </span>
              </div>

              <div className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {new Date(article.published_at || article.created_at).toLocaleDateString(
                    activeLang === 'uk' ? 'uk-UA' : 'en-US',
                    { day: 'numeric', month: 'long', year: 'numeric' }
                  )}
                </span>
              </div>

              <span>• {readingTime} {activeLang === 'uk' ? 'хв читання' : 'min read'}</span>

              {article.views_count > 0 && (
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  {article.views_count}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-800 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? (activeLang === 'uk' ? 'Скопійовано!' : 'Link copied!') : (activeLang === 'uk' ? 'Поділитися' : 'Share')}</span>
            </button>
          </div>
        </header>

        {/* Featured Image */}
        {article.featured_image_url && (
          <div className="rounded-3xl overflow-hidden aspect-[16/9] bg-slate-950 border border-slate-800 shadow-2xl">
            <img
              src={article.featured_image_url}
              alt={article.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Excerpt Lead Box */}
        {article.excerpt && (
          <div className="p-6 rounded-2xl bg-slate-900/90 border-l-4 border-emerald-500 text-sm sm:text-base font-medium text-slate-200 leading-relaxed shadow-lg">
            {article.excerpt}
          </div>
        )}

        {/* Body Paragraphs */}
        <div className="space-y-6 text-base md:text-lg leading-relaxed text-slate-300">
          {paragraphs.map((p, idx) => {
            if (p.startsWith('- ') || p.startsWith('• ')) {
              const items = p.split('\n');
              return (
                <ul key={idx} className="list-disc pl-6 space-y-2 text-slate-300">
                  {items.map((it, i) => (
                    <li key={i}>{it.replace(/^[-•]\s*/, '')}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={idx} className="whitespace-pre-line leading-relaxed">
                {p}
              </p>
            );
          })}
        </div>

        {/* Source Attribution Component */}
        <SourceAttribution article={article} language={activeLang} />

        {/* Related Articles Section */}
        {relatedArticles.length > 0 && (
          <div className="pt-12 border-t border-slate-800 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span>{activeLang === 'uk' ? 'Також рекомендуємо прочитати' : 'Related Stories'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {relatedArticles.map(rel => {
                const relSlug = activeLang === 'uk' ? rel.slug_uk : rel.slug_en;
                return (
                  <Link
                    key={rel.id}
                    to={`/${activeLang}/article/${relSlug}`}
                    className="group bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2.5 hover:border-slate-700 transition-all hover:bg-slate-900"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950">
                      {rel.featured_image_url ? (
                        <img
                          src={rel.featured_image_url}
                          alt={rel.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-900" />
                      )}
                    </div>
                    <h4 className="text-xs md:text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                      {rel.title}
                    </h4>
                    <span className="text-[11px] text-slate-500 font-mono block">
                      {new Date(rel.published_at || rel.created_at).toLocaleDateString(
                        activeLang === 'uk' ? 'uk-UA' : 'en-US',
                        { month: 'short', day: 'numeric' }
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
