import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Globe, Search, Shield, ChevronRight, Menu, X, Cpu, Newspaper } from 'lucide-react';
import { Category, Language } from '../../types.ts';

interface PublicHeaderProps {
  categories: Category[];
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function PublicHeader({
  categories,
  currentLang,
  onLanguageChange,
  searchQuery,
  onSearchChange
}: PublicHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100">
      {/* Top micro bar */}
      <div className="bg-slate-950 px-4 py-1.5 border-b border-slate-800/80 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {currentLang === 'uk' ? 'TechOrbit Live' : 'TechOrbit Live'}
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:inline text-slate-400">
              {currentLang === 'uk'
                ? 'Незалежне технологічне медіа, агрегація та перевірені релізи'
                : 'Independent tech media, aggregated coverage & verified releases'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="inline-flex items-center rounded-md bg-slate-900 border border-slate-800 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => onLanguageChange('uk')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  currentLang === 'uk'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                UA
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('en')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  currentLang === 'en'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors border border-slate-700/60"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentLang === 'uk' ? 'CMS Панель' : 'CMS Portal'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main navigation row */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-950/40 group-hover:scale-105 transition-transform">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-xl font-black tracking-tight flex items-center text-white">
              Tech<span className="text-emerald-400">Orbit</span>
            </div>
            <p className="text-[10px] tracking-wider uppercase text-slate-400 -mt-1 font-medium">
              Media & Ingestion
            </p>
          </div>
        </Link>

        {/* Desktop category links */}
        <nav className="hidden lg:flex items-center gap-1">
          <Link
            to="/"
            className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            {currentLang === 'uk' ? 'Головна' : 'Home'}
          </Link>
          {categories.map(cat => {
            const name = currentLang === 'uk' ? cat.name_uk : cat.name_en;
            const slug = currentLang === 'uk' ? cat.slug_uk : cat.slug_en;
            return (
              <Link
                key={cat.id}
                to={`/category/${slug}`}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-300 hover:text-emerald-400 hover:bg-slate-800/60 transition-colors"
              >
                {name}
              </Link>
            );
          })}
        </nav>

        {/* Search and mobile menu button */}
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative hidden sm:block w-48 md:w-64">
            <input
              type="text"
              placeholder={currentLang === 'uk' ? 'Пошук новин...' : 'Search news...'}
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          </form>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-t border-slate-800 px-4 py-4 space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative mb-3">
            <input
              type="text"
              placeholder={currentLang === 'uk' ? 'Пошук новин...' : 'Search news...'}
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          </form>

          <div className="flex flex-col space-y-1">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded text-slate-200 hover:bg-slate-800 font-medium text-sm"
            >
              {currentLang === 'uk' ? 'Головна' : 'Home'}
            </Link>
            {categories.map(cat => (
              <Link
                key={cat.id}
                to={`/category/${currentLang === 'uk' ? cat.slug_uk : cat.slug_en}`}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded text-slate-300 hover:bg-slate-800 font-medium text-sm"
              >
                {currentLang === 'uk' ? cat.name_uk : cat.name_en}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
