import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Cpu,
  ShieldCheck,
  ArrowUpRight,
  Send,
  Youtube,
  Instagram,
  Facebook,
  Twitter,
  Music2,
  ExternalLink,
  Lock,
  Scale
} from 'lucide-react';
import { Category, Language, SocialLink, SiteElement } from '../../types.ts';
import { api } from '../../api/client.ts';

interface PublicFooterProps {
  categories: Category[];
  currentLang: Language;
}

export function PublicFooter({ categories, currentLang }: PublicFooterProps) {
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [siteElements, setSiteElements] = useState<SiteElement[]>([]);

  useEffect(() => {
    Promise.all([
      api.public.getSocialLinks(),
      api.public.getSiteElements()
    ])
      .then(([socials, elems]) => {
        setSocialLinks(socials);
        setSiteElements(elems);
      })
      .catch(err => console.error('Failed to load footer elements', err));
  }, []);

  const isEnabled = (key: string) => {
    if (siteElements.length === 0) return true;
    const el = siteElements.find(e => e.element_key === key);
    return el ? el.enabled : true;
  };

  if (!isEnabled('footer')) return null;

  const isUk = currentLang === 'uk';

  const renderSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'telegram':
        return <Send className="w-4 h-4" />;
      case 'youtube':
        return <Youtube className="w-4 h-4" />;
      case 'instagram':
        return <Instagram className="w-4 h-4" />;
      case 'facebook':
        return <Facebook className="w-4 h-4" />;
      case 'x':
      case 'twitter':
        return <Twitter className="w-4 h-4" />;
      case 'tiktok':
        return <Music2 className="w-4 h-4" />;
      default:
        return <ExternalLink className="w-4 h-4" />;
    }
  };

  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 text-slate-400 text-sm mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Col 1: Brand & Manifesto */}
        <div className="space-y-4 md:col-span-1">
          <Link to={`/${currentLang}`} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950">
              <Cpu className="w-4 h-4 text-slate-950" />
            </div>
            <span className="text-xl font-black tracking-tight text-white font-sans">
              Tech<span className="text-emerald-400">Orbit</span>
            </span>
          </Link>

          <p className="text-xs leading-relaxed text-slate-400">
            {isUk
              ? 'TechOrbit — це українське технологічне медіа нового покоління. Лабораторні випробування, інженерні огляди та перевірка першоджерел 24/7.'
              : 'TechOrbit is an independent tech publication providing laboratory hardware benchmarks, silicon telemetry, and transparent reporting.'}
          </p>

          {/* Social icons */}
          <div className="flex items-center gap-2 pt-1">
            {socialLinks
              .filter(s => s.is_active && s.url)
              .map(s => (
                <a
                  key={s.id || s.platform}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
                  title={s.platform}
                >
                  {renderSocialIcon(s.platform)}
                </a>
              ))}
          </div>
        </div>

        {/* Col 2: Navigation & Sections */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
            {isUk ? 'Розділи видання' : 'Navigation'}
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to={`/${currentLang}`} className="hover:text-emerald-400 transition-colors">
                {isUk ? 'Головна сторінка' : 'Home'}
              </Link>
            </li>
            <li>
              <Link to={`/${currentLang}/news`} className="hover:text-emerald-400 transition-colors">
                {isUk ? 'Стрічка новин' : 'Tech News'}
              </Link>
            </li>
            <li>
              <Link to={`/${currentLang}/reviews`} className="hover:text-emerald-400 transition-colors">
                {isUk ? 'Огляди гаджетів & Тести' : 'Hardware Reviews'}
              </Link>
            </li>
            <li>
              <Link to={`/${currentLang}/search`} className="hover:text-emerald-400 transition-colors">
                {isUk ? 'Пошук матеріалів' : 'Search Archive'}
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Categories */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
            {isUk ? 'Рубрики' : 'Categories'}
          </h4>
          <ul className="space-y-2 text-xs">
            {categories.map(c => (
              <li key={c.id}>
                <Link
                  to={`/${currentLang}/category/${isUk ? c.slug_uk : c.slug_en}`}
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                  <span>{isUk ? c.name_uk : c.name_en}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 4: Editorial Standards & Legal */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
            {isUk ? 'Редакція & Правові норми' : 'Editorial & Legal'}
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to={`/${currentLang}/about`} className="hover:text-emerald-400 transition-colors">
                {isUk ? 'Про редакцію та місію' : 'About TechOrbit'}
              </Link>
            </li>
            <li>
              <Link to={`/${currentLang}/contact`} className="hover:text-emerald-400 transition-colors">
                {isUk ? 'Контакти та прес-релізи' : 'Contact & Press Pitches'}
              </Link>
            </li>
            <li>
              <Link to={`/${currentLang}/privacy`} className="hover:text-emerald-400 transition-colors">
                {isUk ? 'Політика конфіденційності' : 'Privacy Policy'}
              </Link>
            </li>
            <li>
              <Link to={`/${currentLang}/terms`} className="hover:text-emerald-400 transition-colors">
                {isUk ? 'Правила цитування та Fair Use' : 'Terms & Fair Use'}
              </Link>
            </li>
            <li className="pt-2">
              <Link
                to="/admin"
                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                <span>{isUk ? 'TechOrbit CMS Portal' : 'CMS Portal'}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-900 bg-black/40 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            © {new Date().getFullYear()} TechOrbit Media. {isUk ? 'Всі права захищені.' : 'All rights reserved.'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {isUk
              ? 'Матеріали агрегуються за принципом Fair Use з обов’язковою атрибуцією першоджерел.'
              : 'Syndicated releases attribute primary publishers under Fair Use doctrine.'}
          </div>
        </div>
      </div>
    </footer>
  );
}
