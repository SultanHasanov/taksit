import { useEffect, useState } from 'react';
import { Skeleton } from 'antd';
import { Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getCollection, getExpenses, where } from '../../firebase/db';
import { PageHeader } from '../../layout/TopBar';
import { GlassCard } from '../../components';
import { fmt, fmtDate } from '../../lib/format';

export default function InvExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [linked, setLinked]     = useState(true);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const invs = await getCollection('investors', [where('uid', '==', user.uid)]);
      const inv = invs[0];
      if (!inv) { setLinked(false); setLoading(false); return; }
      setExpenses(await getExpenses(inv.id));
      setLoading(false);
    })();
  }, [user]);

  const total = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);

  if (loading) return <div style={{ padding: 20 }}><Skeleton active /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title="Расходы" eyebrow="Инвестор" />
      <div className="page-scroll">
        {/* Total */}
        <GlassCard gold style={{ marginBottom: 16 }}>
          <div className="faint" style={{ fontSize: 11 }}>Итого расходов</div>
          <div className="num" style={{ fontSize: 30, fontWeight: 600, margin: '8px 0 4px', color: 'var(--bad)' }}>
            −{fmt(total)}
          </div>
          <div className="faint" style={{ fontSize: 11.5 }}>{expenses.length} позиций</div>
        </GlassCard>

        {!linked && (
          <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--txt-lo)', fontSize: 14 }}>
            Ваш аккаунт не привязан к инвестору
          </div>
        )}

        {linked && expenses.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--txt-lo)' }}>
            <Wallet size={36} strokeWidth={1} style={{ opacity: .4, marginBottom: 10 }} />
            <div>Расходов пока нет</div>
          </div>
        )}

        {expenses.map(e => (
          <GlassCard key={e.id} style={{ marginBottom: 10, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{e.title}</div>
                {e.note && <div className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>{e.note}</div>}
                <div className="faint" style={{ fontSize: 11, marginTop: 4 }}>
                  {e.date ? fmtDate(e.date) : '—'}
                </div>
              </div>
              <div className="num" style={{ fontSize: 16, color: 'var(--bad)', flexShrink: 0 }}>
                −{fmt(e.amount)}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
