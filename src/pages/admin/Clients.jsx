import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from 'antd';
import { Search } from 'lucide-react';
import { getCollection, orderBy } from '../../firebase/db';
import { PageHeader } from '../../layout/TopBar';
import { ClientRow, MiniDot } from '../../components';
import { fmt, computeOverdue } from '../../lib/format';

const FILTERS = [
  { key: 'all', label: 'Все' },
  { key: 'ok',  label: 'В срок', dot: 'ok' },
  { key: 'warn',   label: '1–7 дн', dot: 'warn' },
  { key: 'orange', label: '8–30 дн', dot: 'orange' },
  { key: 'bad',    label: '30+ дн', dot: 'bad' },
];

export default function AdminClients() {
  const nav = useNavigate();
  const [clients, setClients] = useState([]);
  const [apps, setApps] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      getCollection('clients', [orderBy('name')]),
      getCollection('applications', [orderBy('createdAt','desc')]),
    ]).then(([c, a]) => { setClients(c); setApps(a); });
  }, []);

  // Одна строка на клиента. Если заявок несколько — показываем плашку ×N.
  // Статус (точка просрочки) берём по самой «горящей» заявке, договор для
  // перехода — самый свежий (apps уже отсортированы createdAt desc).
  const merged = clients.map(c => {
    const cApps = apps.filter(a => a.clientId === c.id);
    const overdues = cApps.map(a => computeOverdue(a));
    const worst = overdues.reduce((acc, o) => (o.days > (acc?.days ?? -1) ? o : acc), null) ?? computeOverdue(null);
    return { ...c, apps: cApps, count: cApps.length, app: cApps[0] ?? null, overdue: worst };
  });

  const filtered = merged.filter(c => {
    const q = search.toLowerCase();
    const inProducts = c.apps.some(a => (a.product ?? '').toLowerCase().includes(q));
    if (q && !c.name.toLowerCase().includes(q) && !inProducts) return false;
    if (filter !== 'all' && c.overdue.dot !== filter) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title="Клиенты" eyebrow="Админ" />
      <div className="page-scroll">
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <Search size={18} strokeWidth={1.7} style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--txt-faint)', pointerEvents: 'none', zIndex: 1,
          }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени или товару"
            style={{
              width: '100%', background: '#0C1322', border: '1px solid var(--line)',
              borderRadius: 13, padding: '14px 15px 14px 42px', color: 'var(--txt-hi)',
              fontFamily: 'var(--body)', fontSize: 14.5, outline: 'none',
            }}
          />
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 2 }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 11, fontSize: 12,
                fontWeight: 600, cursor: 'pointer', border: '1px solid var(--line)',
                background: filter === f.key ? 'var(--gold)' : 'var(--glass)',
                color: filter === f.key ? 'var(--navy-950)' : 'var(--txt-mid)',
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
              {f.dot && <MiniDot type={f.dot} />}
              {f.label}{f.key === 'all' ? ` · ${filtered.length}` : ''}
            </button>
          ))}
        </div>

        {filtered.map(c => (
          <ClientRow key={c.id} client={c}
            count={c.count}
            statusDot={c.app ? c.overdue.dot : undefined}
            statusLabel={c.app ? c.overdue.label : undefined}
            amount={c.app?.amount ?? 0}
            sub={c.count > 1
              ? `${c.count} договора · ${c.app?.product ?? '—'}`
              : `${c.app?.product ?? '—'} · до ${c.app?.term ?? '—'} мес`}
            onClick={() => c.app && nav(`/admin/apps/${c.app.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
