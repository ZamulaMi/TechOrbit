import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { api } from '../../api/client.ts';
import { AuditLog } from '../../types.ts';
import { ShieldCheck, User, Clock, Terminal } from 'lucide-react';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAudit = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getAuditLogs(100);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, []);

  return (
    <AdminLayout
      title="Журнал аудиту та безпеки (Audit Trail)"
      subtitle="Повна хронологія всіх дій користувачів, змін статусу статей та системних подій"
      onRefresh={loadAudit}
      refreshing={loading}
    >
      <div className="space-y-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-3">Час</th>
                  <th className="py-3 px-3">Дія (Action)</th>
                  <th className="py-3 px-3">Користувач</th>
                  <th className="py-3 px-3">Об'єкт (Entity)</th>
                  <th className="py-3 px-3">IP Адреса</th>
                  <th className="py-3 px-3">Деталі</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                      Завантаження журналу...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                      Журнал аудиту порожній.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-bold">
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-300 font-sans font-medium">
                        {log.username || 'System'}
                      </td>

                      <td className="py-3 px-3 text-slate-400">
                        {log.entity_type} #{log.entity_id}
                      </td>

                      <td className="py-3 px-3 text-slate-500">
                        {log.ip_address || '127.0.0.1'}
                      </td>

                      <td className="py-3 px-3 text-slate-400 max-w-xs truncate" title={log.details}>
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
