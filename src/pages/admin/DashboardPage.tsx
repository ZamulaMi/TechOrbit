import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { api } from '../../api/client.ts';
import { Article, ChangeEvent, AuditLog } from '../../types.ts';
import {
  FileText,
  CheckCircle2,
  Clock,
  Radio,
  GitCompare,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Plus,
  ShieldCheck,
  Cpu
} from 'lucide-react';

export function DashboardPage() {
  const [stats, setStats] = useState<{
    counts: {
      articlesTotal: number;
      published: number;
      reviewQueue: number;
      imported: number;
      sources: number;
      pendingChanges: number;
      translations: number;
      unreadNotifications: number;
    };
    recentArticles: Article[];
    recentChanges: ChangeEvent[];
    recentAudit: AuditLog[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const loadDashboard = async () => {
    try {
      const data = await api.admin.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleQuickSync = async () => {
    setSyncing(true);
    setSyncMessage('');
    try {
      // Sync wylsa source as example
      const result = await api.admin.triggerSync('src_wylsa');
      setSyncMessage(`Синхронізацію завершено: ${result.job.items_imported} імпортовано, ${result.job.items_updated} оновлено`);
      await loadDashboard();
    } catch (err: any) {
      setSyncMessage(err.message || 'Помилка синхронізації');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AdminLayout
      title="Панель управління (Dashboard)"
      subtitle="Огляд статистики, черги модерації та стану агрегації"
      onRefresh={loadDashboard}
      refreshing={loading}
    >
      <div className="space-y-6">
        {/* Quick Sync feedback banner */}
        {syncMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
            <span>{syncMessage}</span>
            <button
              type="button"
              onClick={() => setSyncMessage('')}
              className="text-emerald-400 font-bold hover:underline"
            >
              Закрити
            </button>
          </div>
        )}

        {/* METRIC CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold">Всього статей</span>
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {stats?.counts.articlesTotal ?? '...'}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <span>Опубліковано:</span>
              <span className="font-semibold text-emerald-400">{stats?.counts.published ?? 0}</span>
            </div>
          </div>

          {/* Card 2: Review Queue */}
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-amber-400">
              <span className="text-xs font-semibold">Черга модерації</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-amber-400">
              {stats?.counts.reviewQueue ?? '...'}
            </div>
            <Link
              to="/admin/review-queue"
              className="text-[11px] text-amber-300 hover:underline flex items-center gap-1"
            >
              <span>Переглянути чергу</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Card 3: Sources & Imported */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold">Активні джерела</span>
              <Radio className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {stats?.counts.sources ?? '...'}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <span>Імпортовано:</span>
              <span className="font-semibold text-cyan-400">{stats?.counts.imported ?? 0}</span>
            </div>
          </div>

          {/* Card 4: Diffs & Changes */}
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-rose-400">
              <span className="text-xs font-semibold">Зміни в джерелах (Diffs)</span>
              <GitCompare className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-rose-400">
              {stats?.counts.pendingChanges ?? '...'}
            </div>
            <Link
              to="/admin/changes"
              className="text-[11px] text-rose-300 hover:underline flex items-center gap-1"
            >
              <span>Вирішити розбіжності</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* QUICK ACTIONS BAR */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">Швидкі операції:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/admin/articles/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm shadow-emerald-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Створити статтю</span>
            </Link>

            <button
              type="button"
              onClick={handleQuickSync}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{syncing ? 'Синхронізація...' : 'Запустити парсинг (Wylsa)'}</span>
            </button>

            <Link
              to="/admin/review-queue"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Модерація ({stats?.counts.reviewQueue ?? 0})</span>
            </Link>
          </div>
        </div>

        {/* 2-COLUMN SECTION: RECENT ARTICLES & PENDING DIFFS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recent Articles */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Останні статті в системі</span>
              </h3>
              <Link to="/admin/articles" className="text-xs text-emerald-400 hover:underline">
                Всі матеріали ({stats?.counts.articlesTotal ?? 0}) →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 text-[11px] text-slate-400 uppercase">
                  <tr>
                    <th className="pb-2 font-semibold">Назва статті</th>
                    <th className="pb-2 font-semibold">Статус</th>
                    <th className="pb-2 font-semibold">Категорія</th>
                    <th className="pb-2 font-semibold text-right">Дія</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stats?.recentArticles.map(art => (
                    <tr key={art.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 pr-3">
                        <div className="font-semibold text-white truncate max-w-sm">{art.title}</div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {art.source_name ? `Джерело: ${art.source_name}` : 'Власна публікація'} • {new Date(art.updated_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <StatusBadge status={art.status} />
                      </td>
                      <td className="py-3 pr-3 text-slate-400">
                        {art.category_name_uk || '—'}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/admin/articles/${art.id}/edit`}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors"
                        >
                          Редагувати
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Diffs & Upstream Updates */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-rose-400" />
                <span>Зміни в першоджерелах</span>
              </h3>
              <Link to="/admin/changes" className="text-xs text-rose-400 hover:underline">
                Переглянути всі
              </Link>
            </div>

            {(!stats?.recentChanges || stats.recentChanges.length === 0) ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <ShieldCheck className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
                <span>Розбіжностей не виявлено. Всі матеріали синхронізовані.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentChanges.map(change => (
                  <div
                    key={change.id}
                    className="p-3 bg-slate-950 border border-rose-950 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-rose-400 uppercase">
                        {change.event_type === 'content_updated' ? 'Оновлення тексту' : change.event_type}
                      </span>
                      <span className="text-slate-500">
                        {new Date(change.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-slate-300 font-medium leading-snug">
                      {change.article_title || change.source_title || 'Зміна статті'}
                    </p>

                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {change.diff_summary}
                    </p>

                    <div className="pt-1 flex items-center justify-end">
                      <Link
                        to="/admin/changes"
                        className="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-[11px] font-semibold"
                      >
                        Порівняти диф →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Architecture status note */}
            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>База даних:</span>
                <span className="text-emerald-400 font-mono">SQLite (Persistent)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>AI Переклад:</span>
                <span className="text-emerald-400 font-mono">Gemini API Ready</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Безпека:</span>
                <span className="text-emerald-400 font-mono">SSRF Guard Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* RECENT AUDIT LOG */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Останні події в системі (Audit Trail)</span>
            </h3>
            <Link to="/admin/audit" className="text-xs text-slate-400 hover:text-white">
              Повний журнал →
            </Link>
          </div>

          <div className="divide-y divide-slate-800/60 text-xs">
            {stats?.recentAudit.map(log => (
              <div key={log.id} className="py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-mono text-slate-400 text-[11px]">{log.action}</span>
                  <span className="text-slate-300">
                    {log.entity_type} #{log.entity_id}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span>{log.username || 'Admin'}</span>
                  <span>•</span>
                  <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
