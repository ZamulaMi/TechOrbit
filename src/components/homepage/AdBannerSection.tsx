import { ExternalLink } from 'lucide-react';
import { AdSlot } from '../../types.ts';

interface AdBannerSectionProps {
  adSlot?: AdSlot;
}

export function AdBannerSection({ adSlot }: AdBannerSectionProps) {
  if (!adSlot || !adSlot.is_active) return null;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          Спонсорський блок
        </span>
        <span className="font-semibold text-slate-200">{adSlot.name}</span>
      </div>

      {adSlot.fallback_link && (
        <a
          href={adSlot.fallback_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold transition-colors"
        >
          <span>Дізнатися більше</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}
