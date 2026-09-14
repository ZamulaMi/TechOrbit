import { useState, ReactNode } from 'react';
import { StructuredDiff, BlockDiff } from '../../types.ts';
import { Check, Plus, Minus, RefreshCw, FileText, Image as ImageIcon, Link as LinkIcon, Tag, User, Layers } from 'lucide-react';

interface DiffViewerProps {
  diff?: StructuredDiff | string;
  previousTitle?: string;
  newTitle?: string;
  previousContent?: string;
  newContent?: string;
  diffSummary?: string;
  selectable?: boolean;
  selectedFields?: string[];
  onToggleField?: (fieldName: string) => void;
  selectedBlockIndices?: number[];
  onToggleBlock?: (blockIndex: number) => void;
}

export function DiffViewer({
  diff,
  previousTitle,
  newTitle,
  previousContent,
  newContent,
  diffSummary,
  selectable = false,
  selectedFields = [],
  onToggleField,
  selectedBlockIndices = [],
  onToggleBlock
}: DiffViewerProps) {
  const [activeTab, setActiveTab] = useState<'blocks' | 'fields' | 'raw'>('blocks');

  let parsedDiff: StructuredDiff | null = null;
  if (typeof diff === 'string') {
    try {
      parsedDiff = JSON.parse(diff);
    } catch {}
  } else if (diff && typeof diff === 'object') {
    parsedDiff = diff;
  }

  const blocks: BlockDiff[] = parsedDiff?.blocks || [];
  const stats = parsedDiff?.stats;

  return (
    <div className="space-y-4 text-xs">
      {/* Diff Summary Bar */}
      {diffSummary && (
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="text-slate-300 font-medium">{diffSummary}</span>
          </div>
          {stats && (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                +{stats.addedBlocks} додано
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                -{stats.removedBlocks} видалено
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                ~{stats.changedBlocks} змінено
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('blocks')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'blocks'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Блочний аналіз тексту ({blocks.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('fields')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'fields'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Метадані статті
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('raw')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'raw'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Повний сирий diff (Raw Split)
        </button>
      </div>

      {/* TAB 1: BLOCK-LEVEL DIFF */}
      {activeTab === 'blocks' && (
        <div className="space-y-3">
          {blocks.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-slate-800 text-slate-400">
              Блокових відмінностей не виявлено. Перегляньте вкладку метаданих.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                <span>Попередній стан (Current Database)</span>
                <span>Новий стан (Upstream Source)</span>
              </div>

              {blocks.map(block => {
                const isSelected = selectedBlockIndices.includes(block.index);
                const isChanged = block.status === 'changed';
                const isAdded = block.status === 'added';
                const isRemoved = block.status === 'removed';

                return (
                  <div
                    key={block.index}
                    className={`rounded-xl border p-3 transition-all ${
                      isAdded
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : isRemoved
                        ? 'bg-rose-950/20 border-rose-500/40'
                        : isChanged
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : 'bg-slate-900/40 border-slate-800/80 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/60">
                      <div className="flex items-center gap-2">
                        {selectable && (isChanged || isAdded) && onToggleBlock && (
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onToggleBlock(block.index)}
                              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
                            />
                            <span className="text-[10px] text-slate-300 font-semibold">Обрати цей блок</span>
                          </label>
                        )}
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          Блок #{block.index + 1}: {block.type}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                          isAdded
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : isRemoved
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : isChanged
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isAdded && <Plus className="w-3 h-3" />}
                        {isRemoved && <Minus className="w-3 h-3" />}
                        {isChanged && <RefreshCw className="w-3 h-3" />}
                        {block.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-xs">
                      {/* Old Block */}
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-900 text-slate-300 min-h-[42px] leading-relaxed">
                        {block.oldBlock ? (
                          renderBlockContent(block.oldBlock)
                        ) : (
                          <span className="text-slate-600 italic">Відсутній у поточній версії</span>
                        )}
                      </div>

                      {/* New Block */}
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-900 text-slate-200 min-h-[42px] leading-relaxed">
                        {block.newBlock ? (
                          renderBlockContent(block.newBlock)
                        ) : (
                          <span className="text-slate-600 italic">Видалено в оновленні</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: METADATA FIELDS */}
      {activeTab === 'fields' && (
        <div className="space-y-3">
          {parsedDiff?.title && (
            <FieldRow
              name="title"
              label="Заголовок"
              diff={parsedDiff.title}
              icon={<FileText className="w-4 h-4 text-emerald-400" />}
              selectable={selectable}
              isSelected={selectedFields.includes('title')}
              onToggle={onToggleField}
            />
          )}

          {parsedDiff?.subtitle && (
            <FieldRow
              name="subtitle"
              label="Підзаголовок"
              diff={parsedDiff.subtitle}
              icon={<FileText className="w-4 h-4 text-blue-400" />}
              selectable={selectable}
              isSelected={selectedFields.includes('subtitle')}
              onToggle={onToggleField}
            />
          )}

          {parsedDiff?.excerpt && (
            <FieldRow
              name="excerpt"
              label="Короткий опис"
              diff={parsedDiff.excerpt}
              icon={<FileText className="w-4 h-4 text-amber-400" />}
              selectable={selectable}
              isSelected={selectedFields.includes('excerpt')}
              onToggle={onToggleField}
            />
          )}

          {parsedDiff?.featured_image_url && (
            <FieldRow
              name="featured_image_url"
              label="Головне зображення"
              diff={parsedDiff.featured_image_url}
              icon={<ImageIcon className="w-4 h-4 text-purple-400" />}
              selectable={selectable}
              isSelected={selectedFields.includes('featured_image_url')}
              onToggle={onToggleField}
              isImage
            />
          )}

          {parsedDiff?.author && (
            <FieldRow
              name="author"
              label="Автор"
              diff={parsedDiff.author}
              icon={<User className="w-4 h-4 text-cyan-400" />}
              selectable={selectable}
              isSelected={selectedFields.includes('author')}
              onToggle={onToggleField}
            />
          )}

          {parsedDiff?.category && (
            <FieldRow
              name="category"
              label="Категорія"
              diff={parsedDiff.category}
              icon={<Tag className="w-4 h-4 text-pink-400" />}
              selectable={selectable}
              isSelected={selectedFields.includes('category')}
              onToggle={onToggleField}
            />
          )}
        </div>
      )}

      {/* TAB 3: RAW SIDE-BY-SIDE */}
      {activeTab === 'raw' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 font-semibold font-sans px-1">
              <span>Попередній стан (Current Database)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Old</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 h-80 overflow-y-auto whitespace-pre-wrap text-slate-300 text-[11px] leading-relaxed select-text">
              {previousTitle && <p className="font-bold text-white mb-2">{previousTitle}</p>}
              {previousContent || '(Порожній вміст)'}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-emerald-400 font-semibold font-sans px-1">
              <span>Новий стан з джерела (Upstream Source)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                New
              </span>
            </div>
            <div className="bg-slate-950 border border-emerald-900/40 rounded-xl p-3.5 h-80 overflow-y-auto whitespace-pre-wrap text-emerald-200/90 text-[11px] leading-relaxed select-text">
              {newTitle && <p className="font-bold text-white mb-2">{newTitle}</p>}
              {newContent || '(Порожній вміст)'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldRow({
  name,
  label,
  diff,
  icon,
  selectable,
  isSelected,
  onToggle,
  isImage
}: {
  name: string;
  label: string;
  diff: { oldValue: any; newValue: any; changed: boolean };
  icon: ReactNode;
  selectable?: boolean;
  isSelected?: boolean;
  onToggle?: (name: string) => void;
  isImage?: boolean;
}) {
  return (
    <div
      className={`p-3.5 rounded-xl border transition-all ${
        diff.changed ? 'bg-slate-900 border-amber-500/30' : 'bg-slate-900/40 border-slate-800/60 opacity-60'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {selectable && diff.changed && onToggle && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(name)}
                className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
              />
              <span className="text-[11px] text-slate-200 font-semibold">Прийняти це поле</span>
            </label>
          )}
          <div className="flex items-center gap-1.5 font-bold text-white text-xs">
            {icon}
            {label}
          </div>
        </div>

        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            diff.changed ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
          }`}
        >
          {diff.changed ? 'ЗМІНЕНО' : 'БЕЗ ЗМІН'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="p-2 rounded-lg bg-slate-950 text-slate-400 border border-slate-850">
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Поточне значення:</span>
          {isImage && diff.oldValue ? (
            <img src={diff.oldValue} alt="old" className="max-h-24 rounded object-cover" />
          ) : (
            diff.oldValue || '(порожньо)'
          )}
        </div>

        <div className="p-2 rounded-lg bg-slate-950 text-slate-200 border border-slate-850">
          <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Нове значення:</span>
          {isImage && diff.newValue ? (
            <img src={diff.newValue} alt="new" className="max-h-24 rounded object-cover" />
          ) : (
            diff.newValue || '(порожньо)'
          )}
        </div>
      </div>
    </div>
  );
}

function renderBlockContent(block: any) {
  if (block.type === 'heading') {
    return <span className="font-bold text-white text-sm block">{block.text}</span>;
  }
  if (block.type === 'image') {
    return (
      <div className="space-y-1">
        {block.url && <img src={block.url} alt={block.caption || 'image'} className="max-h-24 rounded object-cover" />}
        {block.caption && <span className="text-[11px] text-slate-400 italic block">{block.caption}</span>}
      </div>
    );
  }
  if (block.type === 'quote') {
    return <blockquote className="border-l-2 border-emerald-500 pl-2 italic text-slate-300">{block.text}</blockquote>;
  }
  if (block.type === 'code') {
    return <pre className="font-mono text-[11px] bg-slate-900 p-2 rounded text-emerald-300">{block.code}</pre>;
  }
  return <span>{block.text || JSON.stringify(block)}</span>;
}
