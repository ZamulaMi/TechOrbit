import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, User, ExternalLink, ShieldCheck, Share2, ArrowLeft, Globe, Bookmark } from 'lucide-react';
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

  const [article, setArticle] = useState<Article | null>(null);
  const [translations, setTranslations] = useState<ArticleTranslation[]>([]);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs">Завантаження статті TechOrbit...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-[70vh] bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Статтю не знайдено</h2>
        <p className="text-xs text-slate-400 mb-6">
          Матеріал було переміщено або він знаходиться на етапі модерації в CMS.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Повернутися на головну</span>
        </Link>
      </div>
    );
  }

  // Format paragraphs
  const paragraphs = article.content ? article.content.split('\n\n') : [];

  return (
    <article className="min-h-screen bg-slate-950 text-slate-100 py-8">
      {/* Inject SEO JSON-LD schema */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {/* Navigation & Breadcrumb */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <Link to="/" className="inline-flex items-center gap-1.5 hover:text-emerald-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>{currentLang === 'uk' ? 'Усі новини' : 'All Stories'}</span>
          </Link>

          {/* In-Article Language Switcher */}
          {translations.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
              <Globe className="w-3.5 h-3.5 text-slate-400 ml-1" />
              <span className="text-[11px] text-slate-400">Мова:</span>
              <button
                type="button"
                onClick={() => onLanguageChange('uk')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  currentLang === 'uk' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Українська
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('en')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  currentLang === 'en' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
            </div>
          )}
        </div>

        {/* Article Header */}
        <header className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80">
              {activeLang === 'uk' ? article.category_name_uk : article.category_name_en}
            </span>
            {article.source_name && (
              <span className="text-xs text-slate-400">
                {activeLang === 'uk' ? 'За матеріалами' : 'Based on reporting by'}{' '}
                <span className="font-semibold text-slate-200">{article.source_name}</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight">
            {article.title}
          </h1>

          {article.subtitle && (
            <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed">
              {article.subtitle}
            </p>
          )}

          {/* Meta bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-y border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-slate-200">
                  {article.author_name || (activeLang === 'uk' ? 'Редакція TechOrbit' : 'TechOrbit Editorial')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {new Date(article.published_at || article.created_at).toLocaleDateString(
                    activeLang === 'uk' ? 'uk-UA' : 'en-US',
                    { day: 'numeric', month: 'long', year: 'numeric' }
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-800 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copied ? 'Посилання скопійовано!' : 'Поділитися'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        {article.featured_image_url && (
          <div className="rounded-2xl overflow-hidden aspect-[16/9] bg-slate-950 border border-slate-800">
            <img
              src={article.featured_image_url}
              alt={article.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Lead Excerpt */}
        {article.excerpt && (
          <div className="p-5 rounded-xl bg-slate-900/90 border-l-4 border-emerald-500 text-sm font-medium text-slate-200 leading-relaxed">
            {article.excerpt}
          </div>
        )}

        {/* Body Content */}
        <div className="prose prose-invert max-w-none space-y-5 text-sm sm:text-base leading-relaxed text-slate-300">
          {paragraphs.map((p, idx) => {
            if (p.startsWith('- ') || p.startsWith('• ')) {
              const items = p.split('\n');
              return (
                <ul key={idx} className="list-disc pl-5 space-y-1.5 text-slate-300 text-sm sm:text-base">
                  {items.map((it, i) => (
                    <li key={i}>{it.replace(/^[-•]\s*/, '')}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={idx} className="whitespace-pre-line">
                {p}
              </p>
            );
          })}
        </div>

        {/* Source Attribution Component */}
        <SourceAttribution article={article} language={activeLang} />
      </div>
    </article>
  );
}
