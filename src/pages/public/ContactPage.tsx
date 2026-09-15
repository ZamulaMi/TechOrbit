import { useState, FormEvent } from 'react';
import { Mail, MessageSquare, Send, CheckCircle2, Phone, MapPin, Sparkles } from 'lucide-react';
import { Language } from '../../types.ts';

interface ContactPageProps {
  currentLang: Language;
}

export function ContactPage({ currentLang }: ContactPageProps) {
  const isUk = currentLang === 'uk';
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    topic: 'editorial',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 md:py-16 space-y-12">
      {/* Header */}
      <div className="space-y-3 max-w-2xl">
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider">
          <Mail className="w-3.5 h-3.5" />
          <span>{isUk ? 'Контакти та зворотний зв’язок' : 'Editorial Inquiries & Contact'}</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
          {isUk ? 'Напишіть команді TechOrbit' : 'Get in Touch with TechOrbit'}
        </h1>
        <p className="text-sm md:text-base text-slate-400">
          {isUk
            ? 'Ми відкриті для прес-релізів технологічних компаній, надання тестових зразків техніки, виправлень та комерційних спецпроєктів.'
            : 'We welcome product review units, verified investigative tips, press releases, and bespoke brand partnerships.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Contact Form */}
        <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8">
          {submitted ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-14 h-14 bg-emerald-950 border border-emerald-800 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">
                {isUk ? 'Повідомлення успішно відправлено!' : 'Message received!'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {isUk
                  ? 'Дякуємо за звернення. Редактор відповідного напрямку відповість вам протягом одного робочого дня.'
                  : 'Thank you for reaching out. An editorial coordinator will reply within one business day.'}
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setFormData({ name: '', email: '', topic: 'editorial', message: '' });
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
              >
                {isUk ? 'Надіслати ще одне' : 'Send another note'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {isUk ? 'Ваше ім’я або компанія' : 'Your name / Organization'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder={isUk ? 'Олександр або PR Tech Corp' : 'Alex or PR Agency'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {isUk ? 'Електронна пошта' : 'Email address'} *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {isUk ? 'Тема звернення' : 'Inquiry subject'}
                </label>
                <select
                  value={formData.topic}
                  onChange={e => setFormData({ ...formData, topic: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="editorial">
                    {isUk ? 'Редакція / Новини / Виправлення' : 'Editorial Desk / News Tip / Correction'}
                  </option>
                  <option value="reviews">
                    {isUk ? 'Надання зразків техніки на тест' : 'Hardware Review Unit Submission'}
                  </option>
                  <option value="advertising">
                    {isUk ? 'Реклама та спецпроєкти' : 'Advertising & Sponsorship'}
                  </option>
                  <option value="technical">
                    {isUk ? 'Технічна помилка на сайті' : 'Technical Bug Report'}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {isUk ? 'Повідомлення' : 'Message'} *
                </label>
                <textarea
                  required
                  rows={5}
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  placeholder={
                    isUk
                      ? 'Опишіть деталі новини, дату ембарго або пропозицію співпраці...'
                      : 'Provide embargo dates, press kit links, or details of your partnership idea...'
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{sending ? (isUk ? 'Відправка...' : 'Sending...') : (isUk ? 'Надіслати листа' : 'Submit message')}</span>
              </button>
            </form>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 font-mono">
              {isUk ? 'Прямі контакти' : 'Direct Desks'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <div className="text-slate-400">{isUk ? 'Головний редактор:' : 'Editor-in-Chief:'}</div>
                <div className="font-mono text-emerald-400 font-medium">editor@techorbit.ua</div>
              </div>

              <div>
                <div className="text-slate-400">{isUk ? 'Прес-релізи та новини:' : 'Press Releases:'}</div>
                <div className="font-mono text-slate-200">press@techorbit.ua</div>
              </div>

              <div>
                <div className="text-slate-400">{isUk ? 'Лабораторія оглядів:' : 'Hardware Lab:'}</div>
                <div className="font-mono text-slate-200">reviews@techorbit.ua</div>
              </div>

              <div>
                <div className="text-slate-400">{isUk ? 'Рекламний відділ:' : 'Advertising Desk:'}</div>
                <div className="font-mono text-slate-200">ads@techorbit.ua</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 font-mono">
              {isUk ? 'Локація' : 'HQ Location'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isUk
                ? 'Київ, Україна. Редакція працює щоденно з 09:00 до 21:00 за київським часом.'
                : 'Kyiv, Ukraine. Operations live daily 09:00 - 21:00 EET.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
