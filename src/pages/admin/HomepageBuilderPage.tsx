import { useState, useEffect, FormEvent } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { api } from '../../api/client.ts';
import { HomepageSection, HomepageLayout, HomepageSortBy, Category } from '../../types.ts';
import {
  LayoutTemplate,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Monitor,
  Smartphone,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  X
} from 'lucide-react';

const LAYOUT_OPTIONS: { id: HomepageLayout; label: string; description: string }[] = [
  { id: 'hero', label: 'Hero Showcase', description: 'Large primary spotlight with secondary stacked editorial cards' },
  { id: 'two-column', label: 'Two-Column Split', description: 'Lead featured article on the left with list feed on the right' },
  { id: 'three-column', label: 'Three-Column Grid', description: 'Balanced 3-card card showcase with badges and scores' },
  { id: 'grid', label: 'Classic Grid', description: 'Responsive multi-card grid with high visual density' },
  { id: 'horizontal', label: 'Horizontal Cards', description: 'Wide landscape cards with high readability and excerpts' },
  { id: 'compact', label: 'Compact List', description: 'Numbered high-velocity headline stream' },
  { id: 'list', label: 'Standard Editorial List', description: 'Vertical stream with date, tags, and reading time' }
];

const SECTION_TYPES: { id: string; label: string }[] = [
  { id: 'hero', label: 'Hero Editorial' },
  { id: 'latest_news', label: 'Latest News Stream' },
  { id: 'featured', label: 'Featured / Editor’s Picks' },
  { id: 'reviews', label: 'Lab Reviews & Scores' },
  { id: 'popular', label: 'Trending & Popular' },
  { id: 'category_blocks', label: 'Category Block' },
  { id: 'newsletter', label: 'Newsletter Subscription' },
  { id: 'advertisement', label: 'Sponsored / Ad Unit' }
];

