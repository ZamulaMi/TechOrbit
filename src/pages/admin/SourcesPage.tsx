import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { api } from '../../api/client.ts';
import { Source, SyncJob } from '../../types.ts';
import { SourceModal } from './sources/SourceModal.tsx';
import { SourceDiagnosticModal } from './sources/SourceDiagnosticModal.tsx';
import { SourceLogsModal } from './sources/SourceLogsModal.tsx';
import { SourceArticlesModal } from './sources/SourceArticlesModal.tsx';
import {
  Radio,
  Plus,
  Play,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Search,
  Trash2,
  Clock,
  Pause,
  Edit2,
  FileText,
  Terminal,
  Activity,
  Layers,
  Database
} from 'lucide-react';

export function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [parserFilter, setParserFilter] = useState('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [modalSource, setModalSource] = useState<Source | null>(null);
  const [showSourceModal, setShowSourceModal] = useState(false);

  const [diagnosticUrl, setDiagnosticUrl] = useState('');
  const [diagnosticParser, setDiagnosticParser] = useState('generic_rss');
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);

  const [logSource, setLogSource] = useState<Source | null>(null);
  const [showLogsModal, setShowLogsModal] = useState(false);

  const [articleSource, setArticleSource] = useState<Source | null>(null);
  const [showArticlesModal, setShowArticlesModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [srcs, jobs] = await Promise.all([
        api.admin.getSources(),
        api.admin.getSyncJobs()
      ]);
      setSources(srcs);
      setSyncJobs(jobs);
    } catch (err) {
      console.error('Failed to load sources', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSource = async (data: Partial<Source>) => {
    if (modalSource) {
      await api.admin.updateSource(modalSource.id, data);
      setMessage({ type: 'success', text: `Джерело "${data.name}" успішно оновлено.` });
    } else {
      await api.admin.createSource(data);
      setMessage({ type: 'success', text: `Джерело "${data.name}" успішно додано.` });
    }
    await loadData();
  };

  const handleTogglePause = async (source: Source) => {
    try {
      const updated = await api.admin.togglePauseSource(source.id);
      setMessage({
        type: 'success',
        text: `Синхронізацію джерела "${source.name}" ${updated.sync_enabled ? 'відновлено (Active)' : 'призупинено (Paused)'}.`
      });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Помилка зміни статусу' });
    }
  };

  const handleTriggerSync = async (source: Source) => {
    setSyncingId(source.id);
    setMessage(null);
    try {
      const res = await api.admin.triggerSync(source.id);
      setMessage({
        type: 'success',
        text: `Синхронізація "${source.name}" завершена: виявлено ${res.discovered}, імпортовано ${res.imported} нових статей (у чергу PENDING_REVIEW), оновлено ${res.updated} (UPDATE_PENDING).`
      });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Помилка виконання синхронізації' });
    } finally {
      setSyncingId(null);
    }
  };

  const handleDeleteSource = async (source: Source) => {
    if (!window.confirm(`Видалити джерело "${source.name}" та всі пов'язані налаштування краулінгу?`)) return;
    try {
      await api.admin.deleteSource(source.id);
      setMessage({ type: 'success', text: `Джерело "${source.name}" видалено.` });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Помилка видалення' });
    }
  };

  const openDiagnostic = (sourceUrl?: string, pType?: string) => {
    setDiagnosticUrl(sourceUrl || 'https://wylsa.com/feed/');
    setDiagnosticParser(pType || 'wylsa_custom');
    setShowDiagnosticModal(true);
  };

  // Filter sources
  const filteredSources = sources.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.base_url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.feed_url && s.feed_url.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesParser = parserFilter === 'all' || s.parser_type === parserFilter;
    return matchesSearch && matchesParser;
  });

  // Calculate high-level stats
  const totalArticlesCount = sources.reduce((acc, s) => acc + (s.total_articles || 0), 0);
  const totalUpdatesCount = sources.reduce((acc, s) => acc + (s.total_updates || 0), 0);
  const activeSourcesCount = sources.filter(s => s.status === 'active' && s.sync_enabled).length;

  return (
    <AdminLayout
      title="Джерела контенту (Sources & Ingestion Engine)"
      subtitle="Багатоджерельна агрегація: RSS, Sitemap, HTML Scraper, Wylsa Custom Parser та SSRF-захист"
      onRefresh={loadData}
      refreshing={loading}
    >
      <div className="space-y-6">
        {/* Banner message */}
        {message && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Підключені джерела
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-white">{sources.length}</span>
                <span className="text-xs text-emerald-400 font-medium">({activeSourcesCount} активних)</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Імпортовано в чергу
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-white">{totalArticlesCount}</span>
                <span className="text-[11px] text-slate-400">матеріалів</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Зафіксовано змін
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-white">{totalUpdatesCount}</span>
                <span className="text-[11px] text-purple-400">update_pending</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                SSRF Guard фільтр
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-emerald-400">ENFORCED</span>
                <span className="text-[11px] text-slate-400">(0.0.0.0, 127.0.0.1 blocked)</span>
              </div>
            </div>
          </div>
        </div>

        {/* SOURCES TABLE & ACTIONS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Action Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Пошук джерел..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={parserFilter}
                onChange={e => setParserFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Усі парсери</option>
                <option value="wylsa_custom">Wylsa Custom</option>
                <option value="generic_rss">Generic RSS</option>
                <option value="generic_html">HTML Scraper</option>
                <option value="sitemap">Sitemap</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => openDiagnostic()}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700 flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Тестувати джерело (SSRF)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalSource(null);
                  setShowSourceModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Додати джерело</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">URL</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Enabled</th>
                  <th className="py-3 px-3">Parser</th>
                  <th className="py-3 px-3">Last Sync</th>
                  <th className="py-3 px-3">Next Sync</th>
                  <th className="py-3 px-2 text-center">New</th>
                  <th className="py-3 px-2 text-center">Updates</th>
                  <th className="py-3 px-2 text-center">Errors</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSources.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-500">
                      Не знайдено підключених джерел за вашим запитом.
                    </td>
                  </tr>
                ) : (
                  filteredSources.map(s => {
                    const isSyncing = syncingId === s.id;
                    return (
                      <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                        {/* 1. Name */}
                        <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span>{s.name}</span>
                          </div>
                        </td>

                        {/* 2. URL */}
                        <td className="py-3 px-4 max-w-[180px]">
                          <div className="space-y-0.5 truncate">
                            <a
                              href={s.base_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-300 hover:text-emerald-400 transition-colors inline-flex items-center gap-1 truncate font-mono text-[11px]"
                            >
                              <span>{s.base_url.replace(/^https?:\/\//, '')}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                            {s.feed_url && (
                              <span className="block text-[10px] text-slate-500 font-mono truncate">
                                Feed: {s.feed_url.replace(/^https?:\/\//, '')}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Status */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-block ${
                              s.status === 'active'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                : s.status === 'syncing'
                                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60 animate-pulse'
                                : s.status === 'paused'
                                ? 'bg-slate-800 text-slate-400 border border-slate-700'
                                : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>

                        {/* 4. Enabled */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePause(s)}
                            className={`w-8 h-4 rounded-full transition-colors relative inline-flex items-center p-0.5 ${
                              s.sync_enabled ? 'bg-emerald-600' : 'bg-slate-700'
                            }`}
                            title={s.sync_enabled ? 'Синхронізація увімкнена' : 'Синхронізація на паузі'}
                          >
                            <span
                              className={`w-3 h-3 rounded-full bg-white transition-transform ${
                                s.sync_enabled ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>

                        {/* 5. Parser */}
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 font-mono text-[10px] border border-slate-800">
                            {s.parser_type === 'wylsa_custom'
                              ? 'Wylsa Parser'
                              : s.parser_type === 'generic_rss'
                              ? 'RSS / Atom'
                              : s.parser_type === 'sitemap'
                              ? 'Sitemap XML'
                              : 'HTML Scraper'}
                          </span>
                        </td>

                        {/* 6. Last Sync */}
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {s.last_sync_at ? new Date(s.last_sync_at).toLocaleTimeString() : '—'}
                        </td>

                        {/* 7. Next Sync */}
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {s.next_sync_at && s.sync_enabled ? new Date(s.next_sync_at).toLocaleTimeString() : 'Paused'}
                        </td>

                        {/* 8. New Articles */}
                        <td className="py-3 px-2 text-center font-bold text-emerald-400 font-mono">
                          <button
                            type="button"
                            onClick={() => {
                              setArticleSource(s);
                              setShowArticlesModal(true);
                            }}
                            className="hover:underline"
                            title="Переглянути імпортовані матеріали"
                          >
                            {s.total_articles || 0}
                          </button>
                        </td>

                        {/* 9. Updates */}
                        <td className="py-3 px-2 text-center font-bold text-purple-400 font-mono">
                          {s.total_updates || 0}
                        </td>

                        {/* 10. Errors */}
                        <td className="py-3 px-2 text-center font-bold text-rose-400 font-mono">
                          {s.total_errors || 0}
                        </td>

                        {/* 11. Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Sync Now */}
                            <button
                              type="button"
                              onClick={() => handleTriggerSync(s)}
                              disabled={isSyncing}
                              className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors disabled:opacity-50"
                              title="Sync Now (Запустити синхронізацію)"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                            </button>

                            {/* Pause / Resume */}
                            <button
                              type="button"
                              onClick={() => handleTogglePause(s)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
                              title={s.sync_enabled ? 'Pause' : 'Resume'}
                            >
                              {s.sync_enabled ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                            </button>

                            {/* Test Source */}
                            <button
                              type="button"
                              onClick={() => openDiagnostic(s.feed_url || s.base_url, s.parser_type)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
                              title="Test Source (Діагностика першоджерела)"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                            </button>

                            {/* View Logs */}
                            <button
                              type="button"
                              onClick={() => {
                                setLogSource(s);
                                setShowLogsModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
                              title="View Logs (Журнал краулінгу)"
                            >
                              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                            </button>

                            {/* View Articles */}
                            <button
                              type="button"
                              onClick={() => {
                                setArticleSource(s);
                                setShowArticlesModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
                              title="View Articles (Імпортовані статті)"
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-400" />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => {
                                setModalSource(s);
                                setShowSourceModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
                              title="Edit (Редагувати параметри)"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteSource(s)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete (Видалити джерело)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SYNC HISTORY JOBS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Останні сесії синхронізації (Sync History)</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">Автоматичне оновлення</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-mono">
                <tr>
                  <th className="pb-2">ID Сесії</th>
                  <th className="pb-2">Джерело</th>
                  <th className="pb-2">Статус</th>
                  <th className="pb-2 text-center">Виявлено</th>
                  <th className="pb-2 text-center">Нові</th>
                  <th className="pb-2 text-center">Оновлені</th>
                  <th className="pb-2 text-center">Помилки</th>
                  <th className="pb-2">Тривалість</th>
                  <th className="pb-2 text-right">Час запуску</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {syncJobs.slice(0, 10).map(job => (
                  <tr key={job.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 text-slate-400">{job.id}</td>
                    <td className="py-2.5 text-slate-200 font-sans font-medium">{job.source_name || job.source_id}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold uppercase ${
                          job.status === 'completed'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : job.status === 'running'
                            ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60 animate-pulse'
                            : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-center text-slate-300">{job.items_found}</td>
                    <td className="py-2.5 text-center text-emerald-400 font-bold">{job.items_imported}</td>
                    <td className="py-2.5 text-center text-purple-400 font-bold">{job.items_updated}</td>
                    <td className="py-2.5 text-center text-rose-400">{job.items_failed}</td>
                    <td className="py-2.5 text-slate-400">{job.duration_ms ? `${job.duration_ms}ms` : '—'}</td>
                    <td className="py-2.5 text-right text-slate-500 font-sans text-xs">
                      {new Date(job.started_at || (job as any).created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODALS */}
        <SourceModal
          source={modalSource}
          isOpen={showSourceModal}
          onClose={() => setShowSourceModal(false)}
          onSave={handleSaveSource}
        />

        <SourceDiagnosticModal
          initialUrl={diagnosticUrl}
          initialParserType={diagnosticParser}
          isOpen={showDiagnosticModal}
          onClose={() => setShowDiagnosticModal(false)}
        />

        <SourceLogsModal
          source={logSource}
          isOpen={showLogsModal}
          onClose={() => setShowLogsModal(false)}
        />

        <SourceArticlesModal
          source={articleSource}
          isOpen={showArticlesModal}
          onClose={() => setShowArticlesModal(false)}
        />
      </div>
    </AdminLayout>
  );
}
