import { useNavigate } from 'react-router-dom';
import { CreditCard, Bell, Shield, LogOut, Settings, FileText, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { signOut } from '../../firebase/auth';
import { useClientApps } from '../../hooks/useClientApps';
import { downloadContract } from '../../lib/contract';
import { PageHeader } from '../../layout/TopBar';
import { GlassCard, SettingsRow } from '../../components';
import { fmtDate, fmt } from '../../lib/format';

function initials(name = '') {
  return name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
}

export default function ClientProfile() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const name = profile?.name ?? '';
  const { client, apps, loading } = useClientApps();

  const handleDownloadContract = (app) => {
    downloadContract({
      app,
      client,
      investor: null,
      ownerName: '',
      payments: [],
    });
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh' }}>
      <PageHeader title="Профиль"
        right={
          <button style={{ width:40,height:40,borderRadius:12,display:'grid',placeItems:'center',background:'var(--glass)',border:'1px solid var(--line)',color:'var(--txt-mid)',cursor:'pointer' }}>
            <Settings size={18} strokeWidth={1.7} />
          </button>
        }
      />
      <div className="page-scroll">
        <GlassCard style={{ marginBottom:14, textAlign:'center', padding:22 }}>
          <div style={{
            width:72, height:72, borderRadius:22, display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'var(--disp)', fontWeight:600, fontSize:26, color:'var(--gold-lite)',
            background:'linear-gradient(150deg,#1A2740,#131D33)', border:'1px solid var(--line)',
            margin:'0 auto 14px',
          }}>{initials(name)}</div>
          <div className="h-title" style={{ fontSize:20 }}>{name}</div>
          <div style={{
            marginTop:10, display:'inline-flex', alignItems:'center', gap:6,
            fontSize:11, fontWeight:600, padding:'5px 10px', borderRadius:8,
            background:'var(--gold-soft)', border:'1px solid var(--line-gold)', color:'var(--gold-lite)',
          }}>Клиент</div>
        </GlassCard>

        {/* Per-app contracts */}
        {!loading && apps.length > 0 && (
          <GlassCard style={{ marginBottom:14 }}>
            <div className="eyebrow" style={{ marginBottom:10 }}>Мои договоры</div>
            {apps.map((app, i) => (
              <div key={app.id} style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'11px 0',
                borderTop: i > 0 ? '1px solid var(--line)' : undefined,
              }}>
                <div style={{
                  width:38, height:38, borderRadius:11, flexShrink:0,
                  display:'grid', placeItems:'center',
                  background:'var(--navy-700)', border:'1px solid var(--line)',
                }}>
                  <FileText size={16} strokeWidth={1.7} style={{ color:'var(--gold-lite)' }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {app.product ?? 'Договор'}
                  </div>
                  <div className="faint" style={{ fontSize:10.5, marginTop:2 }}>
                    {fmt(app.amount ?? 0)} · {app.term ?? 0} мес
                    {app.fundedFromDate ? ` · ${fmtDate(app.fundedFromDate)}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadContract(app)}
                  title="Скачать договор"
                  style={{
                    width:34, height:34, borderRadius:10, flexShrink:0,
                    display:'grid', placeItems:'center', cursor:'pointer',
                    background:'rgba(91,212,154,.08)', border:'1px solid rgba(91,212,154,.3)',
                    color:'var(--ok)',
                  }}>
                  <Download size={15} strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </GlassCard>
        )}

        <GlassCard style={{ padding:'4px 18px 8px' }}>
          <SettingsRow icon={CreditCard} title="Способы оплаты" subtitle="Карта •• 4417" />
          <SettingsRow icon={Bell}       title="Уведомления"    subtitle="Напоминания о платежах" onClick={() => nav('/notifications')} />
          <SettingsRow icon={Shield}     title="Безопасность"   subtitle="Вход по Face ID" />
          <SettingsRow icon={LogOut}     title="Выйти" danger onClick={async () => { await signOut(); nav('/login'); }} />
        </GlassCard>
      </div>
    </div>
  );
}