export function HomepageBuilderPage() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit/Add modal state
  const [editingSection, setEditingSection] = useState<Partial<HomepageSection> | null>(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [secData, catData] = await Promise.all([
        api.admin.getHomepageSections(),
        api.admin.getCategories()
      ]);
      setSections(secData);
      setCategories(catData);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load homepage builder configuration' });
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleToggleActive = async (sec: HomepageSection) => {
    try {
      const updated = { ...sec, is_active: !sec.is_active };
      await api.admin.saveHomepageSection(updated);
      setSections(prev => prev.map(s => (s.id === sec.id ? updated : s)));
      showNotification('success', `Section "${sec.title_uk}" ${updated.is_active ? 'enabled' : 'hidden'}`);
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleToggleDevice = async (sec: HomepageSection, device: 'desktop' | 'mobile') => {
    try {
      const updated = {
        ...sec,
        desktop_visible: device === 'desktop' ? !sec.desktop_visible : sec.desktop_visible,
        mobile_visible: device === 'mobile' ? !sec.mobile_visible : sec.mobile_visible
      };
      await api.admin.saveHomepageSection(updated);
      setSections(prev => prev.map(s => (s.id === sec.id ? updated : s)));
      showNotification('success', `Updated device visibility for "${sec.title_uk}"`);
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const newSections = [...sections];
    const [moved] = newSections.splice(index, 1);
    newSections.splice(targetIndex, 0, moved);

    setSections(newSections);

    try {
      await api.admin.reorderHomepageSections(newSections.map(s => s.id));
      showNotification('success', 'Section order saved successfully');
    } catch (err: any) {
      showNotification('error', 'Failed to save new order');
      loadData();
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to remove section "${title}"?`)) return;
    try {
      await api.admin.deleteHomepageSection(id);
      setSections(prev => prev.filter(s => s.id !== id));
      showNotification('success', `Section removed`);
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleSaveModal = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingSection || !editingSection.title_uk) return;
    setSaving(true);
    try {
      const payload: Partial<HomepageSection> = {
        ...editingSection,
        id: editingSection.id || 'sec_' + Date.now(),
        title_en: editingSection.title_en || editingSection.title_uk,
        sort_order: editingSection.sort_order ?? sections.length + 1,
        is_active: editingSection.is_active ?? true,
        desktop_visible: editingSection.desktop_visible ?? true,
        mobile_visible: editingSection.mobile_visible ?? true,
        article_count: Number(editingSection.article_count) || 6,
        layout: editingSection.layout || 'grid',
        sort_by: editingSection.sort_by || 'latest',
        section_type: editingSection.section_type || 'featured'
      };

      const res = await api.admin.saveHomepageSection(payload);
      if (isNew) {
        setSections(prev => [...prev, res.section]);
        showNotification('success', 'Section created successfully');
      } else {
        setSections(prev => prev.map(s => (s.id === res.section.id ? res.section : s)));
        showNotification('success', 'Section updated successfully');
      }
      setEditingSection(null);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save section');
    } finally {
      setSaving(false);
    }
  };

  const openNewModal = () => {
    setIsNew(true);
    setEditingSection({
      title_uk: '',
      title_en: '',
      section_type: 'latest_news',
      category_id: null,
      layout: 'grid',
      article_count: 6,
      sort_by: 'latest',
      desktop_visible: true,
      mobile_visible: true,
      is_active: true
    });
  };

  const openEditModal = (sec: HomepageSection) => {
    setIsNew(false);
    setEditingSection({ ...sec });
  };

  return (
    <AdminLayout title="Homepage Builder">
      <div className="space-y-6 max-w-6xl mx-auto pb-16">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase tracking-wider mb-1">
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>Конструктор головної сторінки</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
              Homepage Layout & Sections
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-slate-700">
                {sections.length} блоків
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Повний контроль над модульною сіткою головної сторінки: додавання, сортування, вибір шаблонів, фільтрація за рубриками та адаптивність для мобільних пристроїв.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="add-homepage-section-btn"
              onClick={openNewModal}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Додати секцію</span>
            </button>
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

        {/* Builder Board */}
        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-500 font-mono text-sm">
            Завантаження конфігурації головної сторінки...
          </div>
        ) : sections.length === 0 ? (
          <div className="text-center py-16 px-4 bg-slate-900/60 rounded-2xl border border-dashed border-slate-800">
            <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Немає налаштованих секцій</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
              Створіть першу секцію (Hero, Свіжі новини або Огляди), щоб наповнити головну сторінку TechOrbit.
            </p>
            <button
              onClick={openNewModal}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
            >
              Додати блок
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sections.map((sec, index) => {
              const category = categories.find(c => c.id === sec.category_id);
              return (
                <div
                  key={sec.id}
                  id={`section-row-${sec.id}`}
                  className={`flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-xl border transition-all ${
                    sec.is_active
                      ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/60 border-slate-900 opacity-60'
                  }`}
                >
                  {/* Left info */}
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="flex flex-col items-center justify-center w-8 h-8 rounded-lg bg-slate-800/80 text-slate-400 font-mono text-xs font-bold border border-slate-700/60 flex-shrink-0">
                      #{index + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-white truncate">{sec.title_uk}</h4>
                        <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                          / {sec.title_en}
                        </span>
                        {!sec.is_active && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono uppercase">
                            Приховано
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                          {sec.section_type}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                          layout: {sec.layout}
                        </span>
                        {category ? (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                            рубрика: {category.name_uk}
                          </span>
                        ) : (
                          <span className="text-slate-500">Всі рубрики</span>
                        )}
                        <span className="text-slate-500">• {sec.article_count} матеріалів</span>
                        <span className="text-slate-500">• сорт: {sec.sort_by}</span>
                      </div>
                    </div>
                  </div>

                  {/* Controls Right */}
                  <div className="flex items-center gap-2 mt-3 md:mt-0 flex-shrink-0 self-end md:self-auto">
                    {/* Device visibility badges */}
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                      <button
                        title="Показ на комп'ютері"
                        onClick={() => handleToggleDevice(sec, 'desktop')}
                        className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                          sec.desktop_visible ? 'bg-emerald-950 text-emerald-400' : 'text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        <Monitor className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Показ на смартфонах"
                        onClick={() => handleToggleDevice(sec, 'mobile')}
                        className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                          sec.mobile_visible ? 'bg-emerald-950 text-emerald-400' : 'text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Active toggle */}
                    <button
                      title={sec.is_active ? 'Приховати блок' : 'Увімкнути блок'}
                      onClick={() => handleToggleActive(sec)}
                      className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                        sec.is_active
                          ? 'bg-slate-800/80 border-slate-700 text-emerald-400 hover:bg-slate-800'
                          : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {sec.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    {/* Move up / down */}
                    <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800">
                      <button
                        disabled={index === 0}
                        onClick={() => handleMove(index, 'up')}
                        className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer"
                        title="Підняти вище"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        disabled={index === sections.length - 1}
                        onClick={() => handleMove(index, 'down')}
                        className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer"
                        title="Опустити нижче"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Edit */}
                    <button
                      onClick={() => openEditModal(sec)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="Редагувати параметри"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(sec.id, sec.title_uk)}
                      className="p-2 bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-400 rounded-lg transition-colors cursor-pointer"
                      title="Видалити"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal for Edit / Add */}
        {editingSection && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 text-slate-200 shadow-2xl my-8">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">
                    {isNew ? 'Додати нову секцію головної' : 'Редагувати секцію'}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingSection(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveModal} className="space-y-4">
                {/* Titles UK & EN */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Заголовок (UA) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editingSection.title_uk || ''}
                      onChange={e => setEditingSection({ ...editingSection, title_uk: e.target.value })}
                      placeholder="напр. Вибір редакції"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Заголовок (EN)
                    </label>
                    <input
                      type="text"
                      value={editingSection.title_en || ''}
                      onChange={e => setEditingSection({ ...editingSection, title_en: e.target.value })}
                      placeholder="e.g. Editor's Choice"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-sans"
                    />
                  </div>
                </div>

                {/* Section Type & Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Тип секції
                    </label>
                    <select
                      value={editingSection.section_type || 'latest_news'}
                      onChange={e => setEditingSection({ ...editingSection, section_type: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      {SECTION_TYPES.map(st => (
                        <option key={st.id} value={st.id}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Рубрика фільтрації
                    </label>
                    <select
                      value={editingSection.category_id || ''}
                      onChange={e =>
                        setEditingSection({
                          ...editingSection,
                          category_id: e.target.value ? e.target.value : null
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Всі рубрики (Без фільтрації)</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name_uk} ({c.name_en})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Layout & Count */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Візуальний шаблон (Layout)
                    </label>
                    <select
                      value={editingSection.layout || 'grid'}
                      onChange={e =>
                        setEditingSection({ ...editingSection, layout: e.target.value as HomepageLayout })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      {LAYOUT_OPTIONS.map(lo => (
                        <option key={lo.id} value={lo.id}>
                          {lo.label} ({lo.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Кількість матеріалів (Limit)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={editingSection.article_count ?? 6}
                      onChange={e =>
                        setEditingSection({ ...editingSection, article_count: parseInt(e.target.value) || 6 })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Sort by */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Сортування матеріалів
                  </label>
                  <select
                    value={editingSection.sort_by || 'latest'}
                    onChange={e =>
                      setEditingSection({ ...editingSection, sort_by: e.target.value as HomepageSortBy })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="latest">Найновіші (Published Date)</option>
                    <option value="popular">Найбільше переглядів (Views)</option>
                    <option value="trending">Трендові (Trending Algorithm)</option>
                    <option value="title">За назвою (Алфавітний порядок)</option>
                  </select>
                </div>

                {/* Device & Status Toggles */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-slate-400">Видимість та статус:</div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingSection.is_active ?? true}
                        onChange={e => setEditingSection({ ...editingSection, is_active: e.target.checked })}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-950"
                      />
                      <span>Активна секція</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingSection.desktop_visible ?? true}
                        onChange={e =>
                          setEditingSection({ ...editingSection, desktop_visible: e.target.checked })
                        }
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-950"
                      />
                      <span>Desktop</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingSection.mobile_visible ?? true}
                        onChange={e =>
                          setEditingSection({ ...editingSection, mobile_visible: e.target.checked })
                        }
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-950"
                      />
                      <span>Mobile</span>
                    </label>
                  </div>
                </div>

                {/* Submit & Cancel */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingSection(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Збереження...' : isNew ? 'Створити секцію' : 'Зберегти зміни'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
