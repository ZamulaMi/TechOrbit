import { Link } from 'react-router-dom';
import { Award, ArrowRight, CheckCircle, Cpu, Star } from 'lucide-react';
import { Article, Language } from '../../types.ts';

interface ThreeColumnSectionProps {
  title: string;
  articles: Article[];
  currentLang: Language;
}

export function ThreeColumnSection({ title, articles, currentLang }: ThreeColumnSectionProps) {
  if (articles.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>{title}</span>
        </h2>
        <Link
          to={`/${currentLang}/reviews`}
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono"
        >
          <span>{currentLang === 'uk' ? 'Всі огляди' : 'All reviews'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {articles.slice(0, 3).map(article => {
          const slug = currentLang === 'uk' ? article.slug_uk : article.slug_en;
          const score = article.review_score || 9.2;
          const cat = currentLang === 'uk' ? article.category_name_uk : article.category_name_en;

          return (
            <article
              key={article.id}
              className="group flex flex-col bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden hover:border-emerald-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-950/20"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
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

                <div className="absolute top-3 right-3 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md border border-emerald-500/40 rounded-xl w-12 h-12 shadow-lg">
                  <span className="text-emerald-400 font-black text-base leading-none">
                    {score.toFixed(1)}
                  </span>
                  <span className="text-[8px] uppercase font-mono text-slate-400 mt-0.5">/10</span>
                </div>

                {cat && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md text-slate-200 border border-slate-700 font-mono text-[11px] font-bold">
                    {cat}
                  </span>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                    <Link to={`/${currentLang}/article/${slug}`}>{article.title}</Link>
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{currentLang === 'uk' ? 'Лабораторний тест' : 'Lab Tested'}</span>
                  </div>
                  <Link
                    to={`/${currentLang}/article/${slug}`}
                    className="text-xs font-semibold text-white group-hover:text-emerald-400 flex items-center gap-1 transition-colors"
                  >
                    <span>{currentLang === 'uk' ? 'Вердикт' : 'Verdict'}</span>
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
