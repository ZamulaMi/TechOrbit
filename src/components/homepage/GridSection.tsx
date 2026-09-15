import { Link } from 'react-router-dom';
import { Calendar, Eye, ArrowRight, Award, Cpu } from 'lucide-react';
import { Article, Language } from '../../types.ts';

interface GridSectionProps {
  title: string;
  articles: Article[];
  currentLang: Language;
}

export function GridSection({ title, articles, currentLang }: GridSectionProps) {
  if (articles.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span>{title}</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map(article => {
          const slug = currentLang === 'uk' ? article.slug_uk : article.slug_en;
          const cat = currentLang === 'uk' ? article.category_name_uk : article.category_name_en;

          return (
            <article
              key={article.id}
              className="group flex flex-col bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all duration-300 hover:shadow-xl hover:shadow-black/40"
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
                  <div className="w-full h-full flex items-center justify-center text-slate-700">
                    <Cpu className="w-10 h-10" />
                  </div>
                )}

                {cat && (
                  <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-emerald-400 border border-emerald-800/60 font-mono text-[11px] font-bold">
                    {cat}
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
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {new Date(article.published_at || article.created_at).toLocaleDateString(
                        currentLang === 'uk' ? 'uk-UA' : 'en-US',
                        { month: 'short', day: 'numeric' }
                      )}
                    </span>
                    {article.views_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3 text-slate-500" />
                        {article.views_count}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                    <Link to={`/${currentLang}/article/${slug}`}>{article.title}</Link>
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-500">{article.author_name || 'TechOrbit'}</span>
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
    </section>
  );
}
