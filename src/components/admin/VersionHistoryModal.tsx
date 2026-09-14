import { useState, useEffect } from 'react';
import { api } from '../../api/client.ts';
import { ArticleVersion } from '../../types.ts';
import { DiffViewer } from '../common/DiffViewer.tsx';
import { History, RotateCcw, GitCompare, Calendar, User, Eye, X, CheckCircle2 } from 'lucide-react';

interface VersionHistoryModalProps {
  articleId: string;
  articleTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onVersionRestored?: () => void;
}

export function VersionHistoryModal({
  articleId,
  articleTitle,
  isOpen,
  onClose,
  onVersionRestored
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<ArticleVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<ArticleVersion | null>(null);
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<any | null>(null);
  const [comparing, setComparing] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const loadVersions = async () => {
    setLoading(true);
    try {
      const list = await api.admin.getVersions(articleId);
      setVersions(list);
      if (list.length > 0 && !selectedVersion) {
        setSelectedVersion(list[0]);
      }
    } catch (err) {
      console.error('Failed to load article versions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadVersions();
      setCompareResult(null);
      setCompareVersionId(null);
      setActionMessage('');
    }
  }, [isOpen, articleId]);

  const handleRollback = async (versionId: string) => {
    if (!confirm('Ви впевнені, що бажаєте відкотити статтю до цієї версії? Буде створено нову версію.')) {
      return;
    }
    try {
      const res = await api.admin.rollbackVersion(articleId, versionId);
      setActionMessage(`Успішно відновлено! Створено нову версію v${res.newVersionNumber || ''}`);
      await loadVersions();
      if (onVersionRestored) onVersionRestored();
    } catch (err: any) {
      alert(err.message || 'Помилка відновлення версії');
    }
  };

  const handleCompare = async (v1Id: string, v2Id: string) => {
    setComparing(true);
    try {
      const res = await api.admin.compareVersions(v1Id, v2Id);
      setCompareResult(res);
    } catch (err: any) {
      alert(err.message || 'Помилка порівняння версій');
    } finally {
      setComparing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Історія версій та відкатів</h3>
              <p className="text-xs text-slate-400 truncate max-w-xl">{articleTitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {actionMessage && (
          <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Left Column: Version list */}
          <div className="md:col-span-4 border-r border-slate-800 p-3 overflow-y-auto space-y-2 bg-slate-950/30">
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Збережені версії ({versions.length})
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs">Завантаження версій...</div>
            ) : versions.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">Немає збережених версій</div>
            ) : (
              versions.map((ver, idx) => {
                const isSelected = selectedVersion?.id === ver.id;
                const isCompare = compareVersionId === ver.id;

                return (
                  <div
                    key={ver.id}
                    onClick={() => {
                      setSelectedVersion(ver);
                      setCompareResult(null);
                    }}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-500 text-white shadow-sm'
                        : isCompare
                        ? 'bg-amber-950/30 border-amber-500/60 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-slate-950 text-emerald-400 border border-emerald-500/30 text-[11px]">
                          v{ver.version_number}
                        </span>
                        {idx === 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                            Поточна
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(ver.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="font-semibold text-[11px] text-slate-200 line-clamp-1 mb-1">{ver.title}</p>

                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span className="truncate">Причина: {ver.change_reason || 'Оновлення'}</span>
                      <span className="shrink-0 text-slate-500">
                        {new Date(ver.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Quick action buttons on version */}
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          if (selectedVersion && selectedVersion.id !== ver.id) {
                            setCompareVersionId(ver.id);
                            handleCompare(selectedVersion.id, ver.id);
                          }
                        }}
                        disabled={selectedVersion?.id === ver.id}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 disabled:opacity-40 text-[10px] flex items-center gap-1 font-medium"
                      >
                        <GitCompare className="w-3 h-3" />
                        Порівняти
                      </button>

                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleRollback(ver.id);
                          }}
                          className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[10px] flex items-center gap-1 font-semibold ml-auto"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Відкотити
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Version Inspector & Diff Viewer */}
          <div className="md:col-span-8 p-4 overflow-y-auto space-y-4">
            {comparing ? (
              <div className="py-20 text-center text-slate-500 text-xs">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Порівняння версій...
              </div>
            ) : compareResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">
                      Порівняння версії v{compareResult.version1.version_number} та v
                      {compareResult.version2.version_number}
                    </span>
                    <span className="text-[11px] text-slate-400">({compareResult.summary})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCompareResult(null)}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
                  >
                    Закрити порівняння
                  </button>
                </div>

                <DiffViewer
                  diff={compareResult.diff}
                  previousTitle={compareResult.version2.title}
                  newTitle={compareResult.version1.title}
                  previousContent={compareResult.version2.content}
                  newContent={compareResult.version1.content}
                  diffSummary={compareResult.summary}
                />
              </div>
            ) : selectedVersion ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
                        Версія v{selectedVersion.version_number}
                      </span>
                      <span className="text-slate-400">
                        {new Date(selectedVersion.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-300 font-medium mt-1">Причина: {selectedVersion.change_reason}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRollback(selectedVersion.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Відновити цю версію</span>
                  </button>
                </div>

                {/* Metadata */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-white text-sm">{selectedVersion.title}</h4>
                  {selectedVersion.subtitle && (
                    <p className="text-slate-300 italic">{selectedVersion.subtitle}</p>
                  )}
                  {selectedVersion.excerpt && (
                    <p className="text-slate-400">{selectedVersion.excerpt}</p>
                  )}
                </div>

                {/* Content preview */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 max-h-96 overflow-y-auto">
                  <div className="text-[10px] font-bold uppercase text-slate-500 mb-2">Тіло статті (HTML/Blocks):</div>
                  <div
                    className="prose prose-invert prose-xs max-w-none text-slate-300"
                    dangerouslySetInnerHTML={{ __html: selectedVersion.content }}
                  />
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-500 text-xs">Оберіть версію зі списку ліворуч</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
