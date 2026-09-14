import { useState, useEffect, ReactNode, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.tsx';
import { AdminSidebar } from './AdminSidebar.tsx';
import { AdminHeader } from './AdminHeader.tsx';
import { api } from '../../api/client.ts';
import { AlertCircle, KeyRound, Check, X } from 'lucide-react';

interface AdminLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function AdminLayout({ title, subtitle, children, onRefresh, refreshing }: AdminLayoutProps) {
  const { user, loading, refresh } = useAuth();
  const [reviewCount, setReviewCount] = useState(0);
  const [changesCount, setChangesCount] = useState(0);

  // Password change state for `must_change_password` requirement
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [submittingPassword, setSubmittingPassword] = useState(false);

  useEffect(() => {
    if (user?.must_change_password) {
      setShowPasswordModal(true);
    }
  }, [user]);

  const loadBadgeStats = async () => {
    try {
      const data = await api.admin.getStats();
      setReviewCount(data.counts.reviewQueue);
      setChangesCount(data.counts.pendingChanges);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (user) {
      loadBadgeStats();
    }
  }, [user]);

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 8) {
      setPasswordError('Новий пароль повинен містити щонайменше 8 символів');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Підтвердження пароля не збігається');
      return;
    }

    setSubmittingPassword(true);
    try {
      await api.auth.changePassword({ oldPassword, newPassword });
      setPasswordSuccess('Пароль успішно оновлено!');
      setTimeout(async () => {
        setShowPasswordModal(false);
        await refresh();
      }, 1200);
    } catch (err: any) {
      setPasswordError(err.message || 'Помилка зміни пароля');
    } finally {
      setSubmittingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono">Завантаження TechOrbit CMS...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <AdminSidebar reviewCount={reviewCount} changesCount={changesCount} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          title={title}
          subtitle={subtitle}
          onRefresh={async () => {
            await loadBadgeStats();
            if (onRefresh) onRefresh();
          }}
          refreshing={refreshing}
        />

        {/* Password change banner if required */}
        {user.must_change_password && !showPasswordModal && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between text-amber-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                <strong>Увага:</strong> Вам призначено тимчасовий пароль. Рекомендуємо змінити пароль для безпеки.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold transition-colors"
            >
              Змінити пароль зараз
            </button>
          </div>
        )}

        <main className="flex-1 p-6 overflow-y-auto bg-slate-950/80">{children}</main>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Обов'язкова зміна пароля</h3>
                  <p className="text-xs text-slate-400">Встановіть новий надійний пароль для облікового запису</p>
                </div>
              </div>
              {!user.must_change_password && (
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {passwordError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Поточний / початковий пароль</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="Введіть поточний пароль (AdminTechOrbit2025!)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Новий пароль (мін. 8 символів)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Введіть новий пароль"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Підтвердження нового пароля</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Повторіть новий пароль"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                {!user.must_change_password && (
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                  >
                    Скасувати
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submittingPassword}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {submittingPassword ? 'Збереження...' : 'Зберегти новий пароль'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
