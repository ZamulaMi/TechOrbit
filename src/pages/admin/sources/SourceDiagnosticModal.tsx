import { useState, FormEvent } from 'react';
import { api } from '../../../api/client.ts';
import { DiagnosticResult } from '../../../types.ts';
import {
  ShieldCheck,
  ShieldAlert,
  Server,
  FileText,
  Radio,
  CheckCircle,
  AlertTriangle,
  Play,
  X,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface SourceDiagnosticModalProps {
  initialUrl?: string;
  initialParserType?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SourceDiagnosticModal({
  initialUrl = 'https://wylsa.com/feed/',
  initialParserType = 'wylsa_custom',
  isOpen,
  onClose
}: SourceDiagnosticModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const [parserType, setParserType] = useState(initialParserType);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'blocks' | 'urls' | 'robots'>('overview');

  if (!isOpen) return null;

  const handleRunDiagnostic = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setRunning(true);
    setResult(null);
    try {
      const res = await api.admin.testSource(url.trim(), parserType);
      setResult(res);
    } catch (err: any) {
      setResult({
        url,
        timestamp: new Date().toISOString(),
        security: { safe: false, reason: err.message },
        http: { reachable: false },
        robotsTxt: { found: false, url: '', allowedForBot: true, sitemaps: [] },
        feeds: { rssDetected: false, rssUrls: [], sitemapsDetected: false, sitemapUrls: [] },
        discoveredUrls: [],
        error: err.message || 'Diagnostic failed'
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-white text-base">Діагностика джерела та перевірка SSRF</h3>
              <p className="text-xs text-slate-400">
                Глибокий аудит HTTP-з'єднання, robots.txt, розпізнавання структури та нормалізації блоків
              </p>
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

        {/* Input Bar */}
        <form onSubmit={handleRunDiagnostic} className="p-4 border-b border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://wylsa.com/feed/ або https://example.com"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            required
          />

          <select
            value={parserType}
            onChange={e => setParserType(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="wylsa_custom">Wylsa Custom Parser</option>
            <option value="generic_rss">Generic RSS / Atom</option>
            <option value="generic_html">Generic HTML Scraper</option>
            <option value="sitemap">XML Sitemap</option>
          </select>

          <button
            type="submit"
            disabled={running}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
          >
            {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>{running ? 'Діагностика...' : 'Запустити тест'}</span>
          </button>
        </form>

        {/* Diagnostic Results Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!result && !running && (
            <div className="py-12 text-center text-slate-500 text-xs">
              Введіть URL джерела та натисніть «Запустити тест» для повної діагностики першоджерела.
            </div>
          )}

          {running && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-xs font-mono">Виконується SSRF-перевірка, запит до сервера та розбір статті...</p>
            </div>
          )}

          {result && !running && (
            <div className="space-y-5">
              {/* Quick Status Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. SSRF Check */}
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                    result.security.safe
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {result.security.safe ? <ShieldCheck className="w-5 h-5 shrink-0" /> : <ShieldAlert className="w-5 h-5 shrink-0" />}
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">SSRF Захист</span>
                    <span className="text-xs font-bold">{result.security.safe ? 'Безпечний URL' : 'Заблоковано'}</span>
                  </div>
                </div>

                {/* 2. HTTP Status */}
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                    result.http.reachable && result.http.status && result.http.status < 400
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <Server className="w-5 h-5 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">HTTP Статус</span>
                    <span className="text-xs font-bold font-mono">
                      {result.http.status ? `${result.http.status} (${result.http.responseTimeMs}ms)` : 'НЕДОСТУПНИЙ'}
                    </span>
                  </div>
                </div>

                {/* 3. Feed Detection */}
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                    result.feeds.rssDetected || result.feeds.sitemapsDetected
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                      : 'bg-slate-800/40 border-slate-700 text-slate-400'
                  }`}
                >
                  <Radio className="w-5 h-5 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">RSS / Sitemap</span>
                    <span className="text-xs font-bold">
                      {result.feeds.rssDetected ? 'RSS знайдено' : result.feeds.sitemapsDetected ? 'Sitemap знайдено' : 'Не виявлено'}
                    </span>
                  </div>
                </div>

                {/* 4. Article / Block Extraction */}
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                    result.sampleArticle
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                      : 'bg-slate-800/40 border-slate-700 text-slate-400'
                  }`}
                >
                  <FileText className="w-5 h-5 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">Структура статті</span>
                    <span className="text-xs font-bold">
                      {result.sampleArticle ? `${result.blocksCount || 0} блоків` : '0 блоків'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Notice if any */}
              {result.error && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Попередження або зауваження діагностики:</span>
                    <span className="font-mono text-[11px]">{result.error}</span>
                  </div>
                </div>
              )}

              {/* Detail Tabs */}
              <div className="flex border-b border-slate-800 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                    activeTab === 'overview'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Зразок статті (Sample Article)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('blocks')}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                    activeTab === 'blocks'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Структуровані блоки ({result.sampleArticle?.blocks.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('urls')}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                    activeTab === 'urls'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Виявлені посилання ({result.discoveredUrls.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('robots')}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                    activeTab === 'robots'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Robots.txt & RSS
                </button>
              </div>

              {/* TAB 1: OVERVIEW / ARTICLE PREVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {result.sampleArticle ? (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                      {result.sampleArticle.featuredImageUrl && (
                        <img
                          src={result.sampleArticle.featuredImageUrl}
                          alt="Featured"
                          className="w-full h-48 object-cover rounded-lg border border-slate-800"
                        />
                      )}

                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {result.sampleArticle.categories.map((c, i) => (
                            <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-semibold">
                              {c}
                            </span>
                          ))}
                        </div>

                        <h4 className="text-base font-bold text-white leading-snug">
                          {result.sampleArticle.title}
                        </h4>

                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span>Автор: <strong className="text-slate-200">{result.sampleArticle.author}</strong></span>
                          <span>Дата: <strong className="text-slate-200">{new Date(result.sampleArticle.publishedAt).toLocaleString()}</strong></span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80">
                        <p className="text-xs text-slate-300 leading-relaxed italic">
                          "{result.sampleArticle.excerpt}"
                        </p>
                      </div>

                      <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span className="truncate max-w-md">URL: {result.sampleArticle.url}</span>
                        <span>Довжина: {result.sampleArticle.rawText.length} символів</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      Не вдалося отримати зразок статті з цього джерела. Перевірте селектори або шаблон URL.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: STRUCTURED BLOCKS */}
              {activeTab === 'blocks' && (
                <div className="space-y-3">
                  {result.sampleArticle?.blocks && result.sampleArticle.blocks.length > 0 ? (
                    <div className="space-y-2.5">
                      {result.sampleArticle.blocks.map((block, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 flex items-start gap-3"
                        >
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 text-[10px] font-mono uppercase font-bold shrink-0 border border-slate-800">
                            {block.type}
                            {block.level ? ` (H${block.level})` : ''}
                          </span>

                          <div className="flex-1 text-xs text-slate-200 min-w-0">
                            {block.type === 'heading' && (
                              <p className="font-bold text-white">{block.text}</p>
                            )}
                            {block.type === 'paragraph' && (
                              <p className="leading-relaxed">{block.text}</p>
                            )}
                            {block.type === 'image' && (
                              <div className="space-y-1">
                                <span className="font-mono text-[11px] text-cyan-400 truncate block">{block.url}</span>
                                {block.caption && <p className="text-[11px] text-slate-400 italic">Підпис: {block.caption}</p>}
                              </div>
                            )}
                            {block.type === 'quote' && (
                              <p className="italic text-amber-300 border-l-2 border-amber-500/60 pl-2">
                                "{block.text}" {block.author && `— ${block.author}`}
                              </p>
                            )}
                            {block.type === 'list' && (
                              <ul className="list-disc pl-4 space-y-0.5">
                                {block.items?.map((item, i) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            )}
                            {block.type === 'code' && (
                              <pre className="p-2 bg-slate-900 rounded text-[11px] font-mono text-emerald-400 overflow-x-auto">
                                {block.code}
                              </pre>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      Блоки відсутні.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: DISCOVERED URLS */}
              {activeTab === 'urls' && (
                <div className="space-y-2">
                  <div className="overflow-x-auto bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <ul className="divide-y divide-slate-900 space-y-1 text-xs font-mono">
                      {result.discoveredUrls.map((discoveredUrl, i) => (
                        <li key={i} className="py-2 flex items-center justify-between gap-2 hover:bg-slate-900/40 px-2 rounded">
                          <span className="text-slate-300 truncate">{discoveredUrl}</span>
                          <a
                            href={discoveredUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-500 hover:text-emerald-400 shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 4: ROBOTS & FEEDS */}
              {activeTab === 'robots' && (
                <div className="space-y-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                    <h5 className="text-xs font-bold text-white flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Robots.txt ({result.robotsTxt.url})</span>
                    </h5>
                    <p className="text-xs text-slate-400">
                      Статус: {result.robotsTxt.found ? 'Знайдено на сервері' : 'Не знайдено (404)'} | Доступ для бота:{' '}
                      <strong className={result.robotsTxt.allowedForBot ? 'text-emerald-400' : 'text-rose-400'}>
                        {result.robotsTxt.allowedForBot ? 'Дозволено (Allowed)' : 'Заборонено (Disallow: /)'}
                      </strong>
                    </p>
                    {result.robotsTxt.rawExcerpt && (
                      <pre className="p-3 bg-slate-900 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto max-h-40">
                        {result.robotsTxt.rawExcerpt}
                      </pre>
                    )}
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                    <h5 className="text-xs font-bold text-white flex items-center gap-2">
                      <Radio className="w-4 h-4 text-cyan-400" />
                      <span>Автоматично виявлені фіди:</span>
                    </h5>
                    {result.feeds.rssUrls.length > 0 ? (
                      <ul className="space-y-1 text-xs font-mono text-cyan-300">
                        {result.feeds.rssUrls.map((u, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span>•</span>
                            <span className="truncate">{u}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500">Прямих RSS стрічок не виявлено в шапці сайту.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
