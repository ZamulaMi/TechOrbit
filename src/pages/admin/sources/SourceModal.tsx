import { useState, useEffect, FormEvent } from 'react';
import { Source } from '../../../types.ts';
import { Globe, Settings2, Sliders, Layers, X, ShieldAlert } from 'lucide-react';

interface SourceModalProps {
  source?: Source | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Source>) => Promise<void>;
}

export function SourceModal({ source, isOpen, onClose, onSave }: SourceModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'parser' | 'crawler' | 'mapping'>('general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [language, setLanguage] = useState('en');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState(30);

  // Parser Config
  const [parserType, setParserType] = useState<string>('generic_rss');
  const [articlePatterns, setArticlePatterns] = useState('');
  const [excludedPatterns, setExcludedPatterns] = useState('');
  const [titleSelector, setTitleSelector] = useState('');
  const [contentSelector, setContentSelector] = useState('');
  const [authorSelector, setAuthorSelector] = useState('');
  const [dateSelector, setDateSelector] = useState('');
  const [imageSelector, setImageSelector] = useState('');
  const [linksSelector, setLinksSelector] = useState('');

  // Crawler & Rate Limits
  const [maxArticles, setMaxArticles] = useState(10);
  const [requestDelay, setRequestDelay] = useState(500);
  const [retryCount, setRetryCount] = useState(3);
  const [minContentLength, setMinContentLength] = useState(100);
  const [userAgent, setUserAgent] = useState('TechOrbitBot/1.0 (+https://techorbit.media/bot)');

  // Mapping
  const [defaultCategory, setDefaultCategory] = useState('cat_smartphones');
  const [categoryMapping, setCategoryMapping] = useState('{\n  "Новости": "cat_smartphones",\n  "Обзоры": "cat_gadgets",\n  "Игры": "cat_ai_software"\n}');

  useEffect(() => {
    if (source) {
      setName(source.name || '');
      setBaseUrl(source.base_url || '');
      setFeedUrl(source.feed_url || '');
      setSitemapUrl(source.sitemap_url || '');
      setLanguage(source.language || 'en');
      setDescription(source.description || '');
      setEnabled(source.enabled !== false);
      setSyncEnabled(source.sync_enabled !== false);
      setSyncInterval(source.sync_interval_minutes || 30);
      setParserType(source.parser_type || 'generic_rss');
      setArticlePatterns(source.article_url_patterns || '');
      setExcludedPatterns(source.excluded_url_patterns || '');
      setMaxArticles(source.max_articles_per_sync || 10);
      setRequestDelay(source.request_delay_ms || 500);
      setRetryCount(source.retry_count || 3);
      setMinContentLength(source.min_content_length || 100);
      setUserAgent(source.user_agent || 'TechOrbitBot/1.0 (+https://techorbit.media/bot)');
      setDefaultCategory(source.default_category_id || 'cat_smartphones');

      if (source.category_mapping) {
        setCategoryMapping(
          typeof source.category_mapping === 'string'
            ? source.category_mapping
            : JSON.stringify(source.category_mapping, null, 2)
        );
      }

      if (source.parser_config) {
        try {
          const cfg = typeof source.parser_config === 'string' ? JSON.parse(source.parser_config) : source.parser_config;
          setTitleSelector(cfg.titleSelector || '');
          setContentSelector(cfg.contentSelector || '');
          setAuthorSelector(cfg.authorSelector || '');
          setDateSelector(cfg.dateSelector || '');
          setImageSelector(cfg.imageSelector || '');
          setLinksSelector(cfg.linksSelector || '');
        } catch {}
      }
    } else {
      // Defaults for brand new source
      setName('');
      setBaseUrl('');
      setFeedUrl('');
      setSitemapUrl('');
      setLanguage('en');
      setDescription('');
      setEnabled(true);
      setSyncEnabled(true);
      setSyncInterval(30);
      setParserType('generic_rss');
      setArticlePatterns('');
      setExcludedPatterns('');
      setTitleSelector('');
      setContentSelector('');
      setAuthorSelector('');
      setDateSelector('');
      setImageSelector('');
      setLinksSelector('');
      setMaxArticles(10);
      setRequestDelay(500);
      setRetryCount(3);
      setMinContentLength(100);
      setUserAgent('TechOrbitBot/1.0 (+https://techorbit.media/bot)');
      setDefaultCategory('cat_smartphones');
      setCategoryMapping('{\n  "Новости": "cat_smartphones",\n  "Reviews": "cat_gadgets"\n}');
    }
  }, [source, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!baseUrl.trim().startsWith('http://') && !baseUrl.trim().startsWith('https://')) {
      setError('Base URL must start with http:// or https://');
      return;
    }

    try {
      setSaving(true);

      const parserConfig = {
        feedUrl: feedUrl.trim() || undefined,
        sitemapUrl: sitemapUrl.trim() || undefined,
        titleSelector: titleSelector.trim() || undefined,
        contentSelector: contentSelector.trim() || undefined,
        authorSelector: authorSelector.trim() || undefined,
        dateSelector: dateSelector.trim() || undefined,
        imageSelector: imageSelector.trim() || undefined,
        linksSelector: linksSelector.trim() || undefined
      };

      await onSave({
        name: name.trim(),
        base_url: baseUrl.trim(),
        feed_url: feedUrl.trim(),
        sitemap_url: sitemapUrl.trim(),
        language,
        description: description.trim(),
        enabled,
        sync_enabled: syncEnabled,
        sync_interval_minutes: Number(syncInterval),
        parser_type: parserType,
        parser_config: JSON.stringify(parserConfig),
        article_url_patterns: articlePatterns.trim(),
        excluded_url_patterns: excludedPatterns.trim(),
        default_category_id: defaultCategory,
        category_mapping: categoryMapping.trim(),
        max_articles_per_sync: Number(maxArticles),
        request_delay_ms: Number(requestDelay),
        retry_count: Number(retryCount),
        min_content_length: Number(minContentLength),
        user_agent: userAgent.trim()
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save source');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">
              {source ? `Редагування джерела: ${source.name}` : 'Додати нове джерело (Add Tech Source)'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Основне</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('parser')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'parser'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Парсер & Селектори</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('crawler')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'crawler'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Краулер & Ліміти</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mapping')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'mapping'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Мапінг категорій</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Назва медіа / ресурсу</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="напр. Wylsa.com, The Verge, Engadget..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Головна адреса сайту (Base URL)</label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  placeholder="https://wylsa.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">RSS / Atom Feed URL (опціонально)</label>
                  <input
                    type="url"
                    value={feedUrl}
                    onChange={e => setFeedUrl(e.target.value)}
                    placeholder="https://wylsa.com/feed/"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">XML Sitemap URL (опціонально)</label>
                  <input
                    type="url"
                    value={sitemapUrl}
                    onChange={e => setSitemapUrl(e.target.value)}
                    placeholder="https://wylsa.com/sitemap_index.xml"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Мова контенту джерела</label>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="en">Англійська (en)</option>
                    <option value="ru">Російська (ru)</option>
                    <option value="uk">Українська (uk)</option>
                    <option value="de">Німецька (de)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Інтервал опитування (хвилини)</label>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={syncInterval}
                    onChange={e => setSyncInterval(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Опис / Редакційні нотатки</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Опис напрямку джерела, спеціалізація..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={e => setEnabled(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-xs text-slate-200 font-medium">Джерело активне (Enabled)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncEnabled}
                    onChange={e => setSyncEnabled(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-xs text-slate-200 font-medium">Синхронізація увімкнена (Sync Enabled)</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: PARSER & SELECTORS */}
          {activeTab === 'parser' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Тип парсера</label>
                <select
                  value={parserType}
                  onChange={e => setParserType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="wylsa_custom">Wylsa Custom Parser (Оптимізовано для wylsa.com)</option>
                  <option value="generic_rss">Generic RSS / Atom (Автоматичний розбір фіду)</option>
                  <option value="generic_html">Generic HTML Scraper (CSS-селектори сторінки)</option>
                  <option value="sitemap">XML Sitemap Crawler (Скрапінг по карті сайту)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Виберіть «Wylsa Custom Parser» для wylsa.com або «Generic RSS / Atom» для стандартних стрічок.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Шаблон URL статей (Article URL pattern)</label>
                <input
                  type="text"
                  value={articlePatterns}
                  onChange={e => setArticlePatterns(e.target.value)}
                  placeholder="*wylsa.com/*, */news/*"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">Розділяйте комою. Наприклад: *wylsa.com/*</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Виключені URL (Excluded patterns)</label>
                <input
                  type="text"
                  value={excludedPatterns}
                  onChange={e => setExcludedPatterns(e.target.value)}
                  placeholder="*/tag/*, */author/*, */category/*"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <p className="text-xs font-bold text-slate-300">Кастомні CSS-селектори для HTML Scraper:</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Заголовок (Title selector)</label>
                    <input
                      type="text"
                      value={titleSelector}
                      onChange={e => setTitleSelector(e.target.value)}
                      placeholder="h1.entry-title, h1"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Тіло статті (Content selector)</label>
                    <input
                      type="text"
                      value={contentSelector}
                      onChange={e => setContentSelector(e.target.value)}
                      placeholder="div.entry-content, article"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Автор (Author)</label>
                    <input
                      type="text"
                      value={authorSelector}
                      onChange={e => setAuthorSelector(e.target.value)}
                      placeholder=".author-name"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Дата (Date)</label>
                    <input
                      type="text"
                      value={dateSelector}
                      onChange={e => setDateSelector(e.target.value)}
                      placeholder="time.entry-date"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Головне фото (Image)</label>
                    <input
                      type="text"
                      value={imageSelector}
                      onChange={e => setImageSelector(e.target.value)}
                      placeholder="figure img"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CRAWLER & RATE LIMITS */}
          {activeTab === 'crawler' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Максимум статей за сесію (Max articles)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={maxArticles}
                    onChange={e => setMaxArticles(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Захист від неконтрольованого краулінгу.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Затримка між запитами (Request delay ms)
                  </label>
                  <input
                    type="number"
                    min="200"
                    max="10000"
                    value={requestDelay}
                    onChange={e => setRequestDelay(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Ввічливий краулінг (по замовчуванню: 500 мс).</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Кількість повторів при збоях (Retries)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={retryCount}
                    onChange={e => setRetryCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Мін. довжина тексту статті (символів)</label>
                  <input
                    type="number"
                    min="20"
                    max="5000"
                    value={minContentLength}
                    onChange={e => setMinContentLength(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Фільтрує короткі анонси та помилкові сторінки.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">User-Agent бота</label>
                <input
                  type="text"
                  value={userAgent}
                  onChange={e => setUserAgent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* TAB 4: MAPPING */}
          {activeTab === 'mapping' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Категорія за замовчуванням</label>
                <select
                  value={defaultCategory}
                  onChange={e => setDefaultCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="cat_smartphones">Смартфони (cat_smartphones)</option>
                  <option value="cat_gadgets">Гаджети (cat_gadgets)</option>
                  <option value="cat_ai_software">ШІ та Софт (cat_ai_software)</option>
                  <option value="cat_auto_ev">Авто та EV (cat_auto_ev)</option>
                  <option value="cat_cybersecurity">Кібербезпека (cat_cybersecurity)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Застосовується, якщо теги або рубрики джерела не збігаються з правилами мапінгу.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Правила мапінгу категорій (JSON key-value)
                </label>
                <textarea
                  value={categoryMapping}
                  onChange={e => setCategoryMapping(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Вказуйте назву категорії з першоджерела як ключ та ID внутрішньої категорії як значення.
                </p>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              {saving ? 'Збереження...' : source ? 'Оновити джерело' : 'Створити джерело'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
