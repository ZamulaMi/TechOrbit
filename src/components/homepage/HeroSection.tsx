import { Link } from 'react-router-dom';
import { Clock, Eye, Calendar, Sparkles, ArrowRight, ShieldCheck, Flame } from 'lucide-react';
import { Article, Language } from '../../types.ts';

interface HeroSectionProps {
  title: string;
  articles: Article[];
  currentLang: Language;
}

export function HeroSection({ title, articles, currentLang }: HeroSectionProps) {
  if (articles.length === 0) return null;

  const lead = articles[0];
  const leadSlug = currentLang === 'uk' ? lead.slug_uk : lead.slug_en;
  const leadCat = currentLang === 'uk' ? lead.category_name_uk : lead.category_name_en;

  const sideArticles = articles.slice(1, 4);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span>{title}</span>
        </h2>
        <Link
          to={`/${currentLang}/news`}
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono"
        >
          <span>{currentLang === 'uk' ? 'Всі матеріали' : 'All stories'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lead Main Article */}
        <div className="lg:col-span-8 group relative flex flex-col justify-end overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-all duration-300 min-h-[380px] md:min-h-[480px]">
          {/* Background image & gradient overlay */}
          <div className="absolute inset-0 z-0">
            {lead.featured_image_url ? (
              <img
                src={lead.featured_image_url}
                alt={lead.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="eager"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-slate-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
          </div>

          {/* Lead Content */}
          <div className="relative z-10 p-6 md:p-8 space-y-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              {leadCat && (
                <span className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold font-mono text-xs shadow-md">
                  {leadCat}
                </span>
              )}
              {lead.review_score && (
                <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 text-emerald-400 border border-emerald-500/40 font-mono text-xs font-bold">
                  Score: {lead.review_score.toFixed(1)}/10
                </span>
              )}
              <span className="text-xs text-slate-300 font-mono flex items-center gap-1 bg-slate-950/60 backdrop-blur-sm px-2.5 py-0.5 rounded-md">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {new Date(lead.published_at || lead.created_at).toLocaleDateString(
                  currentLang === 'uk' ? 'uk-UA' : 'en-US',
                  { month: 'short', day: 'numeric', year: 'numeric' }
                )}
              </span>
            </div>

            <h3 className="text-xl md:text-3xl font-black text-white group-hover:text-emerald-300 transition-colors leading-tight">
              <Link to={`/${currentLang}/article/${leadSlug}`}>{lead.title}</Link>
            </h3>

            <p className="text-xs md:text-sm text-slate-300 line-clamp-2 max-w-3xl leading-relaxed">
              {lead.excerpt}
            </p>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium text-slate-300">
                {lead.author_name || (currentLang === 'uk' ? 'Редакція TechOrbit' : 'TechOrbit Editorial')}
              </span>
              <Link
                to={`/${currentLang}/article/${leadSlug}`}
                className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform"
              >
                <span>{currentLang === 'uk' ? 'Читати повністю' : 'Read story'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Side Stack Articles */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-4">
          {sideArticles.map(article => {
            const slug = currentLang === 'uk' ? article.slug_uk : article.slug_en;
            const cat = currentLang === 'uk' ? article.category_name_uk : article.category_name_en;

            return (
              <article
                key={article.id}
                className="group flex-1 flex flex-col justify-between p-4 bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all hover:bg-slate-900"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    {cat && <span className="text-emerald-400 font-semibold">{cat}</span>}
                    <span>
                      {new Date(article.published_at || article.created_at).toLocaleDateString(
                        currentLang === 'uk' ? 'uk-UA' : 'en-US',
                        { month: 'short', day: 'numeric' }
                      )}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                    <Link to={`/${currentLang}/article/${slug}`}>{article.title}</Link>
                  </h4>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <span>{article.author_name || 'TechOrbit'}</span>
                  {article.views_count > 0 && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Eye className="w-3 h-3" />
                      {article.views_count}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
