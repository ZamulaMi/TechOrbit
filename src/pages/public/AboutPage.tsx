import { Link } from 'react-router-dom';
import { Cpu, ShieldCheck, Award, Eye, Compass, Users, ArrowRight } from 'lucide-react';
import { Language } from '../../types.ts';

interface AboutPageProps {
  currentLang: Language;
}

export function AboutPage({ currentLang }: AboutPageProps) {
  const isUk = currentLang === 'uk';

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 space-y-16">
      {/* Hero section */}
      <div className="space-y-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-mono font-medium">
          <Cpu className="w-3.5 h-3.5" />
          <span>{isUk ? 'Маніфест видання TechOrbit' : 'TechOrbit Editorial Manifesto'}</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
          {isUk
            ? 'Технологічна журналістика нової ери: швидкість, точність, прозорість.'
            : 'Next-Generation Tech Journalism: Velocity, Accuracy, Transparency.'}
        </h1>

        <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          {isUk
            ? 'TechOrbit — це незалежне українське технологічне медіа з інженерним підходом до оглядів, повною прозорістю джерел та безкомпромісною якістю перекладів.'
            : 'TechOrbit is an independent publication delivering rigorous hardware lab benchmarks, primary source verification, and transparent reporting for the global technology ecosystem.'}
        </p>
      </div>

      {/* Core Principles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">
            {isUk ? 'Fair Use & Першоджерела' : 'Fair Use & Attribution'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isUk
              ? 'Ми поважаємо авторів первинних релізів. Кожен перекладений чи адаптований матеріал містить пряме посилання на джерело, ім’я журналіста та дату публікації.'
              : 'We respect original investigative work. Every syndicated story or translated leak attributes the original publication and author.'}
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">
            {isUk ? 'Лабораторний стандарт' : 'Hardware Lab Testing'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isUk
              ? 'Наші оцінки базуються на реальних тестах: колориметрія дисплеїв, тепловізор при навантаженні, вимірювання струму зарядки та реальний час автономності.'
              : 'Our verdicts stem from empirical measurement: calibrated display measurements, thermal dissipation under load, and real-world battery drainage.'}
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400">
            <Eye className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">
            {isUk ? 'Change Detection 24/7' : 'Continuous Change Tracking'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isUk
              ? 'Власний робот TechOrbit моніторить первинні джерела та оновлення специфікацій, повідомляючи читачів про коригування інформації виробниками.'
              : 'Our automated ingestion engine tracks updates, corrections, and spec adjustments across manufacturer releases.'}
          </p>
        </div>
      </div>

      {/* Editorial Standards in detail */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-8 space-y-6">
        <h2 className="text-2xl font-black text-white">
          {isUk ? 'Як працює редакція TechOrbit' : 'How TechOrbit Operates'}
        </h2>

        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <p>
            {isUk
              ? 'Ми створили TechOrbit для тих, хто втомився від клікбейту, прихованої джинси та перекладених машиною новин з помилками в термінології. Наша редакційна система поєднує інтелектуальну агрегацію джерел із глибокою фаховою експертизою авторів.'
              : 'TechOrbit was built for readers exhausted by sponsored fluff and unverified rumours. Our CMS unites automated feed discovery with dedicated editorial oversight, verifying benchmarks before publishing.'}
          </p>
          <p>
            {isUk
              ? 'Двомовність (Українська та Англійська) є фундаментальним стандартом видання. Кожен важливий реліз локалізується з адаптацією для українського ринку (доступність офіційних поставок, ціни в гривнях, підтримка мереж).'
              : 'Bilingual support (Ukrainian and English) is integral to our architecture. Readers can switch languages instantly with complete editorial parity across all features.'}
          </p>
        </div>

        <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs text-slate-400 font-mono">
            {isUk ? 'Є питання або пропозиція співпраці?' : 'Have feedback or a press pitch?'}
          </span>
          <Link
            to={`/${currentLang}/contact`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            <span>{isUk ? 'Зв’язатися з редакцією' : 'Contact Editorial Board'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
