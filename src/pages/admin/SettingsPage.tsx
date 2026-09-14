import { useState, useEffect, FormEvent } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { api } from '../../api/client.ts';
import { AdSlot, SocialLink, SeoSetting } from '../../types.ts';
import { Settings, Save, CheckCircle, Megaphone, Globe, Share2 } from 'lucide-react';

export function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [ads, setAds] = useState<AdSlot[]>([]);
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [seo, setSeo] = useState<SeoSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Editable settings fields
  const [siteName, setSiteName] = useState('');
  const [tagline, setTagline] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [defaultLang, setDefaultLang] = useState('uk');

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [stgs, adList, socList, seoList] = await Promise.all([
        api.admin.getSettings(),
        api.admin.getAds(),
        api.admin.getSocialLinks(),
        api.admin.getSeo()
      ]);
      setSettings(stgs);
      setAds(adList);
      setSocials(socList);
      setSeo(seoList);

      setSiteName(stgs.site_name || 'TechOrbit');
      setTagline(stgs.site_tagline || 'Технологічне медіа майбутнього');
      setContactEmail(stgs.contact_email || 'editorial@techorbit.ua');
      setDefaultLang(stgs.default_language || 'uk');
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveGeneral = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await Promise.all([
        api.admin.updateSetting('site_name', siteName),
        api.admin.updateSetting('site_tagline', tagline),
        api.admin.updateSetting('contact_email', contactEmail),
        api.admin.updateSetting('default_language', defaultLang)
      ]);
      setMessage('Загальні налаштування сайту збережено!');
    } catch (err: any) {
      alert(err.message || 'Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAd = async (ad: AdSlot) => {
    try {
      await api.admin.updateAd(ad.id, { is_active: !ad.is_active });
      setAds(prev => prev.map(a => (a.id === ad.id ? { ...a, is_active: !a.is_active } : a)));
      setMessage(`Стан слоту "${ad.name}" оновлено`);
    } catch (err: any) {
      alert(err.message || 'Помилка оновлення реклами');
    }
  };

  return (
    <AdminLayout
      title="Налаштування сайту & Монетизація"
      subtitle="Глобальні параметри TechOrbit, рекламні слоти, SEO та соціальні мережі"
      onRefresh={loadSettings}
      refreshing={loading}
    >
      <div className="space-y-6">
        {message && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
            <span>{message}</span>
            <button type="button" onClick={() => setMessage('')} className="font-bold hover:underline">
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* General Settings */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>Основні параметри видання</span>
            </h3>

            <form onSubmit={handleSaveGeneral} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Назва медіа</label>
                <input
                  type="text"
                  value={siteName}
                  onChange={e => setSiteName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Слоган видання (Tagline)</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Контактний Email редакції</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Основна мова публікацій</label>
                <select
                  value={defaultLang}
                  onChange={e => setDefaultLang(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="uk">Українська (UK)</option>
                  <option value="en">English (EN)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {saving ? 'Збереження...' : 'Зберегти параметри'}
                </button>
              </div>
            </form>
          </div>

          {/* Ad Slots Manager */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-400" />
              <span>Рекламні місця та спонсорські банери</span>
            </h3>

            <div className="space-y-3">
              {ads.map(ad => (
                <div
                  key={ad.id}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{ad.name}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">
                        {ad.position}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate max-w-xs">
                      {ad.fallback_link || 'Немає посилання'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleAd(ad)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors ${
                      ad.is_active
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {ad.is_active ? 'Активний' : 'Вимкнено'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SEO Configuration Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>SEO Мета-теги & JSON-LD Структуровані дані</span>
          </h3>
          <p className="text-xs text-slate-400">
            TechOrbit автоматично генерує OpenGraph, Twitter Card та schema.org/NewsArticle розмітку для кожної публікації, щоб забезпечити швидку індексацію в Google News.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
            {seo.map(s => (
              <div key={s.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                  Сторінка: {s.page_type}
                </span>
                <p className="font-semibold text-white">{s.meta_title_uk || s.meta_title_en}</p>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {s.meta_description_uk || s.meta_description_en}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
