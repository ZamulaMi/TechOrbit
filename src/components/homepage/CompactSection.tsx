import { Link } from 'react-router-dom';
import { Flame, Eye, Calendar, ArrowRight } from 'lucide-react';
import { Article, Language } from '../../types.ts';

interface CompactSectionProps {
  title: string;
  articles: Article[];
  currentLang: Language;
}

export function CompactSection({ title, articles, currentLang }: CompactSectionProps) {
  if (articles.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-400" />
          <span>{title}</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {articles.map((article, idx) => {
          const slug = currentLang === 'uk' ? article.slug_uk : article.slug_en;
          const cat = currentLang === 'uk' ? article.category_name_uk : article.category_name_en;

          return (
            <article
              key={article.id}
              className="group flex items-start gap-4 p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl hover:border-slate-700 hover:bg-slate-900 transition-all"
            >
              {/* Number ranking */}
              <div className="text-2xl md:text-3xl font-black font-mono text-slate-700 group-hover:text-emerald-400 transition-colors w-8 text-right flex-shrink-0">
                {(idx + 1).toString().padStart(2, '0')}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                  {cat && <span className="text-emerald-400 font-semibold">{cat}</span>}
                  <span>•</span>
                  <span>
                    {new Date(article.published_at || article.created_at).toLocaleDateString(
                      currentLang === 'uk' ? 'uk-UA' : 'en-US',
                      { month: 'short', day: 'numeric' }
                    )}
                  </span>
                  {article.views_count > 0 && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Eye className="w-3 h-3" />
                      {article.views_count}
                    </span>
                  )}
                </div>

                <h3 className="text-sm md:text-base font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2 leading-snug">
                  <Link to={`/${currentLang}/article/${slug}`}>{article.title}</Link>
                </h3>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
