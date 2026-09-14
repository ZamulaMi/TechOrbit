import React from 'react';
import { ExternalLink, ShieldCheck, UserCheck, Calendar, Info, Scale } from 'lucide-react';
import { Article } from '../../types.ts';

interface SourceAttributionProps {
  article: Partial<Article>;
  language?: 'uk' | 'en';
}

export const SourceAttribution: React.FC<SourceAttributionProps> = ({ article, language = 'uk' }) => {
  const isUa = language === 'uk';
  const hasSource = Boolean(article.source_url || article.source_name);

  if (!hasSource && !article.rights_status) {
    return null;
  }

  const getRightsBadge = (status?: string) => {
    switch (status) {
      case 'editorial_original':
        return {
          label: isUa ? 'Оригінальний редакційний матеріал TechOrbit' : 'TechOrbit Editorial Original',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
          icon: ShieldCheck
        };
      case 'curated_translation':
        return {
          label: isUa ? 'Авторизована та верифікована адаптація' : 'Curated & Verified Adaptation',
          color: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
          icon: Scale
        };
      case 'licensed_reprint':
        return {
          label: isUa ? 'Ліцензований передрук' : 'Licensed Syndication',
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
          icon: Scale
        };
      default:
        return {
          label: isUa ? 'Редакційний аналіз джерела' : 'Editorial Source Analysis',
          color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
          icon: Info
        };
    }
  };

  const badge = getRightsBadge(article.rights_status);
  const BadgeIcon = badge.icon;

  return (
    <div
      id="source-attribution-card"
      className="my-8 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 transition-all text-xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200/70 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <BadgeIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {isUa ? 'Джерело та атрибуція матеріалу' : 'Source & Editorial Attribution'}
          </span>
        </div>

        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium border text-[11px] ${badge.color}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-slate-600 dark:text-slate-400">
        {/* Source Name & URL */}
        {article.source_name && (
          <div>
            <span className="block text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 mb-0.5">
              {isUa ? 'Першоджерело' : 'Original Source'}
            </span>
            {article.source_url ? (
              <a
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center space-x-1 font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                <span>{article.source_name}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="font-medium text-slate-800 dark:text-slate-200">{article.source_name}</span>
            )}
          </div>
        )}

        {/* Source Author */}
        {article.source_author && (
          <div>
            <span className="block text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 mb-0.5">
              {isUa ? 'Автор першоджерела' : 'Source Author'}
            </span>
            <div className="flex items-center space-x-1.5 font-medium text-slate-800 dark:text-slate-200">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>{article.source_author}</span>
            </div>
          </div>
        )}

        {/* Source Published Date */}
        {article.source_published_at && (
          <div>
            <span className="block text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 mb-0.5">
              {isUa ? 'Дата публікації в джерелі' : 'Original Published Date'}
            </span>
            <div className="flex items-center space-x-1.5 font-medium text-slate-700 dark:text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{new Date(article.source_published_at).toLocaleDateString(isUa ? 'uk-UA' : 'en-US')}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200/50 dark:border-slate-800/60 leading-relaxed">
        {isUa
          ? 'TechOrbit дотримується міжнародних журналістських стандартів фактчекінгу, поважає авторські права та надає прямі посилання на оригінальні документи, презентації або пресрелізи.'
          : 'TechOrbit adheres to international editorial fact-checking standards, respects intellectual property rights, and references primary announcements and documentation.'}
      </div>
    </div>
  );
};
