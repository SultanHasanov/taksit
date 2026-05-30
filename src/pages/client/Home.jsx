import { useEffect, useState } from 'react';
import { Button, Skeleton } from 'antd';
import { CreditCard } from 'lucide-react';
import { getPayments } from '../../firebase/db';
import { useClientApps } from '../../hooks/useClientApps';
import TopBar from '../../layout/TopBar';
import { GlassCard, Ring, Timeline, KV, Divider } from '../../components';
import ContractSwitcher from '../../components/ContractSwitcher';
import NotificationBell from '../../components/NotificationBell';
import { fmt, fmtDateShort } from '../../lib/format';

export default function ClientHome() {
  const { client, apps, selected: app, selectedId, setSelectedId, loading } = useClientApps();
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    if (!app) { setPayments([]); return; }
    getPayments(app.id).then(setPayments);
  }, [app?.id]);

  const nextPayment = payments.find(p => p.status === 'next');
  const paidCount   = payments.filter(p => p.status === 'paid').length;
  const total       = payments.length;
  const pct         = total ? Math.round(paidCount / total * 100) : 0;
  const paidSum     = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const remaining   = (app?.total ?? 0) - paidSum;

  if (loading) return <div style={{ padding: 20 }}><Skeleton active /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <TopBar subtitle="С возвращением" right={<NotificationBell clientId={client?.id} />} />
      <div className="page-scroll">

        <ContractSwitcher apps={apps} selectedId={selectedId} onSelect={setSelectedId} />

        {!app && (
          <div style={{ textAlign: 'center', marginTop: 60, color: 'var(--txt-lo)', fontSize: 14 }}>
            У вас пока нет договоров
          </div>
        )}

        {/* Next payment */}
        {nextPayment && (
          <GlassCard gold style={{ marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Следующий платёж</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
              <div>
                <div className="num" style={{ fontSize: 36, fontWeight: 600, lineHeight: 1 }}>
                  {fmt(nextPayment.amount)}
                </div>
                <div className="faint" style={{ fontSize: 12, marginTop: 8 }}>
                  Платёж {nextPayment.n} из {total} · {app?.product}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="num" style={{ fontSize: 16, color: 'var(--gold-lite)' }}>
                  {fmtDateShort(nextPayment.dateIso)}
                </div>
              </div>
            </div>
            <Button type="primary" block size="large"
              style={{
                background: 'linear-gradient(145deg,#E6CD8C,#CBA45A)', border: 'none',
                color: '#2A2008', fontWeight: 600, height: 48,
              }}>
              Оплатить {fmt(nextPayment.amount)}
            </Button>
          </GlassCard>
        )}

        {/* Timeline */}
        {payments.length > 0 && (
          <GlassCard style={{ marginBottom: 16, padding: '18px 18px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="h-title" style={{ fontSize: 15 }}>График платежей</div>
              <span className="faint" style={{ fontSize: 11 }}>оплачено {paidCount}/{total}</span>
            </div>
            <Timeline payments={payments} />
          </GlassCard>
        )}

        {/* Progress ring */}
        <GlassCard style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 20 }}>
          <Ring pct={pct} />
          <div style={{ flex: 1 }}>
            <KV k="Оплачено" v={fmt(paidSum)} />
            <KV k="Остаток" v={fmt(remaining)} vStyle={{ color: 'var(--gold-lite)' }} />
            <Divider style={{ margin: '7px 0' }} />
            <KV k="Сумма договора" v={fmt(app?.total ?? 0)} />
          </div>
        </GlassCard>

        {/* Product */}
        {app && (
          <GlassCard style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 54, height: 54, borderRadius: 14, flexShrink: 0,
              display: 'grid', placeItems: 'center',
              background: 'var(--navy-700)', border: '1px solid var(--line)', color: 'var(--gold-lite)',
            }}>
              <CreditCard size={22} strokeWidth={1.7} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{app.product}</div>
              <div className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>
                {app.category} · {app.term} мес · {app.percent}%
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="num" style={{ fontSize: 14 }}>{fmt(app.amount)}</div>
              <div className="faint" style={{ fontSize: 10 }}>профинансировано</div>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
