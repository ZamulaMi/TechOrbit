import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { api } from '../../api/client.ts';
import { SiteElement, SocialLink } from '../../types.ts';
import {
  Sliders,
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  Tablet,
  ArrowUp,
  ArrowDown,
  Save,
  CheckCircle2,
  AlertCircle,
  Share2,
  ExternalLink,
  Settings,
  Plus,
  Trash2,
  RotateCcw
} from 'lucide-react';

export function SiteElementsPage() {
  const [elements, setElements] = useState<SiteElement[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSocials, setSavingSocials] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [elemData, socialData] = await Promise.all([
        api.admin.getSiteElements(),
        api.admin.getSocialLinks()
      ]);
      setElements(elemData);
      setSocialLinks(socialData);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load site elements configuration' });
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleToggleEnabled = async (el: SiteElement) => {
    try {
      const newEnabled = !el.enabled;
      await api.admin.toggleSiteElement(el.id, newEnabled);
      setElements(prev => prev.map(item => (item.id === el.id ? { ...item, enabled: newEnabled } : item)));
      showNotification('success', `Елемент "${el.name}" ${newEnabled ? 'увімкнено' : 'вимкнено'}`);
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleToggleDevice = async (el: SiteElement, device: 'desktop' | 'tablet' | 'mobile') => {
    try {
      const updated = {
        ...el,
        [device]: !el[device]
      };
      await api.admin.saveSiteElement(updated);
      setElements(prev => prev.map(item => (item.id === el.id ? updated : item)));
      showNotification('success', `Оновлено показ для "${el.name}" на ${device}`);
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= elements.length) return;

    const newElements = [...elements];
    const [moved] = newElements.splice(index, 1);
    newElements.splice(targetIndex, 0, moved);

    setElements(newElements);

    try {
      await api.admin.reorderSiteElements(newElements.map(e => e.id));
      showNotification('success', 'Порядок елементів оновлено');
    } catch (err: any) {
      showNotification('error', 'Не вдалося зберегти порядок');
      loadData();
    }
  };

  // Social Links management
  const handleSocialUrlChange = (platform: string, url: string) => {
    setSocialLinks(prev =>
      prev.map(s => (s.platform === platform ? { ...s, url } : s))
    );
  };

  const handleSocialToggle = (platform: string) => {
    setSocialLinks(prev =>
      prev.map(s => (s.platform === platform ? { ...s, is_active: !s.is_active } : s))
    );
  };

  const handleSaveSocials = async () => {
    setSavingSocials(true);
    try {
      await api.admin.saveSocialLinksBatch(socialLinks);
      showNotification('success', 'Соціальні мережі та канали оновлено успішно');
    } catch (err: any) {
      showNotification('error', err.message || 'Помилка при збереженні посилань');
    } finally {
      setSavingSocials(false);
    }
  };

  return (
    <AdminLayout title="Site Elements & Visual Structure">
      <div className="space-y-8 max-w-6xl mx-auto pb-16">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
              <Sliders className="w-3.5 h-3.5" />
              <span>Візуальна конфігурація видання</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
              Site Elements Manager
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-slate-700">
                {elements.length} компонентів
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Керування активністю, відображенням на різних екранах (Desktop, Tablet, Mobile) та порядком розташування ключових модулів інтерфейсу.
            </p>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-sm flex items-center gap-3 border ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        {/* Core Elements List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono">
              Компоненти сайту (Structure & Visibility)
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Увімкнено: {elements.filter(e => e.enabled).length} з {elements.length}
            </span>
          </div>

          {loading ? (
            <div className="text-center p-12 text-slate-500 font-mono text-sm">
              Завантаження елементів інтерфейсу...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {elements.map((el, index) => (
                <div
                  key={el.id}
                  id={`site-element-${el.element_key}`}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl border transition-all ${
                    el.enabled
                      ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/50 border-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center font-mono text-xs font-bold border border-slate-700/60 flex-shrink-0">
                      {index + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white">{el.name}</span>
                        <span className="text-[11px] font-mono text-slate-500">({el.element_key})</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono border border-slate-700">
                          {el.section || el.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 mt-3 sm:mt-0 flex-shrink-0 self-end sm:self-auto">
                    {/* Device visibility toggles */}
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                      <button
                        title="Desktop"
                        onClick={() => handleToggleDevice(el, 'desktop')}
                        className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                          el.desktop ? 'bg-cyan-950 text-cyan-400' : 'text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        <Monitor className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Tablet"
                        onClick={() => handleToggleDevice(el, 'tablet')}
                        className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                          el.tablet ? 'bg-cyan-950 text-cyan-400' : 'text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        <Tablet className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Mobile"
                        onClick={() => handleToggleDevice(el, 'mobile')}
                        className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                          el.mobile ? 'bg-cyan-950 text-cyan-400' : 'text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Enable / Disable toggle button */}
                    <button
                      onClick={() => handleToggleEnabled(el)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                        el.enabled
                          ? 'bg-emerald-950/70 border-emerald-800 text-emerald-400 hover:bg-emerald-900/60'
                          : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {el.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{el.enabled ? 'Активний' : 'Вимкнено'}</span>
                    </button>

                    {/* Reorder */}
                    <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800">
                      <button
                        disabled={index === 0}
                        onClick={() => handleMove(index, 'up')}
                        className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Вгору"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={index === elements.length - 1}
                        onClick={() => handleMove(index, 'down')}
                        className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Вниз"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Social Links Manager */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase tracking-wider mb-1">
                <Share2 className="w-3.5 h-3.5" />
                <span>Соціальні канали TechOrbit</span>
              </div>
              <h2 className="text-lg font-bold text-white">Social Media & Communities</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Керуйте офіційними посиланнями для шапки, підвалу та блоків підписки на всіх 7 платформах.
              </p>
            </div>

            <button
              onClick={handleSaveSocials}
              disabled={savingSocials}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{savingSocials ? 'Збереження...' : 'Зберегти посилання'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {socialLinks.map(s => (
              <div
                key={s.id || s.platform}
                className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {s.platform}
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(s.is_active)}
                      onChange={() => handleSocialToggle(s.platform)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-950"
                    />
                    <span>Активне</span>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={s.url || ''}
                    onChange={e => handleSocialUrlChange(s.platform, e.target.value)}
                    placeholder={`https://${s.platform}.com/...`}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-500 hover:text-emerald-400 transition-colors"
                      title="Відкрити посилання"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
