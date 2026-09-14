import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { api } from '../../api/client.ts';
import { Article } from '../../types.ts';
import {
  CheckSquare,
  CheckCircle,
  XCircle,
  Eye,
  Send,
  ExternalLink,
  Edit,
  ShieldAlert,
  Clock
} from 'lucide-react';

export function ReviewQueuePage() {
  const [queue, setQueue] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getReviewQueue();
      setQueue(data);
    } catch (err) {
      console.error('Failed to load review queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleApprove = async (id: string, title: string) => {
    try {
      await api.admin.approveArticle(id);
      setMessage(`Матеріал "${title}" схвалено для публікації!`);
      await loadQueue();
    } catch (err: any) {
      alert(err.message || 'Помилка схвалення');
    }
  };

  const handlePublish = async (id: string, title: string) => {
    try {
      await api.admin.publishArticle(id);
      setMessage(`Матеріал "${title}" опубліковано наживо на TechOrbit!`);
      await loadQueue();
    } catch (err: any) {
      alert(err.message || 'Помилка публікації');
    }
  };

  const handleReject = async (e: FormEvent) => {
    e.preventDefault();
    if (!rejectingId) return;

    try {
      await api.admin.rejectArticle(rejectingId, rejectReason);
      setMessage('Матеріал повернуто на доопрацювання (чернетку)');
      setRejectingId(null);
      setRejectReason('');
      await loadQueue();
    } catch (err: any) {
      alert(err.message || 'Помилка відхилення');
    }
  };

  return (
    <AdminLayout
      title="Черга модерації та перевірки"
      subtitle="Матеріали, які потребують перевірки головним редактором перед публікацією"
      onRefresh={loadQueue}
      refreshing={loading}
    >
      <div className="space-y-5">
        {message && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
            <span>{message}</span>
            <button type="button" onClick={() => setMessage('')} className="font-bold hover:underline">
              ✕
            </button>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 space-y-1">
            <h4 className="font-bold text-white">Редакційний протокол модерації</h4>
            <p className="text-slate-400">
              Кожна автоматично зібрана або перекладена стаття проходить вичитку фактів, перевірку термінології та наявність посилання на першоджерело.
            </p>
          </div>
        </div>

        {/* Queue Items */}
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs">Завантаження черги...</p>
          </div>
        ) : queue.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="font-bold text-white text-sm">Черга модерації порожня</h3>
            <p className="text-xs text-slate-400">
              Всі наявні матеріали перевірено або опубліковано.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {queue.map(art => (
              <div
                key={art.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 hover:border-slate-700 transition-all shadow-xl"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <StatusBadge status={art.status} />
                    <span className="text-xs font-semibold text-emerald-400">
                      {art.category_name_uk || 'Без рубрики'}
                    </span>
                    {art.source_name && (
                      <span className="text-[11px] text-slate-400">
                        Першоджерело: <strong className="text-slate-200">{art.source_name}</strong>
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-white truncate max-w-2xl">
                    {art.title}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed max-w-3xl">
                    {art.excerpt}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                    <span>Автор: {art.author_name || 'TechOrbit Team'}</span>
                    <span>•</span>
                    <span>Створено: {new Date(art.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/admin/articles/${art.id}/edit`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Вичитати & Правки</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleApprove(art.id, art.title)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-sm"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Схвалити</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePublish(art.id, art.title)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm shadow-emerald-600/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Опублікувати зараз</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRejectingId(art.id)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Відхилити на доопрацювання"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reject Modal */}
        {rejectingId && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <h3 className="font-bold text-white text-sm">Повернути матеріал на доопрацювання</h3>
              <p className="text-xs text-slate-400">
                Вкажіть причину відхилення (наприклад: неповний переклад, відсутні джерела фактів).
              </p>

              <form onSubmit={handleReject} className="space-y-3">
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Зауваження для редактора..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  required
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectingId(null)}
                    className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                  >
                    Відхилити в чернетки
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
