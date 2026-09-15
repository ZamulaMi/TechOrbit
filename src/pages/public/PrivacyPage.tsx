import { Link } from 'react-router-dom';
import { Shield, Lock, FileText, CheckCircle2 } from 'lucide-react';
import { Language } from '../../types.ts';

interface PrivacyPageProps {
  currentLang: Language;
}

export function PrivacyPage({ currentLang }: PrivacyPageProps) {
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
          <span>{isUk ? 'Політика конфіденційності' : 'Privacy Policy'}</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight flex items-center gap-3">
          <Lock className="w-8 h-8 md:w-10 h-10 text-emerald-400" />
          <span>{isUk ? 'Політика конфіденційності' : 'Privacy Policy'}</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-400 font-mono">
          {isUk ? 'Останнє оновлення: 14 вересня 2026 року • GDPR & Cookie Compliance' : 'Last updated: September 14, 2026 • GDPR Compliant'}
        </p>
      </div>

      <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">
            {isUk ? '1. Загальні положення' : '1. General Provisions'}
          </h2>
          <p>
            {isUk
              ? 'Видання TechOrbit («ми», «наш сайт») поважає право кожного читача на недоторканність приватного життя. Ця Політика конфіденційності пояснює, які дані збираються під час використання сайту techorbit.ua, як вони обробляються та захищаються.'
              : 'TechOrbit ("we", "our site") respects your privacy. This Privacy Policy details the information collected during your use of techorbit.ua and how we safeguard your personal data in accordance with international standards.'}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">
            {isUk ? '2. Які дані ми збираємо' : '2. Information We Collect'}
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li>
              <strong className="text-slate-200">
                {isUk ? 'Аналітика відвідувань:' : 'Traffic and usage analytics:'}
              </strong>{' '}
              {isUk
                ? 'Анонімізовані дані про перегляди сторінок, тип браузера, роздільну здатність екрана та час читання матеріалів.'
                : 'Anonymized metrics regarding page views, browser user-agent, device screen density, and reading duration.'}
            </li>
            <li>
              <strong className="text-slate-200">
                {isUk ? 'Підписка на дайджест:' : 'Newsletter subscription:'}
              </strong>{' '}
              {isUk
                ? 'Ваша адреса електронної пошти, надана добровільно для отримання тижневого технологічного дайджесту.'
                : 'Your email address submitted voluntarily to receive weekly curated industry recaps.'}
            </li>
            <li>
              <strong className="text-slate-200">
                {isUk ? 'Контактна форма:' : 'Contact queries:'}
              </strong>{' '}
              {isUk
                ? 'Ім’я та контактний email, передані при надсиланні запитів до редакції.'
                : 'Name and email communicated when issuing editorial or PR tips.'}
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">
            {isUk ? '3. Файли Cookie та локальне сховище' : '3. Cookies & Local Storage'}
          </h2>
          <p>
            {isUk
              ? 'Ми використовуємо технічні файли cookie та localStorage виключно для збереження обраної мови (UA/EN), теми інтерфейсу та запобігання повторному показу банерів. Ми не використовуємо інвазивні трекери сторонніх рекламних мереж без вашої прямої згоди.'
              : 'We utilize essential cookies and localStorage exclusively to retain preferred locale preferences (UA/EN), interface themes, and prevent repeated subscription modals. We do not sell personally identifiable information to external data brokers.'}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">
            {isUk ? '4. Ваші права' : '4. User Data Rights'}
          </h2>
          <p>
            {isUk
              ? 'Згідно з GDPR та законодавством України, ви маєте право запросити видалення вашої електронної пошти з бази підписників у будь-який момент за посиланням у футері кожного листа або через звернення до privacy@techorbit.ua.'
              : 'Under GDPR and applicable statutory laws, you retain the right to access, rectify, or purge your stored newsletter records at any point via the direct unsubscribe link or by reaching out to privacy@techorbit.ua.'}
          </p>
        </section>
      </div>
    </div>
  );
}
