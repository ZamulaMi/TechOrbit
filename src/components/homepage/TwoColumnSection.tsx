import { Link } from 'react-router-dom';
import { Calendar, Eye, ArrowRight, Cpu } from 'lucide-react';
import { Article, Language } from '../../types.ts';

interface TwoColumnSectionProps {
  title: string;
  articles: Article[];
  currentLang: Language;
}

export function TwoColumnSection({ title, articles, currentLang }: TwoColumnSectionProps) {
  if (articles.length === 0) return null;

  const lead = articles[0];
  const leadSlug = currentLang === 'uk' ? lead.slug_uk : lead.slug_en;
  const leadCat = currentLang === 'uk' ? lead.category_name_uk : lead.category_name_en;

  const sideArticles = articles.slice(1);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span>{title}</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left main lead */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden group flex flex-col justify-between hover:border-slate-700 transition-all">
          <Link to={`/${currentLang}/article/${leadSlug}`} className="block relative aspect-video overflow-hidden bg-slate-950">
            {lead.featured_image_url ? (
              <img
                src={lead.featured_image_url}
                alt={lead.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-700">
                <Cpu className="w-12 h-12" />
              </div>
            )}
            {leadCat && (
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md text-emerald-400 font-mono text-xs font-bold border border-emerald-800/60">
                {leadCat}
              </span>
            )}
          </Link>

          <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span>
                  {new Date(lead.published_at || lead.created_at).toLocaleDateString(
                    currentLang === 'uk' ? 'uk-UA' : 'en-US',
                    { month: 'short', day: 'numeric', year: 'numeric' }
                  )}
                </span>
                {lead.views_count > 0 && <span>• {lead.views_count} views</span>}
              </div>

              <h3 className="text-xl font-black text-white group-hover:text-emerald-300 transition-colors leading-snug">
                <Link to={`/${currentLang}/article/${leadSlug}`}>{lead.title}</Link>
              </h3>

              <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                {lead.excerpt}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">{lead.author_name || 'TechOrbit'}</span>
              <Link
                to={`/${currentLang}/article/${leadSlug}`}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
              >
                <span>{currentLang === 'uk' ? 'Читати' : 'Read'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right column list */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3">
          {sideArticles.map(article => {
            const slug = currentLang === 'uk' ? article.slug_uk : article.slug_en;
            const cat = currentLang === 'uk' ? article.category_name_uk : article.category_name_en;

            return (
              <article
                key={article.id}
                className="group p-4 bg-slate-900/60 border border-slate-800 rounded-2xl hover:border-slate-700 hover:bg-slate-900 transition-all flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
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
                </div>

                <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{article.author_name || 'TechOrbit'}</span>
                  <Link
                    to={`/${currentLang}/article/${slug}`}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                  >
                    <span>Читати</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
