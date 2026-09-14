import { useState, useEffect, FormEvent } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { api } from '../../api/client.ts';
import { Source, SyncJob } from '../../types.ts';
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
  Clock
} from 'lucide-react';

export function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Test URL state
  const [testUrl, setTestUrl] = useState('https://wylsa.com/feed/');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; status?: number; title?: string; error?: string } | null>(null);

  // Add source modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [parserType, setParserType] = useState<'rss' | 'html'>('rss');
  const [syncInterval, setSyncInterval] = useState(60);
  const [message, setMessage] = useState('');

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

  const handleTestUrl = async (e: FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.admin.testSource(testUrl);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleTriggerSync = async (sourceId: string, sourceName: string) => {
    setSyncingId(sourceId);
    setMessage('');
    try {
      const res = await api.admin.triggerSync(sourceId);
      setMessage(
        `Синхронізацію джерела "${sourceName}" завершено: імпортовано ${res.job.items_imported}, оновлено ${res.job.items_updated}`
      );
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Помилка синхронізації джерела');
    } finally {
      setSyncingId(null);
    }
  };

  const handleAddSource = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.admin.createSource({
        name,
        base_url: baseUrl,
        feed_url: feedUrl || baseUrl,
        parser_type: parserType,
        sync_interval_min: syncInterval,
        enabled: true,
        sync_enabled: true
      });
      setShowAddModal(false);
      setName('');
      setBaseUrl('');
      setFeedUrl('');
      setMessage('Джерело контенту додано успішно!');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Помилка створення джерела');
    }
  };

  const handleDeleteSource = async (id: string, sourceName: string) => {
    if (!window.confirm(`Видалити джерело "${sourceName}"?`)) return;
    try {
      await api.admin.deleteSource(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Помилка видалення');
    }
  };

  return (
    <AdminLayout
      title="Джерела контенту та парсинг"
      subtitle="Управління зовнішніми RSS/HTML джерелами, частотою опитування та безпекою SSRF"
      onRefresh={loadData}
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

        {/* SSRF & Connection Diagnostic Tool */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Діагностика першоджерела (SSRF Guard & Connectivity Test)
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Перевірте доступність зовнішнього URL. Вбудований SSRF-фільтр автоматично блокує приватні IP-адреси (127.0.0.1, 10.0.0.0/8, 192.168.0.0/16) та хмарні метадані.
          </p>

          <form onSubmit={handleTestUrl} className="flex flex-col sm:flex-row gap-2 pt-1">
            <input
              type="url"
              value={testUrl}
              onChange={e => setTestUrl(e.target.value)}
              placeholder="https://example.com/feed/"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              required
            />
            <button
              type="submit"
              disabled={testing}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors border border-slate-700 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{testing ? 'Перевірка зʼєднання...' : 'Тестувати джерело'}</span>
            </button>
          </form>

          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <p className="font-bold">
                  {testResult.success ? 'Джерело успішно відповідає!' : 'Помилка доступу до джерела:'}
                </p>
                {testResult.status && <p>HTTP Status Code: {testResult.status}</p>}
                {testResult.title && <p>Витягнутий заголовок: "{testResult.title}"</p>}
                {testResult.error && <p className="font-mono text-[11px]">{testResult.error}</p>}
              </div>
            </div>
          )}
        </div>

        {/* SOURCES LIST */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>Налаштовані першоджерела ({sources.length})</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Додати джерело</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.map(s => (
              <div
                key={s.id}
                className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{s.name}</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-900 text-emerald-400 border border-slate-800">
                      {s.parser_type}
                    </span>
                  </div>

                  <a
                    href={s.base_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1 truncate"
                  >
                    <span>{s.base_url}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                    <p>Feed URL: {s.feed_url}</p>
                    <p>Інтервал опитування: кожні {s.sync_interval_minutes} хв</p>
                    {s.last_synced_at && (
                      <p>Остання синхронізація: {new Date(s.last_synced_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleTriggerSync(s.id, s.name)}
                    disabled={syncingId === s.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingId === s.id ? 'animate-spin' : ''}`} />
                    <span>{syncingId === s.id ? 'Парсинг...' : 'Синхронізувати зараз'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSource(s.id, s.name)}
                    className="p-1.5 rounded text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SYNC HISTORY JOBS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Історія сесій парсингу (Sync Logs)</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-[11px] text-slate-400 uppercase">
                <tr>
                  <th className="pb-2">ID Сесії</th>
                  <th className="pb-2">Статус</th>
                  <th className="pb-2">Знайдено</th>
                  <th className="pb-2">Імпортовано</th>
                  <th className="pb-2">Оновлено</th>
                  <th className="pb-2">Час виконання</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {syncJobs.map(job => (
                  <tr key={job.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 pr-2 text-slate-400">{job.id}</td>
                    <td className="py-2.5 pr-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-sans text-[10px] font-bold">
                        {job.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-2 text-slate-300">{job.items_found}</td>
                    <td className="py-2.5 pr-2 text-emerald-400 font-bold">{job.items_imported}</td>
                    <td className="py-2.5 pr-2 text-amber-400">{job.items_updated}</td>
                    <td className="py-2.5 text-slate-500 font-sans text-xs">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Source Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <h3 className="font-bold text-white text-sm">Додати нове джерело</h3>

              <form onSubmit={handleAddSource} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Назва видання / сайту</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Wylsa, The Verge, Engadget..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Головна адреса сайту (Base URL)</label>
                  <input
                    type="url"
                    value={baseUrl}
                    onChange={e => setBaseUrl(e.target.value)}
                    placeholder="https://wylsa.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Feed URL (RSS або Sitemap)</label>
                  <input
                    type="url"
                    value={feedUrl}
                    onChange={e => setFeedUrl(e.target.value)}
                    placeholder="https://wylsa.com/feed/"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Тип парсера</label>
                    <select
                      value={parserType}
                      onChange={e => setParserType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="rss">RSS / Atom</option>
                      <option value="html">HTML Scraper</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Інтервал (хв)</label>
                    <input
                      type="number"
                      value={syncInterval}
                      onChange={e => setSyncInterval(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
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
                    Зберегти джерело
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
