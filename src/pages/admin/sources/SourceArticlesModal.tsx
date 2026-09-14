import { useState, useEffect } from 'react';
import { api } from '../../../api/client.ts';
import { Source, Article } from '../../../types.ts';
import { FileText, ExternalLink, X, RefreshCw } from 'lucide-react';

interface SourceArticlesModalProps {
  source: Source | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SourceArticlesModal({ source, isOpen, onClose }: SourceArticlesModalProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);

  const loadArticles = async () => {
    if (!source) return;
    setLoading(true);
    try {
      const data = await api.admin.getSourceArticles(source.id);
      setArticles(data);
    } catch (err) {
      console.error('Failed to load articles for source', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && source) {
      loadArticles();
    }
  }, [isOpen, source]);

  if (!isOpen || !source) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[85vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-white text-base">Імпортовані матеріали: {source.name}</h3>
              <p className="text-xs text-slate-400">Статті, збережені в редакційну чергу контенту</p>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="py-12 flex justify-center">
              <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
            </div>
          ) : articles.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Ще немає імпортованих матеріалів із цього джерела. Натисніть «Синхронізувати зараз» у списку джерел.
            </div>
          ) : (
            <div className="space-y-2">
              {articles.map(art => (
                <div
                  key={art.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          art.status === 'PENDING_REVIEW'
                            ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                            : art.status === 'UPDATE_PENDING'
                            ? 'bg-purple-950/80 text-purple-400 border border-purple-800/60'
                            : art.status === 'PUBLISHED'
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {art.status}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(art.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="font-semibold text-white text-xs leading-snug line-clamp-2">
                      {art.title}
                    </h4>

                    {art.source_url && (
                      <a
                        href={art.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-400 truncate max-w-md font-mono"
                      >
                        <span>{art.source_url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
