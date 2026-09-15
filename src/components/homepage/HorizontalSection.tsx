import { Link } from 'react-router-dom';
import { Calendar, Eye, ArrowRight, Cpu } from 'lucide-react';
import { Article, Language } from '../../types.ts';

interface HorizontalSectionProps {
  title: string;
  articles: Article[];
  currentLang: Language;
}

export function HorizontalSection({ title, articles, currentLang }: HorizontalSectionProps) {
  if (articles.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span>{title}</span>
        </h2>
      </div>

      <div className="space-y-4">
        {articles.map(article => {
          const slug = currentLang === 'uk' ? article.slug_uk : article.slug_en;
          const cat = currentLang === 'uk' ? article.category_name_uk : article.category_name_en;

          return (
            <article
              key={article.id}
              className="group flex flex-col sm:flex-row gap-5 p-4 bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all hover:bg-slate-900"
            >
              <Link
                to={`/${currentLang}/article/${slug}`}
                className="relative sm:w-64 aspect-video sm:aspect-auto overflow-hidden rounded-xl bg-slate-950 flex-shrink-0"
              >
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
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-md text-emerald-400 font-mono text-[10px] font-bold">
                    {cat}
                  </span>
                )}
              </Link>

              <div className="flex-1 flex flex-col justify-between space-y-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                    <span>
                      {new Date(article.published_at || article.created_at).toLocaleDateString(
                        currentLang === 'uk' ? 'uk-UA' : 'en-US',
                        { month: 'short', day: 'numeric', year: 'numeric' }
                      )}
                    </span>
                    {article.views_count > 0 && <span>• {article.views_count} views</span>}
                  </div>

                  <h3 className="text-base md:text-lg font-bold text-white group-hover:text-emerald-400 transition-colors leading-snug">
                    <Link to={`/${currentLang}/article/${slug}`}>{article.title}</Link>
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{article.author_name || 'TechOrbit'}</span>
                  <Link
                    to={`/${currentLang}/article/${slug}`}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>{currentLang === 'uk' ? 'Читати' : 'Read'}</span>
                    <ArrowRight className="w-3 h-3" />
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
