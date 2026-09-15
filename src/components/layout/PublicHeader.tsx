import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Globe,
  Search,
  Shield,
  Menu,
  X,
  Cpu,
  Newspaper,
  Award,
  Send,
  Youtube,
  Instagram,
  Facebook,
  Twitter,
  Music2,
  ExternalLink
} from 'lucide-react';
import { Category, Language, SiteElement, SocialLink } from '../../types.ts';
import { api } from '../../api/client.ts';

interface PublicHeaderProps {
  categories: Category[];
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export function PublicHeader({
  categories,
  currentLang,
  onLanguageChange
}: PublicHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [siteElements, setSiteElements] = useState<SiteElement[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Load active site elements & social links from DB
    Promise.all([
      api.public.getSiteElements(),
      api.public.getSocialLinks()
    ])
      .then(([elems, socials]) => {
        setSiteElements(elems);
        setSocialLinks(socials);
      })
      .catch(err => console.error('Failed to load header configurations', err));
  }, []);

  const isEnabled = (key: string) => {
    if (siteElements.length === 0) return true;
    const el = siteElements.find(e => e.element_key === key);
    return el ? el.enabled : true;
  };

  if (!isEnabled('header')) return null;

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/${currentLang}/search?q=${encodeURIComponent(searchInput.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const switchLanguage = (newLang: Language) => {
    onLanguageChange(newLang);
    // Replace /uk/ with /en/ or vice versa in current URL path
    const currentPath = location.pathname;
    if (currentPath.startsWith('/uk')) {
      navigate(currentPath.replace(/^\/uk/, `/${newLang}`));
    } else if (currentPath.startsWith('/en')) {
      navigate(currentPath.replace(/^\/en/, `/${newLang}`));
    } else {
      navigate(`/${newLang}`);
    }
  };

  const renderSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'telegram':
        return <Send className="w-3.5 h-3.5" />;
      case 'youtube':
        return <Youtube className="w-3.5 h-3.5" />;
      case 'instagram':
        return <Instagram className="w-3.5 h-3.5" />;
      case 'facebook':
        return <Facebook className="w-3.5 h-3.5" />;
      case 'x':
      case 'twitter':
        return <Twitter className="w-3.5 h-3.5" />;
      case 'tiktok':
        return <Music2 className="w-3.5 h-3.5" />;
      default:
        return <ExternalLink className="w-3.5 h-3.5" />;
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-slate-100">
      {/* Top Bar (attributions, language switch, social channels, admin) */}
      <div className="bg-slate-950 px-4 py-1.5 border-b border-slate-900 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>TechOrbit Intel</span>
            </span>
            <span className="hidden sm:inline text-slate-700">|</span>
            <span className="hidden sm:inline text-slate-400">
              {currentLang === 'uk'
                ? 'Незалежне технологічне медіа & Лабораторні випробування'
                : 'Independent Hardware Benchmarks & Technology Intelligence'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Social channels if enabled */}
            {isEnabled('social_links') && (
              <div className="hidden md:flex items-center gap-2 text-slate-400 border-r border-slate-800 pr-3">
                {socialLinks
                  .filter(s => s.is_active && s.url)
                  .slice(0, 5)
                  .map(s => (
                    <a
                      key={s.id || s.platform}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-slate-400 hover:text-emerald-400 transition-colors"
                      title={s.platform}
                    >
                      {renderSocialIcon(s.platform)}
                    </a>
                  ))}
              </div>
            )}

            {/* Language Switcher */}
            {isEnabled('language_switcher') && (
              <div className="inline-flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => switchLanguage('uk')}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    currentLang === 'uk'
                      ? 'bg-emerald-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  UA
                </button>
                <button
                  type="button"
                  onClick={() => switchLanguage('en')}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    currentLang === 'en'
                      ? 'bg-emerald-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  EN
                </button>
              </div>
            )}

            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors border border-slate-800"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>CMS</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navigation Row */}
      <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between gap-6">
        {/* Brand Logo */}
        {isEnabled('logo') && (
          <Link to={`/${currentLang}`} className="flex items-center gap-3 group flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-950/50 group-hover:scale-105 transition-transform">
              <Cpu className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="text-xl font-black tracking-tight flex items-center text-white font-sans">
                Tech<span className="text-emerald-400">Orbit</span>
              </div>
              <p className="text-[10px] tracking-widest uppercase text-slate-400 -mt-1 font-mono font-semibold">
                Technology Journal
              </p>
            </div>
          </Link>
        )}

        {/* Primary Desktop Nav */}
        {isEnabled('navigation') && (
          <nav className="hidden lg:flex items-center gap-1">
            <Link
              to={`/${currentLang}`}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-900 transition-colors"
            >
              {currentLang === 'uk' ? 'Головна' : 'Home'}
            </Link>

            <Link
              to={`/${currentLang}/news`}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-900 transition-colors flex items-center gap-1.5"
            >
              <Newspaper className="w-4 h-4 text-emerald-400" />
              <span>{currentLang === 'uk' ? 'Новини' : 'News'}</span>
            </Link>

            <Link
              to={`/${currentLang}/reviews`}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-900 transition-colors flex items-center gap-1.5"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>{currentLang === 'uk' ? 'Огляди' : 'Reviews'}</span>
            </Link>

            {categories.slice(0, 4).map(cat => {
              const name = currentLang === 'uk' ? cat.name_uk : cat.name_en;
              const slug = currentLang === 'uk' ? cat.slug_uk : cat.slug_en;
              return (
                <Link
                  key={cat.id}
                  to={`/${currentLang}/category/${slug}`}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-300 hover:text-emerald-400 hover:bg-slate-900 transition-colors"
                >
                  {name}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Search Bar & Mobile Toggle */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {isEnabled('search') && (
            <form onSubmit={handleSearchSubmit} className="relative hidden sm:block w-48 md:w-60">
              <input
                type="text"
                placeholder={currentLang === 'uk' ? 'Пошук гаджетів...' : 'Search gadgets...'}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all font-sans"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            </form>
          )}

          <Link
            to={`/${currentLang}/search`}
            className="sm:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            title="Пошук"
          >
            <Search className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white focus:outline-none cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950 border-t border-slate-800 px-5 py-6 space-y-5 animate-in slide-in-from-top-2 duration-200">
          {/* Mobile Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder={currentLang === 'uk' ? 'Пошук новин, оглядів...' : 'Search news, reviews...'}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
          </form>

          {/* Nav links */}
          <div className="flex flex-col space-y-1 pt-2 border-t border-slate-900">
            <Link
              to={`/${currentLang}`}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl text-slate-200 hover:bg-slate-900 font-semibold text-sm flex items-center justify-between"
            >
              <span>{currentLang === 'uk' ? 'Головна' : 'Home'}</span>
            </Link>

            <Link
              to={`/${currentLang}/news`}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl text-slate-200 hover:bg-slate-900 font-semibold text-sm flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-emerald-400" />
                {currentLang === 'uk' ? 'Свіжі новини' : 'News'}
              </span>
            </Link>

            <Link
              to={`/${currentLang}/reviews`}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl text-slate-200 hover:bg-slate-900 font-semibold text-sm flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                {currentLang === 'uk' ? 'Огляди техніки' : 'Reviews'}
              </span>
            </Link>

            <div className="pt-2 pb-1 text-[11px] font-mono uppercase text-slate-500 px-3">
              {currentLang === 'uk' ? 'Рубрики видання' : 'Categories'}
            </div>

            {categories.map(cat => (
              <Link
                key={cat.id}
                to={`/${currentLang}/category/${currentLang === 'uk' ? cat.slug_uk : cat.slug_en}`}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-900 text-sm font-medium"
              >
                {currentLang === 'uk' ? cat.name_uk : cat.name_en}
              </Link>
            ))}

            <div className="pt-3 pb-1 text-[11px] font-mono uppercase text-slate-500 px-3">
              {currentLang === 'uk' ? 'Про нас & Контакти' : 'About & Editorial'}
            </div>

            <Link
              to={`/${currentLang}/about`}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-900 text-sm font-medium"
            >
              {currentLang === 'uk' ? 'Про редакцію TechOrbit' : 'About TechOrbit'}
            </Link>

            <Link
              to={`/${currentLang}/contact`}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-900 text-sm font-medium"
            >
              {currentLang === 'uk' ? 'Контакти та прес-релізи' : 'Contact & Press Inquiries'}
            </Link>
          </div>

          {/* Socials on mobile */}
          <div className="pt-3 border-t border-slate-900 flex items-center gap-3">
            {socialLinks
              .filter(s => s.is_active && s.url)
              .map(s => (
                <a
                  key={s.id || s.platform}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-emerald-400"
                  title={s.platform}
                >
                  {renderSocialIcon(s.platform)}
                </a>
              ))}
          </div>
        </div>
      )}
    </header>
  );
}
