import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from 'antd';
import { getCollection, where } from '../../firebase/db';
import { hasPending } from '../../lib/limits';
import TopBar from '../../layout/TopBar';
import { GlassCard, StatCard } from '../../components';
import { fmt } from '../../lib/format';

export default function SuperDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [subs, setSubs] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    Promise.all([
      getCollection('users', [where('role', '==', 'admin')]),
      getCollection('subscriptions'),
      getCollection('subscriptionPayments'),
    ]).then(([a, s, p]) => {
      setAdmins(a); setSubs(s); setPayments(p); setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ padding: 20 }}><Skeleton active /></div>;

  const subMap = Object.fromEntries(subs.map(s => [s.id, s]));
  const activeCount = subs.filter(s => s.status === 'active' && !hasPending(s)).length;
  const pendingCount = subs.filter(s => hasPending(s)).length;
  const revenue = payments.reduce((s, p) => s + (p.amount ?? 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <TopBar subtitle="Платформа" title="Обзор" />
      <div className="page-scroll">
        <div className="grid-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginBottom: 14 }}>
          <StatCard label="Админов" value={admins.length} />
          <StatCard label="Активных подписок" value={activeCount} dot="ok" />
          <StatCard label="Ожидают оплаты" value={pendingCount} dot={pendingCount ? 'warn' : undefined} />
          <StatCard label="Выручка" value={fmt(revenue)} sub={`${payments.length} платежей`} />
        </div>

        <GlassCard style={{ marginBottom: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Админы</div>
          {admins.length === 0 && <div className="faint" style={{ fontSize: 12.5 }}>Пока нет админов</div>}
          {admins.map(a => {
            const sub = subMap[a.id];
            return (
              <div key={a.id} onClick={() => nav(`/super/admins/${a.id}`)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '11px 0', borderTop: '1px solid var(--line)', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.name}</div>
                  <div className="faint" style={{ fontSize: 11 }}>{a.login ?? a.email}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontSize: 12.5, color: hasPending(sub) ? 'var(--warn)' : sub?.status === 'active' ? 'var(--ok)' : 'var(--txt-lo)' }}>
                    {hasPending(sub) ? 'Ожидает' : sub?.status === 'active' ? 'Активна' : '—'}
                  </div>
                </div>
              </div>
            );
          })}
        </GlassCard>
      </div>
    </div>
  );
}
