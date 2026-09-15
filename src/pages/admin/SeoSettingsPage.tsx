import { useState, useEffect, FormEvent } from 'react';
import {
  Globe,
  Search,
  Save,
  Check,
  ExternalLink,
  Shield,
  FileCode,
  Share2,
  RefreshCw,
  Sliders,
  AlertCircle
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { api } from '../../api/client.ts';
import { SeoSetting } from '../../types.ts';

export function SeoSettingsPage() {
  const [seoList, setSeoList] = useState<SeoSetting[]>([]);
  const [selectedPageType, setSelectedPageType] = useState<string>('global');
  const [currentSetting, setCurrentSetting] = useState<Partial<SeoSetting>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load SEO settings from API
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getSeo();
      setSeoList(res);
      const active = res.find(s => s.page_type === selectedPageType) || res[0];
      if (active) {
        setSelectedPageType(active.page_type);
        setCurrentSetting({ ...active });
      }
    } catch (err: any) {
      console.error('Failed to load SEO settings:', err);
      setErrorMsg('Не вдалося завантажити налаштування SEO');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPageType = (type: string) => {
    setSelectedPageType(type);
    const item = seoList.find(s => s.page_type === type);
    if (item) {
      setCurrentSetting({ ...item });
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      await api.admin.saveSeo(currentSetting);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      // Reload list to synchronize
      const res = await api.admin.getSeo();
      setSeoList(res);
    } catch (err: any) {
      console.error('Save failed:', err);
      setErrorMsg(err.message || 'Помилка при збереженні');
    } finally {
      setSaving(false);
    }
  };

  const pageTypeLabels: Record<string, { label: string; desc: string }> = {
    global: { label: 'Глобальні налаштування', desc: 'Загальні meta-теги, OpenGraph та верифікація пошукових систем' },
    home: { label: 'Головна сторінка', desc: 'Шаблони meta title & description для головної вітрини' },
    article: { label: 'Сторінка статті', desc: 'Шаблони заголовків та розмітка NewsArticle / Article' },
    category: { label: 'Рубрики', desc: 'Шаблони та індексація категорій' },
    news: { label: 'Стрічка новин', desc: 'SEO стрічки швидких оновлень' },
    review: { label: 'Огляди', desc: 'SEO сторінок оглядів та рейтингів Review' }
  };

  return (
    <AdminLayout title="SEO & Пошукова оптимізація">
      <div className="space-y-6 max-w-6xl pb-16">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-400" />
              <span>Пошукова оптимізація & Structured Data</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Керування двомовними meta-тегами (UA/EN), XML мапами сайту, self-referencing canonical та Schema.org
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadSettings}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Оновити</span>
            </button>
          </div>
        </div>

        {/* Sitemap & Robots.txt quick link card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span>Згенеровані мапи сайту (Dynamic Sitemaps) & Robots</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60">
              Автооновлювані XML
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs font-mono">
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-colors group"
            >
              <span className="text-slate-300 group-hover:text-emerald-400">/sitemap.xml</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
            </a>
            <a
              href="/sitemap-articles.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-colors group"
            >
              <span className="text-slate-300 group-hover:text-emerald-400">/sitemap-articles.xml</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
            </a>
            <a
              href="/sitemap-categories.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-colors group"
            >
              <span className="text-slate-300 group-hover:text-emerald-400">/sitemap-categories.xml</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
            </a>
            <a
              href="/sitemap-images.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-colors group"
            >
              <span className="text-slate-300 group-hover:text-emerald-400">/sitemap-images.xml</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
            </a>
            <a
              href="/robots.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-colors group"
            >
              <span className="text-slate-300 group-hover:text-emerald-400">/robots.txt</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
            </a>
          </div>
        </div>

        {/* Page Types Selector Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          {Object.entries(pageTypeLabels).map(([type, meta]) => (
            <button
              key={type}
              type="button"
              onClick={() => handleSelectPageType(type)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedPageType === type
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {meta.label}
            </button>
          ))}
        </div>

        {/* Form Container */}
        <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white">
              {pageTypeLabels[selectedPageType]?.label || selectedPageType}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {pageTypeLabels[selectedPageType]?.desc}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Налаштування успішно збережено та застосовано!</span>
            </div>
          )}

          {/* Titles: Ukrainian & English */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Шаблон Title (Українська)</span>
                <span className="text-[10px] text-slate-500 font-mono">%title% | %site%</span>
              </label>
              <input
                type="text"
                value={currentSetting.title_template_uk || ''}
                onChange={e => setCurrentSetting({ ...currentSetting, title_template_uk: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                placeholder="%title% — TechOrbit Новини"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Шаблон Title (English)</span>
                <span className="text-[10px] text-slate-500 font-mono">%title% | %site%</span>
              </label>
              <input
                type="text"
                value={currentSetting.title_template_en || ''}
                onChange={e => setCurrentSetting({ ...currentSetting, title_template_en: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                placeholder="%title% — TechOrbit News"
              />
            </div>
          </div>

          {/* Descriptions: Ukrainian & English */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                За замовчуванням Meta Description (UA)
              </label>
              <textarea
                rows={3}
                value={currentSetting.default_meta_desc_uk || ''}
                onChange={e => setCurrentSetting({ ...currentSetting, default_meta_desc_uk: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                placeholder="Опис для пошукової видачі Google українською мовою..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                За замовчуванням Meta Description (EN)
              </label>
              <textarea
                rows={3}
                value={currentSetting.default_meta_desc_en || ''}
                onChange={e => setCurrentSetting({ ...currentSetting, default_meta_desc_en: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                placeholder="Meta description for search snippets in English..."
              />
            </div>
          </div>

          {/* Robots & Canonical settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-800/80">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Директива Robots (Індексація)
              </label>
              <select
                value={currentSetting.robots || 'index, follow'}
                onChange={e => setCurrentSetting({ ...currentSetting, robots: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="index, follow">index, follow (Рекомендовано для публічних сторінок)</option>
                <option value="noindex, follow">noindex, follow (Виключити з видачі, переходити по лінках)</option>
                <option value="noindex, nofollow">noindex, nofollow (Повна заборона індексації)</option>
              </select>
              <p className="text-[11px] text-slate-500">
                Чернетки та матеріали на перевірці завжди мають статус noindex або недоступні.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                OpenGraph зображення за замовчуванням
              </label>
              <input
                type="text"
                value={currentSetting.og_image_default || ''}
                onChange={e => setCurrentSetting({ ...currentSetting, og_image_default: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none font-mono"
                placeholder="https://images.unsplash.com/..."
              />
              <p className="text-[11px] text-slate-500">
                Використовується для прев'ю у соцмережах та месенджерах, якщо стаття не має головного фото.
              </p>
            </div>
          </div>

          {/* Global Webmaster & Analytics Section (Only on Global) */}
          {selectedPageType === 'global' && (
            <div className="space-y-5 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Верифікація вебмайстра & Веб-аналітика</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Google Search Console Verification Token
                  </label>
                  <input
                    type="text"
                    value={currentSetting.google_site_verification || ''}
                    onChange={e => setCurrentSetting({ ...currentSetting, google_site_verification: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none font-mono"
                    placeholder="google-site-verification=xxxx..."
                  />
                  <p className="text-[11px] text-slate-500">
                    Вставляється у тег &lt;meta name="google-site-verification" content="..."&gt;
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Google Analytics 4 Measurement ID (GA4)
                  </label>
                  <input
                    type="text"
                    value={currentSetting.google_analytics_id || ''}
                    onChange={e => setCurrentSetting({ ...currentSetting, google_analytics_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none font-mono"
                    placeholder="G-XXXXXXXXXX"
                  />
                  <p className="text-[11px] text-slate-500">
                    Ідентифікатор потоку даних GA4 для відстеження переглядів публічних сторінок.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Збереження...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Зберегти налаштування SEO</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
