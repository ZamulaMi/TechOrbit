import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { DiffViewer } from '../../components/common/DiffViewer.tsx';
import { api } from '../../api/client.ts';
import { ChangeEvent, Source, Article } from '../../types.ts';
import {
  GitCompare,
  Check,
  X,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckSquare,
  XSquare,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Layers,
  ChevronRight,
  Filter,
  Trash2,
  Eye
} from 'lucide-react';

export function ChangesPage() {
  const [changes, setChanges] = useState<ChangeEvent[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChange, setSelectedChange] = useState<ChangeEvent | null>(null);
  const [detailedChange, setDetailedChange] = useState<{
    changeEvent: ChangeEvent;
    oldSnapshot: any;
    newSnapshot: any;
    currentArticle: Article | null;
  } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Selective resolution state
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedBlockIndices, setSelectedBlockIndices] = useState<number[]>([]);
  const [deletedAction, setDeletedAction] = useState<'keep_published' | 'unpublish' | 'archive'>('keep_published');

  // Feedback & Testing
  const [message, setMessage] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [testArticleId, setTestArticleId] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [changesList, sourcesList, articlesRes] = await Promise.all([
        api.admin.getChanges({
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          sourceId: sourceFilter !== 'ALL' ? sourceFilter : undefined,
          severity: severityFilter !== 'ALL' ? severityFilter : undefined,
          changeType: typeFilter !== 'ALL' ? typeFilter : undefined
        }),
        api.admin.getSources(),
        api.admin.getArticles({ limit: 100 })
      ]);

      setChanges(changesList);
      setSources(sourcesList);
      setArticles(articlesRes.articles);

      if (articlesRes.articles.length > 0 && !testArticleId) {
        setTestArticleId(articlesRes.articles[0].id);
      }

      if (changesList.length > 0) {
        // If current selection is in list, keep it, otherwise select first
        const currentInList = selectedChange ? changesList.find(c => c.id === selectedChange.id) : null;
        const toSelect = currentInList || changesList[0];
        setSelectedChange(toSelect);
        fetchChangeDetails(toSelect.id);
      } else {
        setSelectedChange(null);
        setDetailedChange(null);
      }
    } catch (err) {
      console.error('Failed to load changes', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChangeDetails = async (id: string) => {
    try {
      const details = await api.admin.getChange(id);
      setDetailedChange(details);
      setSelectedFields([]);
      setSelectedBlockIndices([]);
    } catch (err) {
      console.error('Failed to get change details', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, sourceFilter, severityFilter, typeFilter]);

  const handleSelectChange = (ch: ChangeEvent) => {
    setSelectedChange(ch);
    fetchChangeDetails(ch.id);
  };

  const handleToggleField = (fieldName: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldName) ? prev.filter(f => f !== fieldName) : [...prev, fieldName]
    );
  };

  const handleToggleBlock = (blockIndex: number) => {
    setSelectedBlockIndices(prev =>
      prev.includes(blockIndex) ? prev.filter(i => i !== blockIndex) : [...prev, blockIndex]
    );
  };

  const handleResolve = async (
    action: 'accept_all' | 'reject_all' | 'accept_selected' | 'reject_selected'
  ) => {
    if (!selectedChange) return;

    try {
      const res = await api.admin.resolveChange(selectedChange.id, {
        action,
        acceptedFields: selectedFields,
        acceptedBlockIndices: selectedBlockIndices,
        deletedAction: selectedChange.event_type === 'ARTICLE_DELETED' ? deletedAction : undefined
      });

      setMessage(res.message || 'Дію успішно виконано');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Помилка виконання');
    }
  };

  const handleSimulateChange = async (type: string) => {
    if (!testArticleId) {
      alert('Оберіть статтю для тестування змін');
      return;
    }
    setSimulating(true);
    try {
      const res = await api.admin.simulateChange(type, testArticleId);
      if (res.result?.isChanged || res.result?.success) {
        setMessage(`Тестову подію ${type} успішно згенеровано! Стаття переведена в UPDATE_PENDING.`);
      } else {
        setMessage(`Тест виконано: ${res.result?.summary || 'Без змін (хеш ідентичний)'}`);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Помилка симуляції');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <AdminLayout
      title="Відстеження змін (Change Detection & Review)"
      subtitle="Виявлення оновлень, версіонування, блочний diff та резолюція правок"
      onRefresh={loadData}
      refreshing={loading}
    >
      <div className="space-y-6">
        {message && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{message}</span>
            </div>
            <button type="button" onClick={() => setMessage('')} className="font-bold hover:underline">
              ✕
            </button>
          </div>
        )}

        {/* SIMULATION & TESTING BAR */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                Тестовий полігон (Change Detection & Versioning Test Suite)
              </h4>
            </div>
            <span className="text-[11px] text-slate-400">
              Перевірка сценаріїв: нова стаття, правка заголовка, блоків, фото та видалення
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800">
            <div className="flex items-center gap-2 mr-2">
              <span className="text-[11px] text-slate-400">Цільова стаття:</span>
              <select
                value={testArticleId}
                onChange={e => setTestArticleId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 max-w-xs truncate"
              >
                {articles.map(art => (
                  <option key={art.id} value={art.id}>
                    {art.title.substring(0, 45)}...
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={simulating}
              onClick={() => handleSimulateChange('TITLE_CHANGED')}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>✏️ Тест: Зміна Title</span>
            </button>

            <button
              type="button"
              disabled={simulating}
              onClick={() => handleSimulateChange('CONTENT_CHANGED')}
              className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>📄 Тест: Блок тексту (Content)</span>
            </button>

            <button
              type="button"
              disabled={simulating}
              onClick={() => handleSimulateChange('IMAGE_CHANGED')}
              className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>🖼️ Тест: Оновлення Image</span>
            </button>

            <button
              type="button"
              disabled={simulating}
              onClick={() => handleSimulateChange('MULTIPLE_CHANGES')}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>⚡ Тест: Комплексні зміни</span>
            </button>

            <button
              type="button"
              disabled={simulating}
              onClick={() => handleSimulateChange('ARTICLE_DELETED')}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>🗑️ Тест: Видалення в джерелі</span>
            </button>
          </div>
        </div>

        {/* FILTERS BAR */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Фільтри:</span>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300"
            >
              <option value="ALL">Всі статуси</option>
              <option value="PENDING">Очікують рев'ю (PENDING)</option>
              <option value="ACCEPTED">Прийнято (ACCEPTED)</option>
              <option value="REJECTED">Відхилено (REJECTED)</option>
              <option value="PARTIALLY_ACCEPTED">Частково прийнято</option>
            </select>

            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300"
            >
              <option value="ALL">Всі джерела</option>
              {sources.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300"
            >
              <option value="ALL">Всі рівні важливості</option>
              <option value="HIGH">Висока (HIGH)</option>
              <option value="MEDIUM">Середня (MEDIUM)</option>
              <option value="LOW">Низька (LOW)</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300"
            >
              <option value="ALL">Всі типи подій</option>
              <option value="CONTENT_CHANGED">Зміна тексту</option>
              <option value="TITLE_CHANGED">Зміна заголовка</option>
              <option value="IMAGE_CHANGED">Зміна зображення</option>
              <option value="MULTIPLE_CHANGES">Комплексна зміна</option>
              <option value="ARTICLE_DELETED">Статтю видалено</option>
            </select>
          </div>

          <span className="text-slate-400 font-medium">
            Знайдено подій: <strong className="text-white">{changes.length}</strong>
          </span>
        </div>

        {/* MAIN SPLIT VIEW */}
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs">Завантаження аналізу змін...</p>
          </div>
        ) : changes.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
            <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="font-bold text-white text-sm">Немає подій змін за обраними фільтрами</h3>
            <p className="text-xs text-slate-400">
              Скористайтеся блоком симуляції вище для перевірки реакції системи на оновлення першоджерел.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left list: Change events table */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Події змін ({changes.length})
                </span>
              </div>

              <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
                {changes.map(ch => {
                  const isSelected = selectedChange?.id === ch.id;
                  const isPending = ch.status === 'PENDING';
                  const isHigh = ch.severity === 'HIGH';

                  return (
                    <div
                      key={ch.id}
                      onClick={() => handleSelectChange(ch)}
                      className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all space-y-2 ${
                        isSelected
                          ? 'bg-slate-800 border-emerald-500 shadow-lg'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                            isPending
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : ch.status === 'ACCEPTED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {ch.status}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              isHigh
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {ch.severity || 'MED'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(ch.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <h4 className="font-bold text-white text-xs line-clamp-1">
                        {ch.article_title || ch.source_title || 'Зміна статті'}
                      </h4>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono text-[10px] text-emerald-400">
                          {ch.event_type}
                        </span>
                        <span>{ch.source_name || 'Джерело'}</span>
                      </div>

                      {ch.diff_summary && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                          {ch.diff_summary}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Pane: Detailed Split Diff & Actions */}
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              {selectedChange ? (
                <>
                  {/* Event Title & Metadata */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {selectedChange.event_type}
                        </span>
                        <span className="text-xs text-slate-400">
                          ID: {selectedChange.id}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white leading-tight">
                        {selectedChange.article_title || selectedChange.source_title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Виявлено: {new Date(selectedChange.detected_at).toLocaleString()} • Джерело: {selectedChange.source_name}
                      </p>
                    </div>

                    {/* Status badge */}
                    <div className="shrink-0 flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-lg uppercase ${
                          selectedChange.status === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                            : selectedChange.status === 'ACCEPTED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {selectedChange.status}
                      </span>
                    </div>
                  </div>

                  {/* SPECIAL NOTICE FOR DELETED ARTICLE */}
                  {selectedChange.event_type === 'ARTICLE_DELETED' && selectedChange.status === 'PENDING' && (
                    <div className="p-4 bg-rose-950/30 border border-rose-500/40 rounded-xl space-y-3">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-rose-300 text-xs">Першоджерело видалило цю статтю</h4>
                          <p className="text-xs text-slate-300 mt-1">
                            Стаття більше недоступна на сайті першоджерела (HTTP 404 / відсутня в списку). Оберіть дію:
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="deletedAction"
                            value="keep_published"
                            checked={deletedAction === 'keep_published'}
                            onChange={() => setDeletedAction('keep_published')}
                            className="text-emerald-500"
                          />
                          <span>Залишити опублікованою (з приміткою в архіві)</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="deletedAction"
                            value="unpublish"
                            checked={deletedAction === 'unpublish'}
                            onChange={() => setDeletedAction('unpublish')}
                            className="text-amber-500"
                          />
                          <span>Зняти з публікації (перевести в чернетки)</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="deletedAction"
                            value="archive"
                            checked={deletedAction === 'archive'}
                            onChange={() => setDeletedAction('archive')}
                            className="text-rose-500"
                          />
                          <span>Архівувати матеріал</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* ACTION CONTROLS */}
                  {selectedChange.status === 'PENDING' && (
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleResolve('accept_all')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-colors"
                        >
                          <CheckSquare className="w-4 h-4" />
                          <span>Accept All (Прийняти все)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResolve('reject_all')}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                        >
                          <XSquare className="w-4 h-4" />
                          <span>Reject All (Відхилити все)</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleResolve('accept_selected')}
                          disabled={selectedFields.length === 0 && selectedBlockIndices.length === 0}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            Accept Selected ({selectedFields.length + selectedBlockIndices.length})
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResolve('reject_selected')}
                          disabled={selectedFields.length === 0 && selectedBlockIndices.length === 0}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 disabled:opacity-40 text-xs font-semibold transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject Selected</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* DIFF VIEWER */}
                  <DiffViewer
                    diff={selectedChange.diff_data || selectedChange.structured_diff}
                    previousTitle={detailedChange?.oldSnapshot?.title}
                    newTitle={detailedChange?.newSnapshot?.title}
                    previousContent={detailedChange?.oldSnapshot?.content_text || selectedChange.previous_value}
                    newContent={detailedChange?.newSnapshot?.content_text || selectedChange.new_value}
                    diffSummary={selectedChange.diff_summary}
                    selectable={selectedChange.status === 'PENDING'}
                    selectedFields={selectedFields}
                    onToggleField={handleToggleField}
                    selectedBlockIndices={selectedBlockIndices}
                    onToggleBlock={handleToggleBlock}
                  />
                </>
              ) : (
                <div className="py-24 text-center text-slate-500 text-xs">
                  Оберіть подію змін зі списку ліворуч
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
