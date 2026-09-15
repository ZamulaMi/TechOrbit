import { useState, FormEvent } from 'react';
import { Mail, CheckCircle2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { api } from '../../api/client.ts';
import { Language } from '../../types.ts';

interface NewsletterSectionProps {
  currentLang: Language;
}

export function NewsletterSection({ currentLang }: NewsletterSectionProps) {
  const isUk = currentLang === 'uk';
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;

    setStatus('loading');
    try {
      const res = await api.public.subscribeNewsletter(email.trim());
      setStatus('success');
      setMessage(
        isUk
          ? 'Дякуємо! Ви успішно підписалися на технологічний дайджест TechOrbit.'
          : 'Thank you! You are now subscribed to the TechOrbit curated newsletter.'
      );
      setEmail('');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || (isUk ? 'Помилка при оформленні підписки' : 'Failed to subscribe'));
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-8 md:p-12 shadow-2xl">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isUk ? 'Щотижневий дайджест' : 'Curated Tech Digest'}</span>
        </div>

        <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">
          {isUk
            ? 'Технології майбутнього без спаму та води'
            : 'Next-Gen Technology Without The Noise'}
        </h2>

        <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
          {isUk
            ? 'Отримуйте щоп’ятниці головні новини штучного інтелекту, результати лабораторних тестів гаджетів та вижимку з інженерних звітів безпосередньо у вашу поштову скриньку.'
            : 'Join our Friday dispatch featuring silicon architecture breakdowns, benchmark telemetry, and verified industry shifts.'}
        </p>

        {status === 'success' ? (
          <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="font-semibold">{message}</span>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={isUk ? 'Ваша електронна пошта...' : 'Enter your work email...'}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl pl-11 pr-4 py-3 text-xs md:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{status === 'loading' ? (isUk ? 'Підписка...' : 'Subscribing...') : (isUk ? 'Підписатися' : 'Subscribe')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {status === 'error' && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <p className="text-[11px] text-slate-500 font-mono">
          {isUk
            ? 'Поважаємо приватність. Відписка в один клік у будь-який момент.'
            : 'Zero marketing tracking. One-click unsubscribe anytime.'}
        </p>
      </div>
    </section>
  );
}
