import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { getCollection, getDocument, byCreatedAtDesc, where } from '../../firebase/db';
import TopBar from '../../layout/TopBar';
import { GlassCard, StatCard, ProgressBar, SectionHeader } from '../../components';
import { fmt, fmtShort } from '../../lib/format';

export default function InvPortfolio() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [apps, setApps] = useState([]);
  const [clients, setClients] = useState([]);
  const [investorId, setInvestorId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Find investor record linked to this user
      const invs = await getCollection('investors', [where('uid', '==', user.uid)]);
      const inv = invs[0];
      if (!inv) { setLoading(false); return; }
      setInvestorId(inv.id);
      const [a, c] = await Promise.all([
        getCollection('applications', [where('investorId', '==', inv.id)]),
        getCollection('clients'),
      ]);
      setApps(a.sort(byCreatedAtDesc)); setClients(c);
      setLoading(false);
    })();
  }, [user]);

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));
  const active = apps.filter(a => a.status === 'active');
  const totalInvested = apps.reduce((s, a) => s + (a.amount ?? 0), 0);
  const totalReturns  = apps.reduce((s, a) => s + ((a.total ?? 0) - (a.amount ?? 0)), 0);
  // Already earned = sum of (profit share already paid out per app)
  const totalEarned = apps.reduce((s, a) => {
    const profit = (a.total ?? 0) - (a.amount ?? 0);
    const share  = a.term ? (a.paidCount ?? 0) / a.term : 0;
    return s + profit * share;
  }, 0);

  if (loading) return <div style={{ padding: 20 }}><Skeleton active /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <TopBar subtitle="Инвестор" />
      <div className="page-scroll">
        {/* Summary */}
        <GlassCard gold style={{ marginBottom: 12 }}>
          <div className="faint" style={{ fontSize: 11 }}>Портфель</div>
          <div className="num" style={{ fontSize: 32, fontWeight: 600, margin: '8px 0 10px' }}>
            {fmtShort(totalInvested)}
          </div>
          <div style={{ display: 'flex', gap: 18 }}>
            <div>
              <div className="faint" style={{ fontSize: 10.5 }}>Активных</div>
              <div className="num" style={{ fontSize: 14 }}>{active.length}</div>
            </div>
            <div>
              <div className="faint" style={{ fontSize: 10.5 }}>Ожид. прибыль</div>
              <div className="num" style={{ fontSize: 14, color: 'var(--gold-lite)' }}>+{fmtShort(totalReturns)}</div>
            </div>
          </div>
        </GlassCard>

        {/* Invested / Earned stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <StatCard label="Вложено" value={fmtShort(totalInvested)} />
          <GlassCard style={{ padding: '16px 16px 17px', display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ fontSize: 11, color: 'var(--txt-mid)', fontWeight: 500 }}>Заработано</div>
            <div className="num" style={{ fontSize: 25, fontWeight: 600, lineHeight: 1, color: 'var(--gold-lite)' }}>
              +{fmtShort(Math.round(totalEarned))}
            </div>
          </GlassCard>
        </div>

        <SectionHeader title="Активные вложения" right={`${active.length} сделок`} />

        {apps.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--txt-lo)', fontSize: 14 }}>
            {investorId ? 'Заявок пока нет' : 'Ваш аккаунт не привязан к инвестору'}
          </div>
        )}

        {apps.map(app => {
          const client = clientMap[app.clientId];
          const pct = app.term ? Math.round((app.paidCount ?? 0) / app.term * 100) : 0;
          const earned = ((app.total ?? 0) - (app.amount ?? 0)) * ((app.paidCount ?? 0) / (app.term ?? 1));
          return (
            <GlassCard key={app.id} style={{ marginBottom: 11, cursor: 'pointer', padding: '15px 16px' }}
              onClick={() => nav(`/inv/apps/${app.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 11 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {app.product}
                  </div>
                  <div className="faint" style={{ fontSize: 11, marginTop: 2 }}>{client?.name ?? '—'}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="num" style={{ fontSize: 13.5 }}>{fmt(app.amount)}</div>
                  <div className="num" style={{ fontSize: 11, color: 'var(--gold-lite)', marginTop: 2 }}>
                    +{fmt(Math.round(earned))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ProgressBar pct={pct} style={{ flex: 1 }} />
                <span className="faint num" style={{ fontSize: 10.5 }}>{pct}%</span>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
