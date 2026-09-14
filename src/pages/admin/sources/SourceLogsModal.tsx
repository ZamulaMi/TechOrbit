import { useState, useEffect } from 'react';
import { api } from '../../../api/client.ts';
import { Source, SyncLog, SyncJob } from '../../../types.ts';
import { Terminal, RefreshCw, X, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface SourceLogsModalProps {
  source: Source | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SourceLogsModal({ source, isOpen, onClose }: SourceLogsModalProps) {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!source) return;
    setLoading(true);
    try {
      const [logsData, jobsData] = await Promise.all([
        api.admin.getSourceLogs(source.id, selectedJobId || undefined),
        api.admin.getSyncJobs(source.id)
      ]);
      setLogs(logsData);
      setJobs(jobsData);
    } catch (err) {
      console.error('Failed to load logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && source) {
      loadData();
    }
  }, [isOpen, source, selectedJobId]);

  if (!isOpen || !source) return null;

  const filteredLogs = logs.filter(l => (levelFilter === 'all' ? true : l.level === levelFilter));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[85vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-white text-base">Журнал синхронізації: {source.name}</h3>
              <p className="text-xs text-slate-400">Деталізовані технічні логи краулінгу та інгестіону</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Сесія запуску:</label>
            <select
              value={selectedJobId}
              onChange={e => setSelectedJobId(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            >
              <option value="">Всі сесії</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>
                  {j.id} ({new Date(j.started_at || (j as any).created_at).toLocaleTimeString()}) - {j.status}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Рівень:</span>
            <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs">
              {(['all', 'info', 'warn', 'error'] as const).map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevelFilter(lvl)}
                  className={`px-2 py-0.5 rounded capitalize ${
                    levelFilter === lvl
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Оновити"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Logs Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[11px] bg-slate-950">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-600">
              Логи синхронізації відсутні для обраного фільтра.
            </div>
          ) : (
            filteredLogs.map(log => (
              <div
                key={log.id}
                className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-start gap-2.5 hover:bg-slate-900 transition-colors"
              >
                {log.level === 'info' && <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />}
                {log.level === 'warn' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />}
                {log.level === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />}

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="uppercase font-bold tracking-wider">{log.level}</span>
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-200 font-sans text-xs">{log.message}</p>
                  {log.details && (
                    <pre className="p-2 bg-slate-950 rounded text-[10px] text-slate-400 overflow-x-auto">
                      {log.details}
                    </pre>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
