import React from 'react';
import { CheckCircle2, AlertCircle, XCircle, Info, ArrowRight } from 'lucide-react';
import { Article, EditorBlock } from '../../types.ts';

interface PublishChecklistProps {
  article: Partial<Article>;
  blocks?: EditorBlock[];
  hasEnTranslation?: boolean;
  onFixField?: (fieldName: string) => void;
}

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  isReady: boolean;
  isWarning?: boolean; // warning doesn't strictly block, but should be resolved
  fieldTarget?: string;
}

export const PublishChecklist: React.FC<PublishChecklistProps> = ({
  article,
  blocks = [],
  hasEnTranslation = false,
  onFixField
}) => {
  // Title validation
  const titleReady = Boolean(article.title && article.title.trim().length >= 10);

  // Excerpt validation
  const excerptReady = Boolean(article.excerpt && article.excerpt.trim().length >= 20);

  // Content or Blocks validation
  const contentReady = Boolean(
    (article.content && article.content.trim().length >= 50) ||
    (blocks.length > 0 && blocks.some(b => b.visible !== false))
  );

  // Category validation
  const categoryReady = Boolean(article.category_id);

  // Author validation
  const authorReady = Boolean(article.author_id);

  // Featured image validation
  const imageReady = Boolean(article.featured_image_url);

  // Slugs validation
  const slugUkReady = Boolean(article.slug_uk && article.slug_uk.trim().length >= 3);
  const slugEnReady = Boolean(article.slug_en && article.slug_en.trim().length >= 3);

  // SEO Meta validation
  const seoUkReady = Boolean(
    (article.meta_title_uk || article.title) &&
    (article.meta_desc_uk || article.excerpt)
  );

  // English translation validation
  const enReady = Boolean(hasEnTranslation || article.translation_status === 'COMPLETED');

  // Rights status validation
  const rightsReady = Boolean(article.rights_status);

  const items: ChecklistItem[] = [
    {
      id: 'title',
      label: 'Заголовок статті',
      description: titleReady ? 'Заголовок присутній (≥ 10 символів)' : 'Заголовок закороткий або відсутній',
      isReady: titleReady,
      fieldTarget: 'title'
    },
    {
      id: 'excerpt',
      label: 'Короткий опис (Excerpt)',
      description: excerptReady ? 'Лід-абзац заповнений' : 'Рекомендується лід-абзац від 20 символів',
      isReady: excerptReady,
      fieldTarget: 'excerpt'
    },
    {
      id: 'content',
      label: 'Зміст або структурні блоки',
      description: contentReady ? `Зміст валідний (${blocks.length} блоків)` : 'Стаття не містить змісту чи блоків',
      isReady: contentReady,
      fieldTarget: 'content'
    },
    {
      id: 'category',
      label: 'Рубрика / Категорія',
      description: categoryReady ? 'Рубрику обрано' : 'Необхідно обрати тематичну рубрику',
      isReady: categoryReady,
      fieldTarget: 'category_id'
    },
    {
      id: 'author',
      label: 'Автор або редактор',
      description: authorReady ? 'Автора призначено' : 'Оберіть автора публікації',
      isReady: authorReady,
      fieldTarget: 'author_id'
    },
    {
      id: 'image',
      label: 'Головна обкладинка (Featured Image)',
      description: imageReady ? 'Обкладинку додано' : 'Бажано додати якісну обкладинку (16:9)',
      isReady: imageReady,
      isWarning: true,
      fieldTarget: 'featured_image_url'
    },
    {
      id: 'slug',
      label: 'ЧПУ посилання (URL Slugs)',
      description: (slugUkReady && slugEnReady) ? 'Український та англійський slug згенеровано' : 'Відсутній slug_uk або slug_en',
      isReady: slugUkReady && slugEnReady,
      fieldTarget: 'slug_uk'
    },
    {
      id: 'seo',
      label: 'SEO метадані (Title & Description)',
      description: seoUkReady ? 'SEO мета-теги готові' : 'Заповніть Meta Title та Description для пошуковиків',
      isReady: seoUkReady,
      fieldTarget: 'meta_title_uk'
    },
    {
      id: 'translation',
      label: 'Англійська версія (EN)',
      description: enReady ? 'Переклад EN готовий або затверджений' : 'Переклад на англійську ще в процесі',
      isReady: enReady,
      isWarning: true,
      fieldTarget: 'translation'
    },
    {
      id: 'rights',
      label: 'Правовий статус / Атрибуція',
      description: rightsReady ? 'Статус авторських прав вказано' : 'Оберіть статус (оригінал / адаптація / джерело)',
      isReady: rightsReady,
      fieldTarget: 'rights_status'
    }
  ];

  const criticalErrors = items.filter(i => !i.isReady && !i.isWarning);
  const warnings = items.filter(i => !i.isReady && i.isWarning);
  const isPublishable = criticalErrors.length === 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm" id="publish-checklist">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <span>Чекліст готовності до публікації</span>
        </h4>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isPublishable
              ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300'
          }`}
        >
          {isPublishable ? 'Готово до випуску' : `Залишилось помилок: ${criticalErrors.length}`}
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
        {items.map(item => {
          let Icon = CheckCircle2;
          let colorClass = 'text-emerald-500';

          if (!item.isReady) {
            if (item.isWarning) {
              Icon = AlertCircle;
              colorClass = 'text-amber-500';
            } else {
              Icon = XCircle;
              colorClass = 'text-rose-500';
            }
          }

          return (
            <div key={item.id} className="py-2.5 flex items-start justify-between group">
              <div className="flex items-start space-x-2.5">
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${colorClass}`} />
                <div>
                  <span
                    className={`text-xs font-medium ${
                      item.isReady
                        ? 'text-slate-700 dark:text-slate-300'
                        : item.isWarning
                        ? 'text-amber-800 dark:text-amber-300'
                        : 'text-rose-700 dark:text-rose-300 font-semibold'
                    }`}
                  >
                    {item.label}
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.description}</p>
                </div>
              </div>

              {!item.isReady && onFixField && item.fieldTarget && (
                <button
                  type="button"
                  onClick={() => onFixField(item.fieldTarget!)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-cyan-600 hover:text-cyan-700 flex items-center space-x-1"
                >
                  <span>Виправити</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!isPublishable && (
        <div className="mt-4 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 flex items-center space-x-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>Кнопка «Опублікувати» стане активною після виправлення всіх обовʼязкових полів.</span>
        </div>
      )}
    </div>
  );
};
