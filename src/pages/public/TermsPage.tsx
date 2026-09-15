import { Link } from 'react-router-dom';
import { Scale, ShieldCheck, FileCheck, CheckCircle2 } from 'lucide-react';
import { Language } from '../../types.ts';

interface TermsPageProps {
  currentLang: Language;
}

export function TermsPage({ currentLang }: TermsPageProps) {
  const isUk = currentLang === 'uk';

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 space-y-10">
      {/* Breadcrumb */}
      <div className="space-y-3 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider">
          <Link to={`/${currentLang}`} className="hover:underline">
            {isUk ? 'Головна' : 'Home'}
          </Link>
          <span>/</span>
          <span>{isUk ? 'Правила користування' : 'Terms of Service'}</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight flex items-center gap-3">
          <Scale className="w-8 h-8 md:w-10 h-10 text-emerald-400" />
          <span>{isUk ? 'Умови використання' : 'Terms of Service'}</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-400 font-mono">
          {isUk ? 'Редакційна угода та стандарти цитування матеріалів TechOrbit' : 'Usage guidelines & syndication policies'}
        </p>
      </div>

      <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">
            {isUk ? '1. Авторські права та цитування' : '1. Intellectual Property & Citation Rules'}
          </h2>
          <p>
            {isUk
              ? 'Усі ексклюзивні матеріали, авторські огляди, лабораторні вимірювання та фотографії, створені редакцією TechOrbit, захищені авторським правом. Використання цитат дозволяється за умови обов’язкового прямого гіперпосилання на першоджерело не нижче другого абзацу тексту.'
              : 'All bespoke reviews, empirical lab testing datasets, and original photographs produced by TechOrbit editorial staff are copyrighted. Syndication or quotation by third-party outlets requires a clear, hyperlinked attribution within the opening two paragraphs of the derivative piece.'}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">
            {isUk ? '2. Принцип Fair Use та першоджерела' : '2. Fair Use & Sourced Intelligence'}
          </h2>
          <p>
            {isUk
              ? 'TechOrbit часто аналізує та адаптує публічні звіти, технічні документи та релізи іноземних джерел. Ми неухильно дотримуємось міжнародного стандарту Fair Use, завжди вказуючи початкових авторів та надаючи посилання на оригінальні публікації.'
              : 'TechOrbit regularly contextualizes, translates, and expands upon global disclosures and patents. We rigorously uphold international Fair Use doctrines by providing direct, unambiguous links to original authors and reports.'}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">
            {isUk ? '3. Відповідальність та відмова від фінансових порад' : '3. Disclaimer of Financial & Investment Advice'}
          </h2>
          <p>
            {isUk
              ? 'Інформація про капіталізацію технологічних компаній, криптовалюти та оцінки гаджетів публікується виключно в пізнавальних та оглядових цілях і не є фінансовою чи інвестиційною порадою.'
              : 'Coverage pertaining to corporate valuations, crypto infrastructure, or equipment procurement is distributed solely for educational and editorial awareness and does not constitute formal financial counseling.'}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">
            {isUk ? '4. Зміни до умов' : '4. Amendments'}
          </h2>
          <p>
            {isUk
              ? 'Редакція залишає за собою право вносити зміни до цих Умов у будь-який час із публікацією актуальної дати перегляду на цій сторінці.'
              : 'The publisher reserves the right to revise these Terms periodically with an updated revision date noted at the header.'}
          </p>
        </section>
      </div>
    </div>
  );
}
