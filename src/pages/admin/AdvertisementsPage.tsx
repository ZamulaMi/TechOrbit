import { useState, useEffect, FormEvent } from 'react';
import {
  DollarSign,
  Save,
  Check,
  Smartphone,
  Tablet,
  Monitor,
  AlertCircle,
  RefreshCw,
  Eye,
  Sliders,
  ExternalLink,
  ShieldCheck,
  Code
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { api } from '../../api/client.ts';
import { AdSlot } from '../../types.ts';

export function AdvertisementsPage() {
  const [adSlots, setAdSlots] = useState<AdSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<Partial<AdSlot> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadAdSlots();
  }, []);

  const loadAdSlots = async () => {
    setLoading(true);
    try {
      const slots = await api.admin.getAds();
      setAdSlots(slots);
      if (slots.length > 0) {
        const initial = selectedSlotId ? slots.find(s => s.id === selectedSlotId) || slots[0] : slots[0];
        setSelectedSlotId(initial.id);
        setActiveSlot({ ...initial });
      }
    } catch (err: any) {
      console.error('Failed to load ad slots:', err);
      setErrorMsg('Не вдалося завантажити рекламні блоки');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = (slot: AdSlot) => {
    setSelectedSlotId(slot.id);
    setActiveSlot({ ...slot });
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleToggleSlotActive = async (slotId: string, currentVal: boolean) => {
    try {
      await api.admin.updateAd(slotId, { is_active: !currentVal });
      setAdSlots(prev =>
        prev.map(s => (s.id === slotId ? { ...s, is_active: !currentVal } : s))
      );
      if (activeSlot?.id === slotId) {
        setActiveSlot(prev => (prev ? { ...prev, is_active: !currentVal } : prev));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Помилка зміни статусу слота');
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeSlot?.id) return;

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.admin.updateAd(activeSlot.id, activeSlot);
      setSuccessMsg('Рекламний блок успішно оновлено!');
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadAdSlots();
    } catch (err: any) {
      console.error('Save failed:', err);
      setErrorMsg(err.message || 'Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  const placementLabels: Record<string, { title: string; desc: string }> = {
    top: { title: 'Header Leaderboard (Top)', desc: 'Верхній банер над контентом або під навігацією' },
    after_hero: { title: 'After Hero (Головна)', desc: 'Блок одразу після головного матеріалу Hero на головній' },
    article_top: { title: 'Article Top (Початок статті)', desc: 'Рекламний блок під заголовком статті перед зображенням' },
    article_middle: { title: 'Article Middle (Тіло статті)', desc: 'Вставка по центру статті між абзацами' },
    article_bottom: { title: 'Article Bottom (Кінець статті)', desc: 'Блок під текстом статті перед схожими матеріалами' },
    sidebar: { title: 'Sidebar Banner (Бічна панель)', desc: 'Вертикальний або квадратний банер у бічній колонці' },
    footer: { title: 'Footer Banner (Підвал сайту)', desc: 'Горизонтальний банер над нижнім підвалом' }
  };

  return (
    <AdminLayout title="Управління рекламою (Advertisements)">
      <div className="space-y-6 max-w-6xl pb-16">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>Рекламні місця & Google AdSense</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Налаштування 7 стандартних позицій розміщення, адаптивності для мобільних/десктопів та резервних банерів
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAdSlots}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Оновити</span>
            </button>
          </div>
        </div>

        {/* Safety info badge */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-400">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-200">Політика безпеки розміщення коду:</p>
            <p>
              Рекламний код AdSense автоматично ізолюється: він <strong className="text-emerald-400">ніколи не виконується в адмін-панелі</strong> та в режимі редагування/прев’ю.
              Publisher ID підтягується безпечно з конфігурації або змінної оточення <code className="font-mono text-slate-300">GOOGLE_ADSENSE_PUB_ID</code>.
            </p>
          </div>
        </div>

        {/* Slots Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Slot List */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Рекламні слоти ({adSlots.length})
            </h3>

            <div className="space-y-2">
              {adSlots.map(slot => {
                const isSelected = slot.id === selectedSlotId;
                const info = placementLabels[slot.position] || { title: slot.name, desc: slot.position };

                return (
                  <div
                    key={slot.id}
                    onClick={() => handleSelectSlot(slot)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-emerald-500 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold text-xs text-white truncate">{info.title}</span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleToggleSlotActive(slot.id, slot.is_active);
                        }}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                          slot.is_active
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {slot.is_active ? 'АКТИВНИЙ' : 'ВИМКНЕНО'}
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-1">{info.desc}</p>

                    <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 font-mono">
                      <span className="capitalize">{slot.provider}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1.5">
                        <span className={slot.desktop ? 'text-slate-300' : 'text-slate-600'}>Desk</span>
                        <span className={slot.tablet ? 'text-slate-300' : 'text-slate-600'}>Tab</span>
                        <span className={slot.mobile ? 'text-slate-300' : 'text-slate-600'}>Mob</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Slot Editor Form */}
          <div className="md:col-span-2">
            {activeSlot ? (
              <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-white">
                      {placementLabels[activeSlot.position || '']?.title || activeSlot.name}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Позиція в макеті: <code className="font-mono text-emerald-400">{activeSlot.position}</code>
                    </p>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-semibold text-slate-300">Статус:</span>
                    <input
                      type="checkbox"
                      checked={Boolean(activeSlot.is_active)}
                      onChange={e => setActiveSlot({ ...activeSlot, is_active: e.target.checked })}
                      className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-mono text-slate-400">
                      {activeSlot.is_active ? 'Увімкнено' : 'Вимкнено'}
                    </span>
                  </label>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Provider & Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Провайдер реклами</label>
                    <select
                      value={activeSlot.provider || 'adsense'}
                      onChange={e => setActiveSlot({ ...activeSlot, provider: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="adsense">Google AdSense (Офіційний)</option>
                      <option value="custom">Спеціальний HTML код / Скрипт</option>
                      <option value="banner">Прямий партнерський банер (Зображення + Лінк)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Назва для аналітики</label>
                    <input
                      type="text"
                      value={activeSlot.name || ''}
                      onChange={e => setActiveSlot({ ...activeSlot, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* AdSense specific config */}
                {activeSlot.provider === 'adsense' && (
                  <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-4">
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <Code className="w-4 h-4 text-emerald-400" />
                      <span>Параметри блоку Google AdSense</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300">
                          Publisher ID (Client ID)
                        </label>
                        <input
                          type="text"
                          value={activeSlot.publisher_id || ''}
                          onChange={e => setActiveSlot({ ...activeSlot, publisher_id: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none font-mono"
                          placeholder="pub-XXXXXXXXXXXXXXXX"
                        />
                        <p className="text-[10px] text-slate-500">
                          Залиште порожнім, щоб використовувати глобальний GOOGLE_ADSENSE_PUB_ID
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300">
                          Ad Slot ID (data-ad-slot)
                        </label>
                        <input
                          type="text"
                          value={activeSlot.ad_slot || ''}
                          onChange={e => setActiveSlot({ ...activeSlot, ad_slot: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none font-mono"
                          placeholder="1234567890"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Custom Snippet */}
                {activeSlot.provider === 'custom' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Код рекламного блоку (HTML / JS)</label>
                    <textarea
                      rows={4}
                      value={activeSlot.code_snippet || ''}
                      onChange={e => setActiveSlot({ ...activeSlot, code_snippet: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none font-mono"
                      placeholder="<!-- Вставте рекламний скрипт або iframe -->"
                    />
                  </div>
                )}

                {/* Device Responsiveness Toggles */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Відображення на пристроях (Адаптивні слоти)
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(activeSlot.desktop)}
                        onChange={e => setActiveSlot({ ...activeSlot, desktop: e.target.checked })}
                        className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                      />
                      <Monitor className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-300">Desktop</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(activeSlot.tablet)}
                        onChange={e => setActiveSlot({ ...activeSlot, tablet: e.target.checked })}
                        className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                      />
                      <Tablet className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-300">Tablet</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(activeSlot.mobile)}
                        onChange={e => setActiveSlot({ ...activeSlot, mobile: e.target.checked })}
                        className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                      />
                      <Smartphone className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-300">Mobile</span>
                    </label>
                  </div>
                </div>

                {/* Fallback Partner Banner */}
                <div className="space-y-4 pt-2 border-t border-slate-800/80">
                  <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Резервний банер (Fallback / Direct Partner)</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Показується, якщо відсутній publisher_id або AdSense заблоковано
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">URL зображення банера</label>
                      <input
                        type="text"
                        value={activeSlot.fallback_image_url || ''}
                        onChange={e => setActiveSlot({ ...activeSlot, fallback_image_url: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                        placeholder="https://images.unsplash.com/..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">Цільове посилання переходу (Link)</label>
                      <input
                        type="text"
                        value={activeSlot.fallback_link || ''}
                        onChange={e => setActiveSlot({ ...activeSlot, fallback_link: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                        placeholder="https://partner.com/?ref=techorbit"
                      />
                    </div>
                  </div>
                </div>

                {/* Safe Test Preview Box */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Безпечне візуальне прев'ю блоку:</span>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-400">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                      Рекламний слот: {activeSlot.position} ({activeSlot.provider})
                    </div>
                    {activeSlot.fallback_image_url ? (
                      <img
                        src={activeSlot.fallback_image_url}
                        alt="Fallback preview"
                        className="max-h-24 mx-auto rounded-lg object-cover"
                      />
                    ) : (
                      <p className="text-slate-500 py-2">
                        {activeSlot.provider === 'adsense'
                          ? `Google AdSense: [Client: ${activeSlot.publisher_id || 'Global'}, Slot: ${activeSlot.ad_slot || 'Pending'}]`
                          : 'Контент банера буде завантажено публічно'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Submit button */}
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
                        <span>Зберегти зміни слота</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                Оберіть слот зі списку зліва для редагування
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
