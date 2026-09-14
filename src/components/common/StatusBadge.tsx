import { ArticleStatus } from '../../types.ts';

interface StatusBadgeProps {
  status: ArticleStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const configs: Record<ArticleStatus, { label: string; bg: string; text: string; border: string }> = {
    DRAFT: {
      label: 'Чернетка',
      bg: 'bg-slate-800/80',
      text: 'text-slate-300',
      border: 'border-slate-700'
    },
    IMPORTED: {
      label: 'Імпортовано',
      bg: 'bg-cyan-950/60',
      text: 'text-cyan-400',
      border: 'border-cyan-800/50'
    },
    TRANSLATED: {
      label: 'Перекладено',
      bg: 'bg-indigo-950/60',
      text: 'text-indigo-300',
      border: 'border-indigo-800/50'
    },
    PENDING_REVIEW: {
      label: 'Очікує модерації',
      bg: 'bg-amber-950/60',
      text: 'text-amber-400',
      border: 'border-amber-800/50'
    },
    APPROVED: {
      label: 'Схвалено',
      bg: 'bg-emerald-950/60',
      text: 'text-emerald-400',
      border: 'border-emerald-800/50'
    },
    PUBLISHED: {
      label: 'Опубліковано',
      bg: 'bg-emerald-600/20',
      text: 'text-emerald-300',
      border: 'border-emerald-500/40'
    },
    ARCHIVED: {
      label: 'В архіві',
      bg: 'bg-rose-950/60',
      text: 'text-rose-400',
      border: 'border-rose-800/50'
    }
  };

  const config = configs[status] || configs.DRAFT;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${config.bg} ${config.text} ${config.border}`}
    >
      {config.label}
    </span>
  );
}
