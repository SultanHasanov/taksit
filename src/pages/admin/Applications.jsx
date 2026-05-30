import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { getCollection, orderBy } from '../../firebase/db';
import { PageHeader } from '../../layout/TopBar';
import { GlassCard, StatusPill } from '../../components';
import { fmt } from '../../lib/format';

const STATUS_FILTERS = ['Все', 'active', 'draft', 'closed'];
const STATUS_LABELS  = { active: 'Активно', draft: 'Черновик', closed: 'Закрыто' };

export default function AdminApplications() {
  const nav = useNavigate();
  const [apps, setApps] = useState([]);
  const [clients, setClients] = useState([]);
  const [filter, setFilter] = useState('Все');

  useEffect(() => {
    Promise.all([
      getCollection('applications', [orderBy('createdAt', 'desc')]),
      getCollection('clients'),
    ]).then(([a, c]) => { setApps(a); setClients(c); });
  }, []);

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));
  const counts = { active: 0, draft: 0, closed: 0 };
  apps.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });

  const filtered = filter === 'Все' ? apps : apps.filter(a => a.status === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title="Заявки" eyebrow="Админ"
        right={
          <button onClick={() => nav('/admin/new-application')}
            style={{ width:40,height:40,borderRadius:12,display:'grid',placeItems:'center',background:'var(--glass)',border:'1px solid var(--line)',color:'var(--txt-mid)',cursor:'pointer' }}>
            <Plus size={20} strokeWidth={2} />
          </button>
        }
      />
      <div className="page-scroll">
        {/* Count stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9, marginBottom: 18 }}>
          {[
            ['В работе', counts.active, 'var(--ok)'],
            ['Черновик', counts.draft, undefined],
            ['Закрыто',  counts.closed, 'var(--txt-lo)'],
          ].map(([l, v, c]) => (
            <GlassCard key={l} style={{ padding: '14px 12px', textAlign: 'center' }}>
              <div className="num" style={{ fontSize: 19, color: c }}>{v}</div>
              <div className="faint" style={{ fontSize: 10, marginTop: 4 }}>{l}</div>
            </GlassCard>
          ))}
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 2 }}>
          {STATUS_FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 11, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: '1px solid var(--line)',
                background: filter === f ? 'var(--gold)' : 'var(--glass)',
                color: filter === f ? 'var(--navy-950)' : 'var(--txt-mid)',
              }}>
              {f === 'Все' ? 'Все' : STATUS_LABELS[f]}
            </button>
          ))}
        </div>

        {filtered.map(app => {
          const client = clientMap[app.clientId];
          return (
            <GlassCard key={app.id} style={{ padding: '15px 16px', marginBottom: 11, cursor: 'pointer' }}
              onClick={() => nav(`/admin/apps/${app.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
                <span className="faint num" style={{ fontSize: 11 }}>Заявка #{app.id?.slice(-4)}</span>
                <StatusPill status={app.status} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {app.product}
                  </div>
                  <div className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>
                    {client?.name ?? '—'}
                  </div>
                </div>
                <div className="num" style={{ fontSize: 15, flexShrink: 0 }}>{fmt(app.amount)}</div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
