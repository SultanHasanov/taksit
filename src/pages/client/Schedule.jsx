import { useEffect, useState } from 'react';
import { Skeleton } from 'antd';
import { Download } from 'lucide-react';
import { getPayments } from '../../firebase/db';
import { useClientApps } from '../../hooks/useClientApps';
import { PageHeader } from '../../layout/TopBar';
import { GlassCard, StatusPill } from '../../components';
import ContractSwitcher from '../../components/ContractSwitcher';
import { fmt, fmtDateShort } from '../../lib/format';

export default function ClientSchedule() {
  const { apps, selected: app, selectedId, setSelectedId, loading } = useClientApps();
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    if (!app) { setPayments([]); return; }
    getPayments(app.id).then(setPayments);
  }, [app?.id]);

  const paidCount = payments.filter(p => p.status === 'paid').length;
  const remaining = (app?.total ?? 0) - payments.filter(p=>p.status==='paid').reduce((s,p)=>s+p.amount,0);

  if (loading) return <div style={{padding:20}}><Skeleton active /></div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh' }}>
      <PageHeader title="График" eyebrow="Клиент"
        right={
          <button style={{ width:40,height:40,borderRadius:12,display:'grid',placeItems:'center',background:'var(--glass)',border:'1px solid var(--line)',color:'var(--txt-mid)',cursor:'pointer' }}>
            <Download size={18} strokeWidth={1.7} />
          </button>
        }
      />
      <div className="page-scroll">
        <ContractSwitcher apps={apps} selectedId={selectedId} onSelect={setSelectedId} />

        {!app && (
          <div style={{ textAlign:'center', marginTop:60, color:'var(--txt-lo)', fontSize:14 }}>
            У вас пока нет договоров
          </div>
        )}

        {/* Summary */}
        {app && (
          <GlassCard gold style={{ marginBottom: 14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div className="faint" style={{ fontSize:11 }}>Договор</div>
                <div style={{ fontWeight:600, fontSize:14.5, marginTop:3 }}>{app.product}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div className="num" style={{ fontSize:18, color:'var(--gold-lite)' }}>{fmt(app.monthly)}</div>
                <div className="faint" style={{ fontSize:10.5 }}>в месяц</div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:9, marginBottom:16 }}>
          {[
            ['Оплачено', `${paidCount}/${payments.length}`, 'var(--ok)'],
            ['Остаток',  Math.round(remaining/1000)+'к', undefined],
            ['Срок', app?.term ? app.term+' мес' : '—', undefined],
          ].map(([l,v,c]) => (
            <GlassCard key={l} style={{ padding:'14px 12px', textAlign:'center' }}>
              <div className="num" style={{ fontSize:19, color:c }}>{v}</div>
              <div className="faint" style={{ fontSize:10, marginTop:4 }}>{l}</div>
            </GlassCard>
          ))}
        </div>

        {/* Payments list */}
        {payments.map(p => (
          <GlassCard key={p.id} style={{ padding:'14px 16px', marginBottom:10, display:'flex', alignItems:'center', gap:14 }}>
            <div style={{
              width:38, height:38, borderRadius:12, flexShrink:0, display:'grid', placeItems:'center',
              fontFamily:'var(--disp)', fontWeight:600, fontSize:13,
              background:'var(--navy-700)', border:'1px solid var(--line)',
              color: p.status==='paid' ? 'var(--ok)' : p.status==='next' ? 'var(--gold-lite)' : 'var(--txt-lo)',
              borderColor: p.status==='next' ? 'var(--line-gold)' : undefined,
            }}>
              {p.n}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:13.5 }}>Платёж {p.n}</div>
              <div className="faint" style={{ fontSize:11, marginTop:1 }}>{p.date}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div className="num" style={{ fontSize:14 }}>{fmt(p.amount)}</div>
              <div style={{ marginTop:5 }}><StatusPill status={p.status} /></div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
