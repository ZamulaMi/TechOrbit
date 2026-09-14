import { useState, useEffect, FormEvent } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { api } from '../../api/client.ts';
import { MediaItem } from '../../types.ts';
import { Image as ImageIcon, Plus, Trash2, Copy, Check, ExternalLink } from 'lucide-react';

export function MediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New media modal/inputs
  const [showAddModal, setShowAddModal] = useState(false);
  const [filename, setFilename] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [altText, setAltText] = useState('');

  const loadMedia = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getMedia();
      setMedia(data);
    } catch (err) {
      console.error('Failed to load media', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const handleCopy = (id: string, url: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleAddMedia = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.admin.createMedia({
        filename: filename || 'image_' + Date.now() + '.jpg',
        url: fileUrl,
        alt_text: altText,
        mime_type: 'image/jpeg'
      });
      setShowAddModal(false);
      setFilename('');
      setFileUrl('');
      setAltText('');
      await loadMedia();
    } catch (err: any) {
      alert(err.message || 'Помилка додавання зображення');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Видалити це зображення з медіатеки?')) return;
    try {
      await api.admin.deleteMedia(id);
      await loadMedia();
    } catch (err: any) {
      alert(err.message || 'Помилка видалення');
    }
  };

  return (
    <AdminLayout
      title="Медіатека та зображення"
      subtitle={`Всього збережено: ${media.length} файлів`}
      onRefresh={loadMedia}
      refreshing={loading}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Зображення використовуються як обкладинки для статей, рекламні банери та ілюстрації.
          </p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Додати файл / URL</span>
          </button>
        </div>

        {/* Media Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map(item => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden group hover:border-slate-700 transition-all flex flex-col"
            >
              <div className="aspect-[16/10] bg-slate-950 relative overflow-hidden">
                <img
                  src={item.url}
                  alt={item.alt_text || item.filename}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="p-3 flex-1 flex flex-col justify-between space-y-2 text-xs">
                <div>
                  <p className="font-semibold text-white truncate" title={item.filename}>
                    {item.filename}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">{item.alt_text || 'Без опису'}</p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleCopy(item.id, item.url)}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Скопійовано!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>URL</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <h3 className="font-bold text-white text-sm">Додати зображення до медіатеки</h3>

              <form onSubmit={handleAddMedia} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Прямий URL зображення *</label>
                  <input
                    type="url"
                    value={fileUrl}
                    onChange={e => setFileUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Назва файлу</label>
                  <input
                    type="text"
                    value={filename}
                    onChange={e => setFilename(e.target.value)}
                    placeholder="apple_vision_pro_cover.jpg"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Alt-текст (для SEO та доступності)</label>
                  <input
                    type="text"
                    value={altText}
                    onChange={e => setAltText(e.target.value)}
                    placeholder="Apple Vision Pro огляд"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                  >
                    Зберегти файл
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
