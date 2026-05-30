import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Users, Plus, FileText, BarChart2,
  Layers, TrendingUp, User, Wallet, MoreHorizontal,
  Calendar, Clock, LogOut,
} from 'lucide-react';
import { Popover } from 'antd';
import { useState } from 'react';
import { signOut } from '../firebase/auth';

const navStyle = {
  position: 'fixed', bottom: 0, left: 0, right: 0,
  height: 'calc(72px + env(safe-area-inset-bottom, 0px))',
  background: 'linear-gradient(180deg,rgba(12,18,32,.9),var(--navy-950) 60%)',
  borderTop: '1px solid var(--line)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around',
  paddingTop: 12,
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  zIndex: 100,
  backdropFilter: 'blur(10px)',
};

function NavItem({ icon: Icon, label, path, active, isFab, onClick }) {
  const style = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    color: active ? 'var(--gold-lite)' : 'var(--txt-lo)',
    fontSize: 9.5, fontWeight: 600, letterSpacing: '.03em',
    cursor: 'pointer', flex: 1, transition: '.2s', border: 'none', background: 'none',
  };

  if (isFab) {
    return (
      <button style={{ ...style, marginTop: -24 }} onClick={onClick}>
        <div style={{
          width: 50, height: 50, borderRadius: 16, display: 'grid', placeItems: 'center',
          background: 'linear-gradient(145deg,#E6CD8C,#CBA45A)',
          color: '#2A2008', boxShadow: '0 14px 28px -8px rgba(203,164,90,.55)',
        }}>
          <Icon size={22} strokeWidth={2.2} color="#2A2008" />
        </div>
      </button>
    );
  }

  return (
    <button style={style} onClick={onClick}>
      <Icon size={22} strokeWidth={1.7} />
      <span>{label}</span>
    </button>
  );
}

export function AdminBottomNav() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreContent = (
    <div style={{ minWidth: 160 }}>
      {[
        { label: 'Инвесторы', path: '/admin/investors', icon: Layers },
        { label: 'Расходы',   path: '/admin/expenses',  icon: Wallet },
        { label: 'Отчёты',    path: '/admin/reports',   icon: BarChart2 },
      ].map(({ label, path, icon: Icon }) => (
        <div key={path}
          onClick={() => { nav(path); setMoreOpen(false); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 4px', cursor: 'pointer',
            color: pathname.startsWith(path) ? 'var(--gold-lite)' : 'var(--txt-mid)',
            fontSize: 13, fontWeight: 500,
          }}>
          <Icon size={16} strokeWidth={1.7} />
          {label}
        </div>
      ))}
      <div style={{ height: 1, background: 'var(--line)', margin: '6px 0' }} />
      <div
        onClick={async () => { setMoreOpen(false); await signOut(); nav('/login'); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 4px', cursor: 'pointer',
          color: 'var(--bad)', fontSize: 13, fontWeight: 500,
        }}>
        <LogOut size={16} strokeWidth={1.7} />
        Выйти
      </div>
    </div>
  );

  return (
    <nav style={navStyle}>
      <NavItem icon={Home}     label="Главная" path="/admin"         active={pathname === '/admin'}         onClick={() => nav('/admin')} />
      <NavItem icon={Users}    label="Клиенты" path="/admin/clients" active={pathname.startsWith('/admin/clients')} onClick={() => nav('/admin/clients')} />
      <NavItem icon={Plus} isFab onClick={() => nav('/admin/new-application')} />
      <NavItem icon={FileText} label="Заявки"  path="/admin/apps"    active={pathname.startsWith('/admin/apps')} onClick={() => nav('/admin/apps')} />
      <Popover content={moreContent} trigger="click" open={moreOpen} onOpenChange={setMoreOpen}
        overlayStyle={{ '--ant-color-bg-elevated': 'var(--navy-800)' }}>
        <button style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          color: ['/admin/investors','/admin/expenses','/admin/reports'].some(p => pathname.startsWith(p)) ? 'var(--gold-lite)' : 'var(--txt-lo)',
          fontSize: 9.5, fontWeight: 600, cursor: 'pointer', flex: 1, border: 'none', background: 'none',
        }}>
          <MoreHorizontal size={22} strokeWidth={1.7} />
          <span>Ещё</span>
        </button>
      </Popover>
    </nav>
  );
}

export function InvestorBottomNav() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const items = [
    { icon: Layers,      label: 'Портфель', path: '/portfolio' },
    { icon: TrendingUp,  label: 'Доход',    path: '/returns' },
    { icon: Wallet,      label: 'Расходы',  path: '/inv-expenses' },
    { icon: User,        label: 'Профиль',  path: '/inv-profile' },
  ];
  return (
    <nav style={navStyle}>
      {items.map(({ icon: Icon, label, path }) => (
        <NavItem key={path} icon={Icon} label={label} active={pathname.startsWith(path)} onClick={() => nav(path)} />
      ))}
    </nav>
  );
}

export function ClientBottomNav() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const items = [
    { icon: Home,     label: 'Главная', path: '/me' },
    { icon: Calendar, label: 'График',  path: '/schedule' },
    { icon: Clock,    label: 'История', path: '/history' },
    { icon: User,     label: 'Профиль', path: '/cli-profile' },
  ];
  return (
    <nav style={navStyle}>
      {items.map(({ icon: Icon, label, path }) => (
        <NavItem key={path} icon={Icon} label={label} active={pathname.startsWith(path)} onClick={() => nav(path)} />
      ))}
    </nav>
  );
}
