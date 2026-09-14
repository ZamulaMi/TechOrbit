import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { DiffViewer } from '../../components/common/DiffViewer.tsx';
import { api } from '../../api/client.ts';
import { ChangeEvent } from '../../types.ts';
import { GitCompare, Check, X, ShieldCheck, AlertTriangle, Clock } from 'lucide-react';

export function ChangesPage() {
  const [changes, setChanges] = useState<ChangeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChange, setSelectedChange] = useState<ChangeEvent | null>(null);
  const [message, setMessage] = useState('');

  const loadChanges = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getChanges();
      setChanges(data);
      if (data.length > 0 && !selectedChange) {
        setSelectedChange(data[0]);
      }
    } catch (err) {
      console.error('Failed to load changes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChanges();
  }, []);

  const handleResolve = async (id: string, action: 'merged' | 'dismissed') => {
    try {
      await api.admin.resolveChange(id, action);
      setMessage(
        action === 'merged'
          ? 'Зміни успішно застосовано до статті в базі даних!'
          : 'Зміну відхилено без перезапису.'
      );
      await loadChanges();
    } catch (err: any) {
      alert(err.message || 'Помилка оновлення');
    }
  };

  const pendingChanges = changes.filter(c => c.status === 'detected');

  return (
    <AdminLayout
      title="Відстеження змін у першоджерелах (Diff Tracker)"
      subtitle="Автоматичне виявлення правок, доповнень та оновлень у матеріалах першоджерел"
      onRefresh={loadChanges}
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

        {/* Info Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
          <GitCompare className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 space-y-1">
            <h4 className="font-bold text-white">Як працює система Content Diffing</h4>
            <p className="text-slate-400">
              Коли джерело контенту (наприклад, Wylsa або The Verge) виправляє помилку, оновлює технічні характеристики або дописує апдейт, TechOrbit фіксує хеш-розбіжність і пропонує редактору переглянути зміни без ризику втратити власний переклад.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs">Завантаження змін...</p>
          </div>
        ) : changes.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
            <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="font-bold text-white text-sm">Немає виявлених розбіжностей</h3>
            <p className="text-xs text-slate-400">
              Всі опубліковані статті відповідають актуальному стану першоджерел.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* List of changes */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                Події змін ({pendingChanges.length} очікують)
              </h3>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {changes.map(ch => {
                  const isSelected = selectedChange?.id === ch.id;
                  const isPending = ch.status === 'detected';

                  return (
                    <div
                      key={ch.id}
                      onClick={() => setSelectedChange(ch)}
                      className={`p-4 rounded-xl border text-xs cursor-pointer transition-all space-y-2 ${
                        isSelected
                          ? 'bg-slate-800 border-emerald-500 shadow-md'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            isPending
                              ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {ch.status}
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ch.detected_at).toLocaleString()}
                        </span>
                      </div>

                      <h4 className="font-bold text-white leading-snug">
                        {ch.article_title || ch.source_title || 'Зміна статті'}
                      </h4>

                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {ch.diff_summary || 'Виявлено оновлення тексту статті в першоджерелі'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Diff Comparison Pane */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              {selectedChange ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {selectedChange.article_title || selectedChange.source_title}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Подія ID: {selectedChange.id} • Тип: {selectedChange.event_type}
                      </p>
                    </div>

                    {selectedChange.status === 'detected' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleResolve(selectedChange.id, 'merged')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Застосувати зміни</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResolve(selectedChange.id, 'dismissed')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Відхилити</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Diff Viewer */}
                  <DiffViewer
                    previousText={selectedChange.previous_value || ''}
                    newText={selectedChange.new_value || ''}
                    diffSummary={selectedChange.diff_summary}
                  />
                </>
              ) : (
                <div className="py-20 text-center text-slate-500 text-xs">
                  Оберіть подію змін зі списку ліворуч для перегляду розбіжностей.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
