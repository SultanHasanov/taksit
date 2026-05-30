import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Skeleton } from 'antd';
import { getDocument, getPayments } from '../../firebase/db';
import { PageHeader } from '../../layout/TopBar';
import { GlassCard, KV, Divider, StatusPill, Timeline } from '../../components';
import { fmt, fmtDate } from '../../lib/format';

export default function InvDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [app, setApp]       = useState(null);
  const [client, setClient] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [a, p] = await Promise.all([getDocument('applications', id), getPayments(id)]);
      setApp(a); setPayments(p);
      if (a?.clientId) setClient(await getDocument('clients', a.clientId));
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div style={{ padding: 20 }}><Skeleton active /></div>;

  const paidCount = payments.filter(p => p.status === 'paid').length;
  const earned    = payments.filter(p => p.status === 'paid').reduce((s,p) => s + p.profit, 0);
  const roi       = app?.amount ? ((app.total - app.amount) / app.amount * 100).toFixed(1) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title={`Заявка #${id?.slice(-4)}`} eyebrow="Детали" onBack={() => nav(-1)} />
      <div className="page-scroll nonav" style={{ paddingBottom: 24 }}>

        {client && (
          <GlassCard style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily:'var(--disp)', fontWeight:600, fontSize:18, color:'var(--gold-lite)',
                background:'var(--navy-700)', border:'1px solid var(--line)', flexShrink:0,
              }}>
                {client.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
              </div>
              <div>
                <div className="h-title" style={{ fontSize: 18 }}>{client.name}</div>
                <div className="faint" style={{ fontSize: 11.5 }}>{client.address ?? '—'}</div>
              </div>
            </div>
          </GlassCard>
        )}

        <GlassCard gold style={{ marginBottom: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Сводка по займу</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div className="faint" style={{ fontSize: 11 }}>Основной долг</div>
              <div className="num" style={{ fontSize: 28, fontWeight: 600 }}>{fmt(app?.amount ?? 0)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="faint" style={{ fontSize: 11 }}>{app?.product}</div>
              <div className="num" style={{ fontSize: 14, color: 'var(--gold-lite)' }}>
                {app?.term} мес · {app?.percent}%
              </div>
            </div>
          </div>
        </GlassCard>

        {payments.length > 0 && (
          <GlassCard style={{ marginBottom: 14, padding: '18px 18px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="h-title" style={{ fontSize: 15 }}>График платежей</div>
              <span className="faint" style={{ fontSize: 11 }}>оплачено {paidCount}/{payments.length}</span>
            </div>
            <Timeline payments={payments} />
          </GlassCard>
        )}

        <GlassCard style={{ marginBottom: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Расчёт прибыли</div>
          <KV k="Вложенный капитал"  v={fmt(app?.amount ?? 0)} />
          <KV k="Итого к возврату"   v={fmt(app?.total ?? 0)} />
          <KV k="Валовая прибыль"    v={`+${fmt((app?.total ?? 0) - (app?.amount ?? 0))}`} vStyle={{ color: 'var(--gold-lite)' }} />
          <Divider style={{ margin: '8px 0' }} />
          <KV k={`Заработано (${paidCount} платеж.)`} v={`+${fmt(earned)}`} vStyle={{ color: 'var(--gold-lite)' }} />
          <KV k="Чистый ROI" v={`${roi}%`} vStyle={{ fontSize: 18, color: 'var(--gold-lite)' }} />
        </GlassCard>
      </div>
    </div>
  );
}
