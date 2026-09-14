import { useState, useEffect, FormEvent } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { api } from '../../api/client.ts';
import { Category, Tag } from '../../types.ts';
import { FolderTree, Tag as TagIcon, Plus, CheckCircle, Trash2 } from 'lucide-react';

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // New category form
  const [showCatModal, setShowCatModal] = useState(false);
  const [nameUk, setNameUk] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slugUk, setSlugUk] = useState('');
  const [slugEn, setSlugEn] = useState('');
  const [descUk, setDescUk] = useState('');

  // New tag form
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagName, setTagName] = useState('');
  const [tagSlug, setTagSlug] = useState('');

  const loadTaxonomy = async () => {
    setLoading(true);
    try {
      const [cats, tgs] = await Promise.all([
        api.admin.getCategories(),
        api.admin.getTags()
      ]);
      setCategories(cats);
      setTags(tgs);
    } catch (err) {
      console.error('Failed to load taxonomy', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxonomy();
  }, []);

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.admin.createCategory({
        name_uk: nameUk,
        name_en: nameEn || nameUk,
        slug_uk: slugUk || nameUk.toLowerCase().replace(/\s+/g, '-'),
        slug_en: slugEn || (nameEn || nameUk).toLowerCase().replace(/\s+/g, '-'),
        description_uk: descUk
      });
      setShowCatModal(false);
      setNameUk('');
      setNameEn('');
      setSlugUk('');
      setSlugEn('');
      setDescUk('');
      await loadTaxonomy();
    } catch (err: any) {
      alert(err.message || 'Помилка створення категорії');
    }
  };

  const handleCreateTag = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.admin.createTag({
        name_uk: tagName,
        name_en: tagName,
        slug_uk: tagSlug || tagName.toLowerCase().replace(/\s+/g, '-'),
        slug_en: tagSlug || tagName.toLowerCase().replace(/\s+/g, '-')
      });
      setShowTagModal(false);
      setTagName('');
      setTagSlug('');
      await loadTaxonomy();
    } catch (err: any) {
      alert(err.message || 'Помилка створення тегу');
    }
  };

  return (
    <AdminLayout
      title="Рубрики та теги (Таксономія)"
      subtitle="Структурування категорій новин, слагів для локалізації та тегів"
      onRefresh={loadTaxonomy}
      refreshing={loading}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Categories Section */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-emerald-400" />
              <span>Рубрики сайту ({categories.length})</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowCatModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Додати рубрику</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-[11px] text-slate-400 uppercase">
                <tr>
                  <th className="pb-2">Назва (UA)</th>
                  <th className="pb-2">Назва (EN)</th>
                  <th className="pb-2">Слаги (UA / EN)</th>
                  <th className="pb-2">Порядок</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {categories.map(c => (
                  <tr key={c.id} className="hover:bg-slate-800/40">
                    <td className="py-3 font-semibold text-white">{c.name_uk}</td>
                    <td className="py-3 text-slate-300">{c.name_en}</td>
                    <td className="py-3 font-mono text-[11px] text-slate-400">
                      /{c.slug_uk} • /{c.slug_en}
                    </td>
                    <td className="py-3 text-slate-400">{c.sort_order}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tags Section */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TagIcon className="w-4 h-4 text-indigo-400" />
              <span>Теги ({tags.length})</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowTagModal(true)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.map(t => (
              <span
                key={t.id}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono"
              >
                #{t.name}
              </span>
            ))}
          </div>
        </div>

        {/* Add Category Modal */}
        {showCatModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <h3 className="font-bold text-white text-sm">Нова рубрика</h3>
              <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Назва українською *</label>
                  <input
                    type="text"
                    value={nameUk}
                    onChange={e => setNameUk(e.target.value)}
                    placeholder="Штучний інтелект"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Назва англійською</label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={e => setNameEn(e.target.value)}
                    placeholder="Artificial Intelligence"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Слаг UA</label>
                    <input
                      type="text"
                      value={slugUk}
                      onChange={e => setSlugUk(e.target.value)}
                      placeholder="ai"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Слаг EN</label>
                    <input
                      type="text"
                      value={slugEn}
                      onChange={e => setSlugEn(e.target.value)}
                      placeholder="ai-en"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Опис рубрики</label>
                  <textarea
                    rows={2}
                    value={descUk}
                    onChange={e => setDescUk(e.target.value)}
                    placeholder="Новини про LLM, нейромережі..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCatModal(false)}
                    className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    Зберегти рубрику
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Tag Modal */}
        {showTagModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
              <h3 className="font-bold text-white text-sm">Новий тег</h3>
              <form onSubmit={handleCreateTag} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Назва тегу *</label>
                  <input
                    type="text"
                    value={tagName}
                    onChange={e => setTagName(e.target.value)}
                    placeholder="Apple, M4, GPT-5..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTagModal(false)}
                    className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                  >
                    Зберегти тег
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
