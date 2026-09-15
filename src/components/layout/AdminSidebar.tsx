import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Radio,
  GitCompare,
  Image as ImageIcon,
  FolderTree,
  Settings,
  ShieldAlert,
  ExternalLink,
  Cpu,
  LogOut,
  Languages,
  LayoutTemplate,
  Sliders
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface AdminSidebarProps {
  reviewCount?: number;
  changesCount?: number;
}

export function AdminSidebar({ reviewCount = 0, changesCount = 0 }: AdminSidebarProps) {
  const location = useLocation();
  const { logout, user } = useAuth();

  const navigation = [
    { name: 'Панель (Dashboard)', path: '/admin', icon: LayoutDashboard, exact: true },
    { name: 'Конструктор головної', path: '/admin/homepage', icon: LayoutTemplate },
    { name: 'Елементи сайту', path: '/admin/site-elements', icon: Sliders },
    { name: 'Статті & Редактор', path: '/admin/articles', icon: FileText },
    { name: 'Центр перекладів (UA/EN)', path: '/admin/translations', icon: Languages },
    {
      name: 'Черга модерації (Review)',
      path: '/admin/review',
      icon: CheckSquare,
      badge: reviewCount > 0 ? reviewCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold'
    },
    { name: 'Джерела парсингу', path: '/admin/sources', icon: Radio },
    {
      name: 'Відстеження змін (Diffs)',
      path: '/admin/changes',
      icon: GitCompare,
      badge: changesCount > 0 ? changesCount : undefined,
      badgeColor: 'bg-rose-500 text-white font-bold'
    },
    { name: 'Медіатека', path: '/admin/media', icon: ImageIcon },
    { name: 'Рубрики & Теги', path: '/admin/categories', icon: FolderTree },
    { name: 'Налаштування сайту', path: '/admin/settings', icon: Settings },
    { name: 'Журнал аудиту & Синхронізації', path: '/admin/audit', icon: ShieldAlert }
  ];

  const isActive = (itemPath: string, exact?: boolean) => {
    if (itemPath === '/admin/review') {
      return location.pathname.startsWith('/admin/review');
    }
    if (exact) return location.pathname === itemPath;
    return location.pathname.startsWith(itemPath);
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 text-slate-200 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="font-black text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>TechOrbit</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                CMS
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">v1.0 Production</p>
          </div>
        </Link>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Управління контентом
        </div>

        {navigation.map(item => {
          const active = isActive(item.path, item.exact);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                active
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.name}</span>
              </div>

              {item.badge !== undefined && (
                <span className={`px-1.5 py-0.5 text-[10px] rounded-full shrink-0 ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer Profile & Exit */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="truncate">
            <p className="text-xs font-semibold text-white truncate">{user?.username}</p>
            <p className="text-[10px] text-emerald-400 font-mono capitalize">
              {user?.role_name || 'Administrator'}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Вийти з системи"
            className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <Link
          to="/"
          target="_blank"
          className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors border border-slate-700/50"
        >
          <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
          <span>Відкрити публічний сайт</span>
        </Link>
      </div>
    </aside>
  );
}
