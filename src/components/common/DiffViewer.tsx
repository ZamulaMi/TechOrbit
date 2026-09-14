interface DiffViewerProps {
  previousText: string;
  newText: string;
  diffSummary?: string;
}

export function DiffViewer({ previousText, newText, diffSummary }: DiffViewerProps) {
  return (
    <div className="space-y-3">
      {diffSummary && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
          <strong className="font-semibold">Зведення змін:</strong> {diffSummary}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 font-semibold font-sans px-1">
            <span>Попередній стан (Current Database)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Old</span>
          </div>
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 h-64 overflow-y-auto whitespace-pre-wrap text-slate-300 text-[11px] leading-relaxed select-text">
            {previousText || '(Порожній попередній стан)'}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-emerald-400 font-semibold font-sans px-1">
            <span>Новий стан з першоджерела (Upstream Source)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
              New Detected
            </span>
          </div>
          <div className="bg-slate-950 border border-emerald-900/40 rounded-xl p-3.5 h-64 overflow-y-auto whitespace-pre-wrap text-emerald-200/90 text-[11px] leading-relaxed select-text">
            {newText || '(Немає нового тексту)'}
          </div>
        </div>
      </div>
    </div>
  );
}
