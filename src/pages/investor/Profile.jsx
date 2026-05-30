import { useNavigate } from 'react-router-dom';
import { Sliders, Download, Bell, Shield, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { signOut } from '../../firebase/auth';
import { PageHeader } from '../../layout/TopBar';
import { GlassCard, SettingsRow } from '../../components';

function initials(name = '') {
  return name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
}

export default function InvProfile() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const name = profile?.name ?? '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title="Профиль"
        right={
          <button style={{ width:40,height:40,borderRadius:12,display:'grid',placeItems:'center',background:'var(--glass)',border:'1px solid var(--line)',color:'var(--txt-mid)',cursor:'pointer' }}>
            <Settings size={18} strokeWidth={1.7} />
          </button>
        }
      />
      <div className="page-scroll">
        <GlassCard style={{ marginBottom: 14, textAlign: 'center', padding: 22 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily:'var(--disp)', fontWeight:600, fontSize:26, color:'var(--gold-lite)',
            background:'linear-gradient(150deg,#1A2740,#131D33)', border:'1px solid var(--line-gold)',
            margin: '0 auto 14px',
          }}>{initials(name)}</div>
          <div className="h-title" style={{ fontSize: 20 }}>{name}</div>
          <div style={{
            marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 600,
            padding: '5px 10px', borderRadius: 8, color: 'var(--gold-lite)',
            background: 'var(--gold-soft)', border: '1px solid var(--line-gold)',
          }}>Инвестор</div>
        </GlassCard>

        <GlassCard style={{ padding: '4px 18px 8px' }}>
          <SettingsRow icon={Sliders}   title="Параметры инвестирования" subtitle="Настройки портфеля" />
          <SettingsRow icon={Download}  title="Выплаты"                  subtitle="История поступлений" />
          <SettingsRow icon={Bell}      title="Уведомления"              subtitle="Новые поступления и обновления" />
          <SettingsRow icon={Shield}    title="Безопасность"             subtitle="Биометрия · 2FA включена" />
          <SettingsRow icon={LogOut}    title="Выйти" danger onClick={async () => { await signOut(); nav('/login'); }} />
        </GlassCard>
      </div>
    </div>
  );
}
