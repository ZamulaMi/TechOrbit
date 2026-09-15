import { useState, useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { api } from '../../api/client.ts';
import { AdSlot } from '../../types.ts';

interface AdSlotUnitProps {
  position: 'top' | 'after_hero' | 'article_top' | 'article_middle' | 'article_bottom' | 'sidebar' | 'footer' | string;
  className?: string;
  lang?: 'uk' | 'en';
}

// Global cache so we only fetch active slots once per page load
let cachedSlots: AdSlot[] | null = null;
let fetchPromise: Promise<AdSlot[]> | null = null;

export function AdSlotUnit({ position, className = '', lang = 'uk' }: AdSlotUnitProps) {
  const [slot, setSlot] = useState<AdSlot | null>(() => {
    if (cachedSlots) {
      return cachedSlots.find(s => s.position === position && s.is_active) || null;
    }
    return null;
  });
  const [adLoaded, setAdLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Safety check: Never render ads in admin pages or during preview
  const isPreviewOrAdmin =
    typeof window !== 'undefined' &&
    (window.location.pathname.startsWith('/admin') ||
      window.location.search.includes('preview=true'));

  useEffect(() => {
    if (isPreviewOrAdmin) return;

    if (cachedSlots) {
      const match = cachedSlots.find(s => s.position === position && s.is_active);
      setSlot(match || null);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = api.public.getAds().then(slots => {
        cachedSlots = slots;
        return slots;
      }).catch(err => {
        console.warn('Ad slots fetch failed:', err);
        return [];
      });
    }

    fetchPromise.then(slots => {
      const match = slots.find(s => s.position === position && s.is_active);
      setSlot(match || null);
    });
  }, [position, isPreviewOrAdmin]);

  // Load Google AdSense script and push ad if AdSense provider
  useEffect(() => {
    if (!slot || isPreviewOrAdmin || !slot.is_active) return;
    if (slot.provider !== 'adsense') return;

    const pubId = slot.publisher_id || (import.meta as any).env?.VITE_GOOGLE_ADSENSE_PUB_ID || '';
    if (!pubId) return;

    // Ensure AdSense script is in <head>
    const scriptId = 'google-adsense-script';
    let scriptTag = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = scriptId;
      scriptTag.async = true;
      scriptTag.crossOrigin = 'anonymous';
      scriptTag.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(pubId)}`;
      document.head.appendChild(scriptTag);
    }

    // Try pushing to adsbygoogle
    try {
      const w = window as any;
      (w.adsbygoogle = w.adsbygoogle || []).push({});
      setAdLoaded(true);
    } catch {
      // Ignored if adblocker is active
    }
  }, [slot, isPreviewOrAdmin]);

  if (isPreviewOrAdmin || !slot || !slot.is_active) {
    return null;
  }

  // Device responsiveness classes
  // slot.desktop, slot.tablet, slot.mobile
  let responsiveVisibility = '';
  if (!slot.desktop) responsiveVisibility += ' lg:hidden';
  if (!slot.tablet) responsiveVisibility += ' md:max-lg:hidden';
  if (!slot.mobile) responsiveVisibility += ' max-md:hidden';

  const label = lang === 'en' ? 'Advertisement' : 'Реклама';

  return (
    <div
      ref={containerRef}
      id={`ad-slot-${slot.position}`}
      className={`relative w-full my-6 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3 sm:p-4 text-center ${responsiveVisibility} ${className}`}
    >
      <div className="mb-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-500">
        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-400">{label}</span>
        {slot.name && <span className="truncate max-w-[200px] text-slate-500">{slot.name}</span>}
      </div>

      {slot.provider === 'adsense' && slot.publisher_id && slot.ad_slot ? (
        <div className="flex justify-center min-h-[90px] items-center">
          <ins
            className="adsbygoogle"
            style={{ display: 'block', minWidth: '250px' }}
            data-ad-client={slot.publisher_id}
            data-ad-slot={slot.ad_slot}
            data-ad-format={slot.format || 'auto'}
            data-full-width-responsive="true"
          />
        </div>
      ) : slot.fallback_image_url ? (
        <div className="relative group overflow-hidden rounded-xl bg-slate-950 flex flex-col items-center justify-center">
          {slot.fallback_link ? (
            <a
              href={slot.fallback_link}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="block w-full transition-opacity hover:opacity-95"
            >
              <img
                src={slot.fallback_image_url}
                alt={slot.name || label}
                className="w-full max-h-[140px] sm:max-h-[180px] object-cover rounded-xl"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-slate-900/80 backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold text-emerald-400 shadow">
                <span>{lang === 'en' ? 'Learn more' : 'Детальніше'}</span>
                <ExternalLink className="w-3 h-3" />
              </div>
            </a>
          ) : (
            <img
              src={slot.fallback_image_url}
              alt={slot.name || label}
              className="w-full max-h-[140px] sm:max-h-[180px] object-cover rounded-xl"
              referrerPolicy="no-referrer"
            />
          )}
        </div>
      ) : slot.code_snippet ? (
        <div
          className="text-xs text-slate-400 py-2"
          dangerouslySetInnerHTML={{ __html: slot.code_snippet }}
        />
      ) : (
        <div className="py-4 text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-xl">
          {slot.name} ({label})
        </div>
      )}
    </div>
  );
}
