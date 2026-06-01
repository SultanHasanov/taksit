import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { getOwnedApplications, getOwnedClients, byCreatedAtDesc } from '../../firebase/db';
import TopBar from '../../layout/TopBar';
import { GlassCard, StatCard, ClientRow, SectionHeader, MiniDot } from '../../components';
import { fmt, fmtShort } from '../../lib/format';

const STATUS_DOT = {
  ok: 'ok', warn: 'warn', orange: 'orange', bad: 'bad',
};

function getDueDot(app) {
  // simplified logic based on paidCount vs term
  const diff = (app.term ?? 6) - (app.paidCount ?? 0);
  if (diff <= 0) return 'bad';
  if (diff === 1) return 'warn';
  return 'ok';
}

export default function AdminDashboard() {
  const nav = useNavigate();
  const { ownerId } = useAuth();
  const [apps, setApps] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) return;
    (async () => {
      const [a, c] = await Promise.all([
        getOwnedApplications(ownerId),
        getOwnedClients(ownerId),
      ]);
      setApps([...a].sort(byCreatedAtDesc)); setClients(c);
      setLoading(false);
    })();
  }, [ownerId]);

  const active   = apps.filter(a => a.status === 'active');
  const drafts   = apps.filter(a => a.status === 'draft');
  const totalSum = active.reduce((s, a) => s + (a.amount ?? 0), 0);

  // merge clients with their latest app
  const clientsWithApp = clients.slice(0, 6).map(c => {
    const app = apps.find(a => a.clientId === c.id);
    return { ...c, app };
  });

  if (loading) return <div style={{ padding: 20 }}><Skeleton active /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <TopBar subtitle="Добрый день" />
      <div className="page-scroll">

        {/* Portfolio summary */}
        <GlassCard gold style={{ marginBottom: 16 }}>
          <div className="faint" style={{ fontSize: 11 }}>Портфель под управлением</div>
          <div className="num" style={{ fontSize: 34, fontWeight: 600, margin: '8px 0 4px' }}>
            {fmtShort(totalSum)}
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 11.5 }}>
            <span className="s-ok" style={{ fontWeight: 600 }}>▲ активно</span>
            <span className="faint">{active.length} активных договоров</span>
          </div>
        </GlassCard>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginBottom: 11 }}>
          <StatCard label="Активные займы" dot="ok" value={active.length}
            sub={fmtShort(totalSum) + ' в обороте'} />
          <StatCard label="Черновики" value={drafts.length} sub="ждут оформления" />
        </div>

        {/* Clients list */}
        <SectionHeader title="Клиенты" right={
          <span style={{ display:'flex', gap:11 }}>
            <span style={{ display:'flex', gap:5, alignItems:'center' }}><MiniDot type="ok" />В срок</span>
            <span style={{ display:'flex', gap:5, alignItems:'center' }}><MiniDot type="bad" />Просрочка</span>
          </span>
        } />

        {clientsWithApp.map(c => {
          const dot = c.app ? getDueDot(c.app) : 'ok';
          const labels = { ok: 'В срок', warn: 'Просрочка 4 дн', orange: 'Просрочка 17 дн', bad: 'Просрочка 30+ дн' };
          return (
            <ClientRow key={c.id} client={c}
              statusDot={dot} statusLabel={labels[dot] ?? 'В срок'}
              amount={c.app?.amount ?? 0}
              sub={c.app?.product ?? '—'}
              onClick={() => c.app && nav(`/admin/apps/${c.app.id}`)}
            />
          );
        })}
      </div>
    </div>
  );
}
