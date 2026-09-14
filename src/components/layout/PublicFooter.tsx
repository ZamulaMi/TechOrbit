import { Link } from 'react-router-dom';
import { Cpu, ShieldCheck, Rss, ArrowUpRight, Github, Twitter, Youtube, Send } from 'lucide-react';
import { Category, Language } from '../../types.ts';

interface PublicFooterProps {
  categories: Category[];
  currentLang: Language;
}

export function PublicFooter({ categories, currentLang }: PublicFooterProps) {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-sm mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Col 1: About */}
        <div className="space-y-4 md:col-span-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-emerald-500 flex items-center justify-center text-white">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              Tech<span className="text-emerald-400">Orbit</span>
            </span>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            {currentLang === 'uk'
              ? 'TechOrbit — це технологічне медіа нового покоління. Ми агрегуємо першоджерела, перевіряємо факти, адаптуємо матеріали українською мовою та забезпечуємо чесні огляди.'
              : 'TechOrbit is a next-generation technology publication. We aggregate primary industry sources, verify changes, adapt technical breakthroughs and provide honest editorial insights.'}
          </p>
          <div className="flex items-center gap-3 text-slate-400">
            <a href="https://t.me" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors p-1">
              <Send className="w-4 h-4" />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors p-1">
              <Youtube className="w-4 h-4" />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors p-1">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors p-1">
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Col 2: Categories */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            {currentLang === 'uk' ? 'Рубрики' : 'Categories'}
          </h4>
          <ul className="space-y-1.5 text-xs">
            {categories.map(c => (
              <li key={c.id}>
                <Link
                  to={`/category/${currentLang === 'uk' ? c.slug_uk : c.slug_en}`}
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                  {currentLang === 'uk' ? c.name_uk : c.name_en}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3: Editorial Standards & Sources */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            {currentLang === 'uk' ? 'Етика та Першоджерела' : 'Editorial & Sources'}
          </h4>
          <div className="space-y-2 text-xs leading-relaxed text-slate-400">
            <p className="flex items-start gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                {currentLang === 'uk'
                  ? 'Принцип Fair Use: кожна новина містить пряме посилання на першоджерело та автора.'
                  : 'Fair Use Standards: Every syndicated or translated release attributes primary publishers.'}
              </span>
            </p>
            <p>
              {currentLang === 'uk'
                ? 'Власна система Change Detection цілодобово перевіряє зміни в першоджерелах.'
                : 'Built-in automated Change Detection monitors upstream updates 24/7.'}
            </p>
          </div>
        </div>

        {/* Col 4: Platform & CMS */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            {currentLang === 'uk' ? 'Система & Доступ' : 'System & CMS'}
          </h4>
          <div className="space-y-2 text-xs">
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium"
            >
              <span>{currentLang === 'uk' ? 'Вхід до TechOrbit CMS' : 'TechOrbit CMS Login'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <p className="text-slate-500">
              {currentLang === 'uk'
                ? 'Редакційний бекенд з контролем версій, AI-перекладами та модерацією.'
                : 'Editorial backend with versioning, AI translations and moderation.'}
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono">
                <Rss className="w-3 h-3 text-amber-400" /> RSS Feed Active
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-900 bg-slate-950 px-4 py-4 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} TechOrbit Media. Всі права захищено. Built with Google AI Studio.</p>
      </div>
    </footer>
  );
}
