import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Users, Plus, FileText, BarChart2, Layers, TrendingUp, User, Wallet,
  Calendar, Clock, LogOut, Shield, Tag, Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../firebase/auth';

// Пункты навигации по роли — те же разделы, что и в нижней навигации.
const NAV = {
  superadmin: [
    { icon: Home,   label: 'Обзор',   path: '/super' },
    { icon: Shield, label: 'Админы',  path: '/super/admins' },
    { icon: Tag,    label: 'Тарифы',  path: '/super/tariffs' },
    { icon: Trash2, label: 'Корзина', path: '/super/trash' },
  ],
  admin: [
    { icon: Home,     label: 'Главная',   path: '/admin' },
    { icon: Users,    label: 'Клиенты',   path: '/admin/clients' },
    { icon: Plus,     label: 'Новая заявка', path: '/admin/new-application' },
    { icon: FileText, label: 'Заявки',    path: '/admin/apps' },
    { icon: Layers,   label: 'Инвесторы', path: '/admin/investors' },
    { icon: Wallet,   label: 'Расходы',   path: '/admin/expenses' },
    { icon: BarChart2,label: 'Отчёты',    path: '/admin/reports' },
    { icon: Tag,      label: 'Подписка',  path: '/admin/subscription' },
  ],
  investor: [
    { icon: Layers,     label: 'Портфель', path: '/portfolio' },
    { icon: TrendingUp, label: 'Доход',    path: '/returns' },
    { icon: Wallet,     label: 'Расходы',  path: '/inv-expenses' },
    { icon: User,       label: 'Профиль',  path: '/inv-profile' },
  ],
  client: [
    { icon: Home,     label: 'Главная', path: '/me' },
    { icon: Calendar, label: 'График',  path: '/schedule' },
    { icon: Clock,    label: 'История', path: '/history' },
    { icon: User,     label: 'Профиль', path: '/cli-profile' },
  ],
};

export default function Sidebar() {
  const { role, profile } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const items = NAV[role] ?? [];
  if (!items.length) return null;

  const isActive = (path) =>
    path === '/admin' || path === '/super' || path === '/me'
      ? pathname === path
      : pathname.startsWith(path);

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-brand">
        <div className="app-sidebar-logo">T</div>
        <div>
          <div className="h-title" style={{ fontSize: 16 }}>TAKSIT</div>
          <div className="faint" style={{ fontSize: 11 }}>{profile?.name ?? ''}</div>
        </div>
      </div>

      <nav className="app-sidebar-nav">
        {items.map(({ icon: Icon, label, path }) => {
          const active = isActive(path);
          return (
            <button key={path} onClick={() => nav(path)}
              className={`app-sidebar-item${active ? ' active' : ''}`}>
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <button className="app-sidebar-item logout"
        onClick={async () => { await signOut(); nav('/login'); }}>
        <LogOut size={19} strokeWidth={1.8} />
        <span>Выйти</span>
      </button>
    </aside>
  );
}
