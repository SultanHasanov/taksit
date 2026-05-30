import { useEffect, useState } from 'react';
import { Skeleton } from 'antd';
import { Download, CheckCircle2 } from 'lucide-react';
import { getPayments } from '../../firebase/db';
import { useClientApps } from '../../hooks/useClientApps';
import { PageHeader } from '../../layout/TopBar';
import { GlassCard, MiniDot } from '../../components';
import ContractSwitcher from '../../components/ContractSwitcher';
import { fmt, fmtDate } from '../../lib/format';

export default function ClientHistory() {
  const { apps, selected: app, selectedId, setSelectedId, loading } = useClientApps();
  const [paid, setPaid] = useState([]);

  useEffect(() => {
    if (!app) { setPaid([]); return; }
    getPayments(app.id).then(all => setPaid(all.filter(p => p.status === 'paid').reverse()));
  }, [app?.id]);

  const totalPaid = paid.reduce((s,p) => s + p.amount, 0);

  if (loading) return <div style={{padding:20}}><Skeleton active /></div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh' }}>
      <PageHeader title="История" eyebrow="Клиент"
        right={
          <button style={{ width:40,height:40,borderRadius:12,display:'grid',placeItems:'center',background:'var(--glass)',border:'1px solid var(--line)',color:'var(--txt-mid)',cursor:'pointer' }}>
            <Download size={18} strokeWidth={1.7} />
          </button>
        }
      />
      <div className="page-scroll">
        <ContractSwitcher apps={apps} selectedId={selectedId} onSelect={setSelectedId} />

        <GlassCard style={{ marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div className="faint" style={{ fontSize:11 }}>Оплачено по договору</div>
            <div className="num" style={{ fontSize:24, fontWeight:600, marginTop:5 }}>{fmt(totalPaid)}</div>
          </div>
          <span style={{
            fontSize:10, fontWeight:600, padding:'4px 9px', borderRadius:8,
            background:'rgba(91,212,154,.13)', color:'var(--ok)',
            display:'inline-flex', alignItems:'center', gap:6,
          }}>
            <MiniDot type="ok" /> Все в срок
          </span>
        </GlassCard>

        <div className="eyebrow" style={{ marginBottom:12 }}>Транзакции</div>

        {paid.map(p => (
          <GlassCard key={p.id} style={{ padding:'14px 16px', marginBottom:10, display:'flex', alignItems:'center', gap:14 }}>
            <div style={{
              width:40, height:40, borderRadius:12, flexShrink:0,
              display:'grid', placeItems:'center',
              color:'var(--ok)', background:'rgba(91,212,154,.08)', border:'1px solid rgba(91,212,154,.2)',
            }}>
              <CheckCircle2 size={18} strokeWidth={1.7} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:13.5 }}>Платёж {p.n} из {paid.length + (app?.term - paid.length)}</div>
              <div className="faint" style={{ fontSize:11, marginTop:1 }}>{p.date} · Карта</div>
            </div>
            <div className="num" style={{ fontSize:14 }}>−{fmt(p.amount)}</div>
          </GlassCard>
        ))}

        {!paid.length && (
          <div className="faint" style={{ textAlign:'center', fontSize:13, marginTop:32 }}>
            Платежей пока нет
          </div>
        )}
      </div>
    </div>
  );
}
